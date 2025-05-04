import * as vscode from "vscode";
import * as path from "path";
import { ControlFlowGraph } from "./ControlFlowGraph";

function getWebviewHtml(
  mermaidGraph: string,
  themeKind: vscode.ColorThemeKind
): string {
  let theme = "default";
  let bodyStyle = "";

  if (themeKind === vscode.ColorThemeKind.Dark) {
    theme = "dark";
    bodyStyle = "background-color: #121212;\n\t\tcolor: white;";
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test</title>
        <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    </head>
    <body style="
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            ${bodyStyle}">
        <pre class="mermaid">
          ${mermaidGraph}
        </pre>

        <script>
            const vscode = acquireVsCodeApi();

            mermaid.initialize({ 
              startOnLoad: true,
              tooltip: false,
              flowchart: { useMaxWidth: true, htmlLabels: false, curve: "basis" },
              securityLevel: "loose",
              theme: "${theme}"
            });

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

export function activate(context: vscode.ExtensionContext) {
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
        const document = editor.document;
        const content = document.getText();
        const cfg = new ControlFlowGraph();
        const newFileContent = cfg.generateGraphInMarkdown(content);

        const writeData = new TextEncoder().encode(newFileContent);
        const newFilePath = path.join(
          workspaceFolder,
          path.basename(document.fileName, path.extname(document.fileName)) +
            "_mermaidGraph.md"
        );
        const fileUri = vscode.Uri.file(newFilePath);
        await vscode.workspace.fs.writeFile(fileUri, writeData);

        const newDocument = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(newDocument);
      } catch (error) {
        vscode.window.showErrorMessage("Failed to create file: " + error);
      }
    },
    {
      scope: "editorContext",
    }
  );

  context.subscriptions.push(disposable);

  const disposable2 = vscode.commands.registerCommand(
    "visual-cobol-codeflow.generateGraphForCodeFlowDisplay",
    async () => {
      let editor = vscode.window.visibleTextEditors.find((editor) => {
        return editor.document.uri.path.endsWith(".cbl");
      });

      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }

      try {
        const document = editor.document;
        const documentUri = document.uri;
        const content = document.getText();
        const cfg = new ControlFlowGraph();
        const mermaidGraph = cfg.generateGraphForCodeFlowDisplay(content);
        const htmlContent = getWebviewHtml(
          mermaidGraph,
          vscode.window.activeColorTheme.kind
        );

        const panel = vscode.window.createWebviewPanel(
          "Visual COBOL Code-Flow",
          path.basename(document.fileName),
          vscode.ViewColumn.Two,
          {
            enableScripts: true,
            retainContextWhenHidden: false,
          }
        );
        panel.webview.html = htmlContent;

        panel.webview.onDidReceiveMessage(
          async (message) => {
            if (message.command === "focusOn") {
              const doc = await vscode.workspace.openTextDocument(documentUri);
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
      } catch (error) {
        vscode.window.showErrorMessage("Failed to create file: " + error);
      }
    }
  );

  context.subscriptions.push(disposable2);
}

// This method is called when your extension is deactivated
export function deactivate() {}
