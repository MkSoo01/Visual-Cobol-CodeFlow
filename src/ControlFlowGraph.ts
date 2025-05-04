import { ControlFlowVisitor } from "./ControlFlowVisitor";
import { BailErrorStrategy, CharStreams, CommonTokenStream } from "antlr4ts";
import * as fs from "fs";
import { VisualCobolLexer } from "./generated/VisualCobolLexer";
import { VisualCobolParser } from "./generated/VisualCobolParser";

export enum NodeType {
  START = "start",
  END = "end",
  LOOP = "loop",
  NORMAL = "normal",
}

export interface Node {
  id: string;
  label: string;
  type: NodeType;
  startLineNumber: number;
  endLineNumber: number;
  callers: string[];
  callees: string[];
}

export interface DisplayNode {
  id: string;
  label: string;
  type: NodeType;
  startLineNumber: number;
  endLineNumber: number;
  prev: string[];
  next: string[];
  caller: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  isLoopBackEdge: boolean;
}

export class ControlFlowGraph {
  private rawNodes: Node[] = [];
  private displayNodes: DisplayNode[] = [];
  private edges: Edge[] = [];
  private dupCallerList: string[] = [];

  public getDisplayNodes(): DisplayNode[] {
    return [...this.displayNodes];
  }

  private addDisplayNode(displayNode: DisplayNode) {
    if (displayNode) {
      this.displayNodes.push(displayNode);
    }
  }

  public convertToDisplayNode(node: Node, caller: string): DisplayNode {
    const clonedNode = structuredClone(node);
    const displayNode: DisplayNode = {
      id: clonedNode.id,
      label: clonedNode.label,
      type: clonedNode.type,
      startLineNumber: clonedNode.startLineNumber,
      endLineNumber: clonedNode.endLineNumber,
      prev: [],
      next: [],
      caller: caller,
    };
    return displayNode;
  }

  public getRawNodes(): Node[] {
    return [...this.rawNodes];
  }

  public addRawNodes(nodes: Node[]) {
    if (nodes.length > 0) {
      this.rawNodes.push(...nodes);
    }
  }

  private removeRawNodes(nodesToRemove: Node[]) {
    if (nodesToRemove.length > 0) {
      this.rawNodes = this.rawNodes.filter((n) => !nodesToRemove.includes(n));

      nodesToRemove.forEach((n) => {
        const caller = this.getRawNodes().find((r) => r.callees.includes(n.id));
        if (caller) {
          caller.callees = caller.callees.filter((c) => c !== n.id);
        }
      });
    }
  }

  private removeDisplayNodeByIndex(nodeIndexToRemove: number) {
    if (nodeIndexToRemove !== -1) {
      this.displayNodes.splice(nodeIndexToRemove, 1);
    }
  }

  public getDupCallerList(): string[] {
    return [...this.dupCallerList];
  }

  public popDupCallerList() {
    if (this.dupCallerList.length > 0) {
      this.dupCallerList.pop();
    }
  }

  public insertDupCaller(dupCaller: string) {
    if (dupCaller) {
      this.dupCallerList.push(dupCaller);
    }
  }

  public formEdge(
    source: string,
    target: string,
    isLoopBackEdge: boolean
  ): Edge {
    return {
      id: source + "-" + target,
      source: source,
      target: target,
      isLoopBackEdge: isLoopBackEdge,
    };
  }

  public getEdges(): Edge[] {
    return [...this.edges];
  }

  public addEdge(edge: Edge) {
    if (edge) {
      const isValidSourceNode =
        this.displayNodes.find((n) => n.id === edge.source) !== undefined;
      const isValidTargetNode =
        this.displayNodes.find((n) => n.id === edge.target) !== undefined;
      if (isValidSourceNode && isValidTargetNode) {
        this.edges.push(edge);
      }
    }
  }

  private initGraph(fileContent: string) {
    // const fileContent = fs.readFileSync(filePath, "utf-8");
    // const fileContent = fs.readFileSync(
    //   "C:/Users/khims/source/repos/visual-cobol-codeflow/out/test/backtesting-summary.cbl",
    //   "utf-8"
    // );
    const inputStream = CharStreams.fromString(fileContent);
    const lexer = new VisualCobolLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new VisualCobolParser(tokenStream);
    //parser.errorHandler = new BailErrorStrategy();
    const tree = parser.startRule();

    const visitor = new ControlFlowVisitor();
    visitor.visit(tree);

    this.addRawNodes(visitor.getNodes());
    this.generateDisplayNodes();
    this.generateEdges();
  }

