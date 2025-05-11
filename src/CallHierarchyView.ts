import * as vscode from "vscode";
import { ControlFlowGraph, Node, NodeType } from "./ControlFlowGraph";
import { CfgData, initCfg } from "./extension";

export class CallHierarchyView {
  constructor(context: vscode.ExtensionContext, cfgMap: Map<string, CfgData>) {
    const provider = new CallProvider(new ControlFlowGraph());

    const view = vscode.window.createTreeView("callHierarchyView", {
      treeDataProvider: provider,
    });

    context.subscriptions.push(view);

    const showCallHierarchyCommand = vscode.commands.registerCommand(
      "visual-cobol-codeflow.openCallHierarchy",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage("No active editor found.");
          return;
        }

        try {
          const cfg = await initCfg(editor, cfgMap);
          provider.setCfg(cfg);
          const line = editor.selection.active.line;
          if (line) {
            provider.refresh(editor.document.uri.fsPath, line);
          }
        } catch (error) {
          vscode.window.showErrorMessage("Error: " + error);
        }
      }
    );

    context.subscriptions.push(showCallHierarchyCommand);

    const showTreeItemCommand = vscode.commands.registerCommand(
      "visual-cobol-codeflow.showCallHierarchyTreeItem",
      async (lineNumberToHightlight: number, fileToOpen: string) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage("No active editor found.");
          return;
        }

        try {
          const doc = await vscode.workspace.openTextDocument(fileToOpen);
          const editor = await vscode.window.showTextDocument(doc, {
            preserveFocus: false,
            viewColumn: vscode.ViewColumn.One,
          });
          await vscode.window.showTextDocument(editor.document, {
            preserveFocus: false,
          });

          const line = editor.document.lineAt(lineNumberToHightlight - 1);
          const range = line.range;

          editor.selection = new vscode.Selection(range.start, range.end);
          editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        } catch (error) {
          vscode.window.showErrorMessage("Error: " + error);
        }
      }
    );

    context.subscriptions.push(showTreeItemCommand);
  }
}

export class CallProvider implements vscode.TreeDataProvider<Item> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    Item | undefined | null | void
  > = new vscode.EventEmitter<Item | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Item | undefined | null | void> =
    this._onDidChangeTreeData.event;
  private currentLineNumber: number = 0;
  private currentFile = "";

  constructor(private cfg: ControlFlowGraph) {
    this.cfg = cfg;
  }

  setCfg(cfg: ControlFlowGraph) {
    this.cfg = cfg;
  }

  refresh(file: string, currentLineNumber: number) {
    this.currentFile = file;
    this.currentLineNumber = currentLineNumber;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Item): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Item): Thenable<Item[]> {
    if (this.cfg.getDisplayNodes().length === 0) {
      return Promise.resolve([]);
    }

    if (element) {
      return Promise.resolve(this.findChildren(element.nodeId));
    } else {
      if (this.currentLineNumber === 0) {
        return Promise.resolve([]);
      } else {
        const lineNo = this.currentLineNumber + 1;
        const currentItem = this.getCurrentItem(lineNo);
        if (currentItem) {
          return Promise.resolve([currentItem]);
        }
        return Promise.resolve([]);
      }
    }
  }

  private findChildren(id: string): Item[] {
    const parent = this.cfg.getRawNodes().find((n) => n.id === id);
    if (!parent || parent?.type === NodeType.LOOP) {
      return [];
    }

    let node = parent;
    let children: Item[] = [];

    if (node.callers.length > 0) {
      node.callers.forEach((n) => {
        let caller = this.cfg.getRawNodes().find((r) => r.id === n);
        while (caller && caller.type === NodeType.LOOP) {
          caller = this.cfg
            .getRawNodes()
            .find((r) => r.id === caller?.callers[0]);
        }

        if (!caller) {
          return;
        }

        const isNewChild = !children.find((c) => c.label === caller.label);
        if (isNewChild) {
          const invocationLineNumber = parent.invocationMap?.get(caller!.id);
          const collapsibleState =
            caller.callers.length > 0
              ? vscode.TreeItemCollapsibleState.Collapsed
              : vscode.TreeItemCollapsibleState.None;

          children.push(
            new Item(
              caller.id,
              caller.label,
              invocationLineNumber
                ? invocationLineNumber
                : caller.startLineNumber,
              collapsibleState,
              this.currentFile
            )
          );
        }
      });
    }

    return children;
  }

  private getCurrentItem(lineNumber: number): Item | null {
    let node = this.cfg
      .getRawNodes()
      .find((n) => n.startLineNumber === lineNumber);
    if (!node || node?.type === NodeType.LOOP) {
      return null;
    }

    return new Item(
      node.id,
      node.label,
      node.startLineNumber,
      node.callers.length > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None,
      this.currentFile
    );
  }
}

class Item extends vscode.TreeItem {
  constructor(
    public readonly nodeId: string,
    public readonly label: string,
    public readonly lineNumberToHighlight: number,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly fileToView: string
  ) {
    super(label, collapsibleState);
    this.nodeId = nodeId;
    this.lineNumberToHighlight = lineNumberToHighlight;
    this.command = {
      command: "visual-cobol-codeflow.showCallHierarchyTreeItem",
      title: "Open Item",
      arguments: [lineNumberToHighlight, fileToView],
    };
  }
}
