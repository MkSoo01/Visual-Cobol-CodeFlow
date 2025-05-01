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
  x?: number;
  y?: number;
  flow: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  isPolyline: boolean;
  flow: string;
  isAngled?: boolean;
  isLoop?: boolean;
  points?: number[];
}

export interface Route {
  id: string;
  nodes: string[];
}

export class ControlFlowGraph {
  private rawNodes: Node[] = [];
  private displayNodes: Node[] = [];
  private edges: Edge[] = [];
  private routes: Route[] = [];
  private dupCallerList: string[] = [];

  public getDisplayNodes(): Node[] {
    return [...this.displayNodes];
  }

  private addDisplayNode(node: Node) {
    if (node) {
      this.displayNodes.push(node);
    }
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

  public formEdge(source: string, target: string, isPolyline: boolean): Edge {
    return {
      id: source + "-" + target,
      source: source,
      target: target,
      isPolyline: isPolyline,
      flow: "f1",
    };
  }

  public getEdges(): Edge[] {
    return [...this.edges];
  }

  private getRoute(): Route {
    if (this.routes.length === 0) {
      const route: Route = {
        id: "route1",
        nodes: [],
      };
      this.routes.push(route);
    }

    return this.routes[this.routes.length - 1];
  }

  public addEdge(edge: Edge) {
    if (edge) {
      const isValidSourceNode =
        this.displayNodes.find((n) => n.id === edge.source) !== undefined;
      const isValidTargetNode =
        this.displayNodes.find((n) => n.id === edge.target) !== undefined;
      if (isValidSourceNode && isValidTargetNode) {
        this.edges.push(edge);
        this.getRoute().nodes.push(edge.id);
      }
    }
  }

  public generateGraph(fileContent: string): string {
    //const fileContent = fs.readFileSync(filePath, "utf-8");
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
    return "";
    this.generateEdges();
    return this.generateMermaidGraph(this.displayNodes, this.edges);
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
    callerNode: Node,
    callees: String[],
    callerNodeIsDup: boolean
  ): Node {
    callees.forEach((callee) => {
      let calleeNode = this.getRawNodes().find((node) => node.id === callee);
      if (calleeNode) {
        calleeNode = structuredClone(calleeNode);
        const hasMultipleCaller = calleeNode.callers.length > 1;
        if (callerNodeIsDup || hasMultipleCaller) {
          calleeNode.id = this.createDupNodesId(calleeNode);
        }
        calleeNode.callers = [callerNode.id];
        callerNode.callees = [calleeNode.id];
        this.addDisplayNode(calleeNode);

        const isCallingItself = calleeNode.callers[0].startsWith(
          calleeNode.id.split("_")[0] + "_"
        );
        if (calleeNode.callees.length > 0 && !isCallingItself) {
          if (callerNodeIsDup || hasMultipleCaller) {
            const isInfiniteLoop = this.getDupCallerList().includes(
              calleeNode.id.split("_")[0]
            );

            if (!isInfiniteLoop) {
              // console.log("insertDupCaller: " + calleeNode.id.split("_")[0]);
              this.insertDupCaller(calleeNode.id.split("_")[0]);
              callerNode = this.createDisplayNodesForCallees(
                calleeNode,
                [...calleeNode.callees],
                true
              );

              // console.log("popDupCaller: " + calleeNode.id.split("_")[0]);
              this.popDupCallerList();
            }
          } else {
            callerNode = this.createDisplayNodesForCallees(
              calleeNode,
              [...calleeNode.callees],
              false
            );
          }
        } else {
          callerNode = calleeNode;
        }
      } else {
        throw new Error(`Callee ${callee} not found`);
      }
    });

    return callerNode;
  }

  private createDupNodesId(currentNode: Node): string {
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

  private getDupIdBasedOnCaller(nodeId: string, callerId: string): string {
    if (this.checkIsDup(callerId)) {
      const dupIndex = callerId.split("_")[1];
      return nodeId + "_" + dupIndex;
    }

    const rawNode = this.getRawNodes().find((n) => n.id === nodeId);
    if (rawNode && rawNode.callers.length > 1) {
      const dupIndex = rawNode.callers.indexOf(callerId) + 1;
      return nodeId + "_" + dupIndex;
    }

    return "";
  }

  public generateDisplayNodes() {
    this.processRawNodesForDisplay(this.getRawNodes());
    const startNode = this.getRawNodes()[0];
    const startNodeForDisplay = structuredClone(startNode);
    this.displayNodes.push(startNodeForDisplay);
    this.createDisplayNodesForCallees(
      startNodeForDisplay,
      [...startNodeForDisplay.callees],
      false
    );
  }

  public generateEdges() {
    let latestLoopNodeId: string[] = [];
    let lastLoopNodeCallee: string[] = [];

    this.getDisplayNodes().forEach((n) => {
      if (n.id === lastLoopNodeCallee[lastLoopNodeCallee.length - 1]) {
        this.addEdge(this.formEdge(n.id, latestLoopNodeId.pop()!, true));
        lastLoopNodeCallee.pop();
      }

      if (n.callees.length > 0) {
        n.callees.forEach((c) => {
          this.addEdge(this.formEdge(n.id, c, false));
        });

        if (n.type === NodeType.LOOP) {
          latestLoopNodeId.push(n.id);
          const loopNodeCallees = this.getRawNodes().find(
            (r) => r.id === this.getRawId(n.id)
          )!.callees;

          let lastLoopNodeCalleeTmp =
            loopNodeCallees[loopNodeCallees.length - 1];
          if (
            this.getDisplayNodes().find(
              (d) => d.id === lastLoopNodeCalleeTmp
            ) === undefined
          ) {
            lastLoopNodeCalleeTmp = this.getDupIdBasedOnCaller(
              lastLoopNodeCalleeTmp,
              n.id
            );
          }

          lastLoopNodeCallee.push(lastLoopNodeCalleeTmp);
        }
      }
    });
  }

  public generateMermaidGraph(nodes: Node[], edges: Edge[]): string {
    const nodeMap = new Map(
      nodes.map((n) => [n.id, n.label + " (" + n.startLineNumber + ")"])
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
}