  public generateGraphInMarkdown(fileContent: string): string {
    this.initGraph(fileContent);
    return this.generateMermaidGraph(this.displayNodes, this.edges);
  }

  public generateGraphForCodeFlowDisplay(fileContent: string): string {
    this.initGraph(fileContent);
    return this.generateMermaidGraphForDisplay(this.displayNodes, this.edges);
  }

  private findCalleesOfRemovedNode(
    removedNode: Node,
    rawNodes: Node[]
  ): Node[] {
    const calleesOfRemovedNode: Node[] = [];
    if (removedNode.callees.length > 0) {
      removedNode.callees.forEach((callee) => {
        const calleeNode = rawNodes.find((n) => n.id === callee);
        if (calleeNode && calleeNode.callers.length === 1) {
          calleesOfRemovedNode.push(calleeNode);
          calleesOfRemovedNode.push(
            ...this.findCalleesOfRemovedNode(calleeNode, rawNodes)
          );
        }
      });
    }

    return calleesOfRemovedNode;
  }

  private hasNormalNodeAsDescendants(parent: Node, rawNodes: Node[]): boolean {
    const currentDescendants: string[] = parent.callees;
    let hasNormalNode = false;

    currentDescendants.forEach((descendant) => {
      if (hasNormalNode) {
        return;
      }

      const descendantNode = rawNodes.find((n) => n.id === descendant);
      if (descendantNode && descendantNode.type === NodeType.NORMAL) {
        hasNormalNode = true;
        return;
      }

      if (descendantNode && descendantNode.callees.length > 0) {
        hasNormalNode = this.hasNormalNodeAsDescendants(
          descendantNode,
          rawNodes
        );
      }
    });

    return hasNormalNode;
  }

  private processRawNodesForDisplay(rawNodes: Node[]): void {
    const removedNodes: Node[] = [];
    removedNodes.push(
      ...rawNodes.filter(
        (n) => n.type !== NodeType.START && n.callers.length === 0
      )
    );

    rawNodes
      .filter((n) => n.type === NodeType.LOOP)
      .forEach((n) => {
        if (
          n.callees.length === 0 ||
          !this.hasNormalNodeAsDescendants(n, rawNodes)
        ) {
          removedNodes.push(n);
        }
      });

    [...removedNodes].forEach((removedNode) => {
      removedNodes.push(
        ...this.findCalleesOfRemovedNode(removedNode, rawNodes)
      );
    });

    this.removeRawNodes(removedNodes);
  }

  private createDisplayNodesForCallees(
    callerNode: DisplayNode,
    callees: String[],
    callerNodeIsDup: boolean
  ): DisplayNode {
    let prevNode = callerNode;

    callees.forEach((callee) => {
      let rawCalleeNode = this.getRawNodes().find((node) => node.id === callee);
      if (rawCalleeNode) {
        const calleeNode = this.convertToDisplayNode(
          rawCalleeNode,
          callerNode.id
        );
        const hasMultipleCaller = rawCalleeNode.callers.length > 1;
        if (callerNodeIsDup || hasMultipleCaller) {
          calleeNode.id = this.createDupNodesId(calleeNode);
        }
        calleeNode.prev = [prevNode.id];
        prevNode.next = [calleeNode.id];
        this.addDisplayNode(calleeNode);

        const isCallingItself = calleeNode.prev[0].startsWith(
          rawCalleeNode.id + "_"
        );

        prevNode = calleeNode;
        if (rawCalleeNode.callees.length > 0 && !isCallingItself) {
          if (callerNodeIsDup || hasMultipleCaller) {
            const isInfiniteLoop = this.getDupCallerList().includes(
              calleeNode.id.split("_")[0]
            );

            if (!isInfiniteLoop) {
              // console.log("insertDupCaller: " + calleeNode.id.split("_")[0]);
              this.insertDupCaller(calleeNode.id.split("_")[0]);
              prevNode = this.createDisplayNodesForCallees(
                calleeNode,
                [...rawCalleeNode.callees],
                true
              );

              // console.log("popDupCaller: " + calleeNode.id.split("_")[0]);
              this.popDupCallerList();
            }
          } else {
            prevNode = this.createDisplayNodesForCallees(
              calleeNode,
              [...rawCalleeNode.callees],
              false
            );
          }
        }
      } else {
        throw new Error(`Callee ${callee} not found`);
      }
    });

    return prevNode;
  }

