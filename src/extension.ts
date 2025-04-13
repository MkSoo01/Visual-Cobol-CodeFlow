// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import { ControlFlowGraph } from "./ControlFlowGraph";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "visual-cobol-codeflow" is now active!'
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable2 = vscode.commands.registerCommand(
    "visual-cobol-codeflow.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage(
        "Hello World from Visual COBOL CodeFlow!"
      );
    }
  );

  context.subscriptions.push(disposable2);
  const disposable = vscode.commands.registerCommand(
    "visual-cobol-codeflow.generateGraph",
    async () => {
      // Your logic here
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

      const newFilePath = path.join(workspaceFolder, "mermaidGraph.md");

      const fileUri = vscode.Uri.file(newFilePath);

      try {
        const document = editor.document;
        const content = document.getText();
        const cfg = new ControlFlowGraph();
        const newFileContent = cfg.generateGraph(content);
        console.log(newFileContent);

        const writeData = new TextEncoder().encode(newFileContent);
        await vscode.workspace.fs.writeFile(fileUri, writeData);

        const newDocument = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(newDocument);

        vscode.window.showInformationMessage(
          `Created new file: ${newFilePath}`
        );
      } catch (error) {
        vscode.window.showErrorMessage("Failed to create file: " + error);
      }
    },
    {
      scope: "editorContext",
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
