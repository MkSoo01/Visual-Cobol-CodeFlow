/*
 * Copyright (c) 2025, MkSoo01
 * All rights reserved.
 * Licensed under the BSD-3-Clause license. See LICENSE file in the project root for license information.
 */
import { ControlFlowVisitor } from "./ControlFlowVisitor";
import { BailErrorStrategy, CharStreams, CommonTokenStream } from "antlr4ts";
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
  invocationMap?: Map<string, number>;
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

  public setRawNodes(nodes: Node[]) {
    if (nodes.length > 0) {
      this.rawNodes = nodes;
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

  private resetDisplayNodes() {
    this.displayNodes = [];
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

  public resetEdges() {
    this.edges = [];
  }

  public initGraph(fileContent: string) {
    const inputStream = CharStreams.fromString(fileContent);
    const lexer = new VisualCobolLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new VisualCobolParser(tokenStream);
    parser.errorHandler = new BailErrorStrategy();
    const tree = parser.startRule();

    const visitor = new ControlFlowVisitor();
    visitor.visit(tree);

    this.setRawNodes(visitor.getNodes());
    this.resetDisplayNodes();
    this.resetEdges();

    this.generateDisplayNodes();
    this.generateEdges();
  }

  public getMermaidGraphInMarkdown(): string {
    return this.generateMermaidGraphForMarkdown(
      this.getDisplayNodes(),
      this.getEdges()
    );
  }

  public getMermaidGraphForCodeFlowDisplay(): string[] {
    return this.generateMermaidGraphForView(
      this.getDisplayNodes(),
      this.getEdges()
    );
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

  private generateMermaidGraphContent(
    nodes: DisplayNode[],
    edges: Edge[],
    displayLineNumber: boolean
  ): string[] {
    const content = [];
    const nodeMap = new Map(
      nodes.map((n) => {
        let lineNumberLabel = "";
        if (displayLineNumber) {
          lineNumberLabel = " (" + n.startLineNumber + ")";
        }

        let label = n.label;
        const labelLengthLimit = 75;
        const ellipsis = "...";
        if (label.length > labelLengthLimit + ellipsis.length) {
          label = label.substring(0, labelLengthLimit) + "...";
        }

        return [n.id, label + lineNumberLabel];
      })
    );

    for (const edge of edges) {
      const sourceLabel = nodeMap.get(edge.source) ?? edge.source;
      const targetLabel = nodeMap.get(edge.target) ?? edge.target;
      content.push(
        `\t${edge.source}["${sourceLabel}"] --> ${edge.target}["${targetLabel}"]`
      );
    }

    return content;
  }

  public generateMermaidGraphForMarkdown(
    nodes: DisplayNode[],
    edges: Edge[]
  ): string {
    const mermaidGraph = ["```mermaid", "graph TD"];
    const mermaidGraphContent = this.generateMermaidGraphContent(
      nodes,
      edges,
      true
    );
    mermaidGraph.push(...mermaidGraphContent);
    mermaidGraph.push("```");
    return mermaidGraph.join("\n");
  }

  public generateMermaidGraphForView(
    nodes: DisplayNode[],
    edges: Edge[]
  ): string[] {
    const clickActionLines: string[] = [];
    const nodeMap = new Map(
      nodes.map((n) => {
        clickActionLines.push(
          `\t\tclick ${n.id} call focusOn(${n.startLineNumber})`
        );
        return [n.id, n.label];
      })
    );

    const mermaidGraphForView = ["\n\tgraph TD"];
    const mermaidGraphContent = this.generateMermaidGraphContent(
      nodes,
      edges,
      false
    );
    mermaidGraphForView.push(...mermaidGraphContent);
    mermaidGraphForView.push(...clickActionLines);
    return mermaidGraphForView;
  }
}