  private createDupNodesId(currentNode: DisplayNode): string {
    const dupNodeId =
      currentNode.id +
      "_" +
      (
        this.getDisplayNodes().filter((node) =>
          node.id.startsWith(currentNode.id + "_")
        ).length + 1
      ).toString();

    return dupNodeId;
  }

  private getRawId(nodeId: string): string {
    if (this.checkIsDup(nodeId)) {
      return nodeId.split("_")[0];
    }

    return nodeId;
  }

  private checkIsDup(nodeId: string): boolean {
    return nodeId.split("_").length > 1;
  }

  public generateDisplayNodes() {
    this.processRawNodesForDisplay(this.getRawNodes());
    const startNode = this.getRawNodes()[0];
    if (!startNode) {
      throw new Error("Missing start node");
    }

    const startNodeForDisplay = this.convertToDisplayNode(startNode, "");
    this.addDisplayNode(startNodeForDisplay);
    if (startNode.callees.length > 0) {
      this.createDisplayNodesForCallees(
        startNodeForDisplay,
        [...startNode.callees],
        false
      );
    }
  }

  private findLastCalleeNodeIdForLoop(loopNode: string): string {
    let currentEndLoopNode = loopNode;

    let lastCallee: string = "";
    while (!lastCallee) {
      const calleeList = this.getDisplayNodes().filter(
        (n) => n.caller === currentEndLoopNode
      );

      if (calleeList.length > 0) {
        currentEndLoopNode = calleeList[calleeList.length - 1].id;
      } else {
        lastCallee = currentEndLoopNode;
      }
    }

    return lastCallee;
  }

  public generateEdges() {
    let loopExitMap: Map<string, string> = new Map<string, string>();

    this.getDisplayNodes()
      .filter((n) => n.type === NodeType.LOOP)
      .forEach((n) => {
        let lastLoopNodeCallee = this.findLastCalleeNodeIdForLoop(n.id);

        loopExitMap.set(lastLoopNodeCallee, n.id);
      });

    this.getDisplayNodes().forEach((n) => {
      if (loopExitMap.has(n.id)) {
        this.addEdge(this.formEdge(n.id, loopExitMap.get(n.id)!, true));
        loopExitMap.delete(n.id);
      }

      if (n.next.length > 0) {
        n.next.forEach((c) => {
          this.addEdge(this.formEdge(n.id, c, false));
        });
      }
    });
  }

  public generateMermaidGraph(nodes: DisplayNode[], edges: Edge[]): string {
    const nodeMap = new Map(
      nodes.map((n) => {
        // let caller = "";
        // if (n.type !== NodeType.START) {
        //   let callerNode = this.getDisplayNodes().find(
        //     (r) => r.id === n.caller
        //   );
        //   while (callerNode?.type === NodeType.LOOP) {
        //     callerNode = this.getDisplayNodes().find(
        //       (r) => r.id === callerNode?.caller
        //     );
        //   }
        //   caller = "[" + callerNode?.label.trim() + "] <br> ";
        // }

        return [n.id, n.label + " (" + n.startLineNumber + ")"];
      })
    );
    const lines = ["```mermaid", "graph TD"];
    for (const edge of edges) {
      const sourceLabel = nodeMap.get(edge.source) ?? edge.source;
      const targetLabel = nodeMap.get(edge.target) ?? edge.target;
      lines.push(
        `\t${edge.source}["${sourceLabel}"] --> ${edge.target}["${targetLabel}"]`
      );
    }
    lines.push("```");
    return lines.join("\n");
  }

  public generateMermaidGraphForDisplay(
    nodes: DisplayNode[],
    edges: Edge[]
  ): string {
    const clickActionLines: string[] = [];
    const nodeMap = new Map(
      nodes.map((n) => {
        clickActionLines.push(
          `\t\tclick ${n.id} call focusOn(${n.startLineNumber})`
        );
        return [n.id, n.label + " (" + n.startLineNumber + ")"];
      })
    );

    const lines = ["\n\tgraph TD"];
    for (const edge of edges) {
      const sourceLabel = nodeMap.get(edge.source) ?? edge.source;
      const targetLabel = nodeMap.get(edge.target) ?? edge.target;
      lines.push(
        `\t\t${edge.source}["${sourceLabel}"] --> ${edge.target}["${targetLabel}"]`
      );
    }
    lines.push(...clickActionLines);
    return lines.join("\n");
  }
}
