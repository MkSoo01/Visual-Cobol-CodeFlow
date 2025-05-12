import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { ControlFlowGraph } from "./ControlFlowGraph";
import { CallHierarchyView } from "./CallHierarchyView";

function getWebviewHtml(
  mermaidGraph: string[],
  mermaidJsUri: vscode.Uri
): string {
  const mermaidGraphText = mermaidGraph.join("\n");
  const textSize: number = mermaidGraphText.length;
  const maxEdges: number = mermaidGraph.length;
  console.log("textSize" + textSize);
  let theme = "default";

  if (vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark) {
    theme = "dark";
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            margin: 0;
            padding: 0;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            font-family: var(--vscode-font-family);
            display: flex;
            justify-content: center;
            align-items: center;
          }

          #loading-container {
            display: flex;
            justify-content: center;
            padding-top: 1.5rem;
          }

          .spinner {
            width: 32px;
            height: 32px;
            border: 4px solid var(--vscode-editorWidget-background);
            border-top: 4px solid var(--vscode-progressBar-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          #mermaidGraph {
            display: none;
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            justify-content: center;
            align-items: center;
          }
        </style>
        <script src="${mermaidJsUri}"></script>
    </head>
    <body>
        <div id="loading-container">
          <div id="loading" class="spinner"></div>
        </div>
        <div id="mermaidGraph"></div>

        <script type="module">
          mermaid.initialize({ 
              startOnLoad: false,
              tooltip: false,
              flowchart: { useMaxWidth: true, htmlLabels: false, curve: "basis" },
              securityLevel: "loose",
              theme: "${theme}",
              maxTextSize: ${textSize},
              maxEdges: ${maxEdges}
            });

          const graphDiv = document.getElementById("mermaidGraph");
          const drawDiagram = async (callback) => {
            const graphDefinition = \`${mermaidGraphText}\`;
            if (graphDefinition && graphDefinition.length > 0) {
              const { svg, bindFunctions } = await mermaid.render(
                "graph",
                graphDefinition
              );
              graphDiv.innerHTML = svg;
              bindFunctions?.(graphDiv);
              setTimeout(callback, 3000);
            }
          };

          drawDiagram(() => {
            graphDiv.style.display = "flex";
            document.getElementById("loading-container").style.display = "none";
          });
        </script>
        <script>
            const vscode = acquireVsCodeApi();

            window.focusOn = function(startLineNumber) {
              vscode.postMessage({
                        command: 'focusOn',
                        lineNo: startLineNumber
              });
            }
        </script>
    </body>
    </html>
`;
}

export interface CfgData {
  fileCheksum: string;
  cfg: ControlFlowGraph;
  webviewPanel?: vscode.WebviewPanel;
}

export async function initCfg(
  editor: vscode.TextEditor,
  cfgMap: Map<string, CfgData>
): Promise<ControlFlowGraph> {
  const filePath = editor.document.uri.fsPath;
  const ext = path.extname(filePath);

  if (ext === ".cbl") {
    const fileChecksum = await getFileChecksum(filePath);

    let currentCfgData = cfgMap.get(editor.document.fileName);
    if (!currentCfgData) {
      const newCfg = new ControlFlowGraph();
      newCfg.initGraph(editor.document.getText());

      const newCfgData: CfgData = {
        fileCheksum: fileChecksum,
        cfg: newCfg,
      };
      cfgMap.set(editor.document.fileName, newCfgData);
      currentCfgData = newCfgData;
    } else if (currentCfgData.fileCheksum !== fileChecksum) {
      currentCfgData.fileCheksum = fileChecksum;
      currentCfgData.cfg.initGraph(editor.document.getText());
    }

    return Promise.resolve(currentCfgData.cfg);
  }

  return Promise.resolve(new ControlFlowGraph());
}

export async function activate(context: vscode.ExtensionContext) {
  const cfgMap = new Map<string, CfgData>();
  const editor = vscode.window.activeTextEditor;

  if (editor) {
    initCfg(editor, cfgMap);
  }

  new CallHierarchyView(context, cfgMap);

  const disposable = vscode.commands.registerCommand(
    "visual-cobol-codeflow.generateGraphInMarkdown",
    async () => {
      vscode.window.showInformationMessage("Generating graph...");

      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }

      const workspaceFolder = path.dirname(editor.document.uri.fsPath);
      if (!workspaceFolder) {
        vscode.window.showErrorMessage("No workspace folder found.");
        return;
      }

      try {
        const cfg = await initCfg(editor, cfgMap);
        const newFileContent = cfg.getMermaidGraphInMarkdown();

        const writeData = new TextEncoder().encode(newFileContent);
        const newFilePath = path.join(
          workspaceFolder,
          path.basename(
            editor.document.fileName,
            path.extname(editor.document.fileName)
          ) + "_mermaidGraph.md"
        );
        const fileUri = vscode.Uri.file(newFilePath);
        await vscode.workspace.fs.writeFile(fileUri, writeData);

        const newDocument = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(newDocument);
      } catch (error) {
        vscode.window.showErrorMessage("Failed to create file: " + error);
      }
    }
  );

  context.subscriptions.push(disposable);

  const disposable2 = vscode.commands.registerCommand(
    "visual-cobol-codeflow.generateGraphForCodeFlowDisplay",
    async () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }

      try {
        let cfgData = cfgMap.get(editor.document.fileName);
        let panel;

        if (!cfgData || !cfgData.webviewPanel) {
          panel = vscode.window.createWebviewPanel(
            "Visual COBOL Code-Flow",
            path.basename(editor.document.fileName),
            vscode.ViewColumn.Two,
            {
              enableFindWidget: true,
              enableScripts: true,
              retainContextWhenHidden: false,
            }
          );

          const documentUri = editor.document.uri;
          panel.webview.onDidReceiveMessage(
            async (message) => {
              if (message.command === "focusOn") {
                const doc = await vscode.workspace.openTextDocument(
                  documentUri
                );
                const editor = await vscode.window.showTextDocument(doc, {
                  preserveFocus: false,
                  viewColumn: vscode.ViewColumn.One,
                });

                const highlightedLineNumber = message.lineNo;
                const line = editor.document.lineAt(highlightedLineNumber - 1);
                const range = line.range;

                editor.selection = new vscode.Selection(range.start, range.end);
                editor.revealRange(range, vscode.TextEditorRevealType.AtTop);
              }
            },
            null,
            context.subscriptions
          );

          panel.webview.html = getWebviewHtml([""], documentUri);
        } else {
          panel = cfgData.webviewPanel;
        }

        await initCfg(editor, cfgMap);
        cfgData = cfgMap.get(editor.document.fileName);
        if (cfgData) {
          cfgData.webviewPanel = panel;
          panel.onDidDispose(
            () => {
              cfgData.webviewPanel = undefined;
            },
            null,
            context.subscriptions
          );

          const mermaidGraph = cfgData.cfg.getMermaidGraphForCodeFlowDisplay();
          const mermaidJsUri = panel.webview.asWebviewUri(
            vscode.Uri.joinPath(context.extensionUri, "media", "mermaid.min.js")
          );

          const htmlContent = getWebviewHtml(mermaidGraph, mermaidJsUri);
          panel.webview.html = htmlContent;
        }
      } catch (error) {
        vscode.window.showErrorMessage("Error: " + error);
      }
    }
  );

  context.subscriptions.push(disposable2);
}

// This method is called when your extension is deactivated
export function deactivate() {}

function getFileChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}
