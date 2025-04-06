import { ControlFlowVisitor } from "./ControlFlowVisitor";
import { CharStreams, CommonTokenStream } from "antlr4ts";
import * as fs from "fs";
import { VisualCobolLexer } from "./generated/VisualCobolLexer";
import { VisualCobolParser } from "./generated/VisualCobolParser";

export enum NodeType {
  START = "start",
  END = "end",
  CONDITION = "condition",
  CONDITION_ELSE = "conditionELSE",
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

export interface Edge {
  id: string;
  source: string;
  target: string;
  isPolyline: boolean;
}

export class ControlFlowGraph {
  private rawNodes: Node[] = [];
  private displayNodes: Node[] = [];
  private edges: Edge[] = [];

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

  public formEdge(source: string, target: string, isPolyline: boolean): Edge {
    return {
      id: source + "-" + target,
      source: source,
      target: target,
      isPolyline: isPolyline,
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

  public generateGraph(filePath: string) {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    // const fileContent = fs.readFileSync(
    //   "C:/Users/khims/source/repos/visual-cobol-codeflow/out/test/backtesting-summary.cbl",
    //   "utf-8"
    // );
    const inputStream = CharStreams.fromString(fileContent);
    const lexer = new VisualCobolLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new VisualCobolParser(tokenStream);
    const tree = parser.startRule();

    const visitor = new ControlFlowVisitor();
    visitor.visit(tree);

    this.addRawNodes(visitor.getNodes());
    this.generateDisplayNodes();
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
      .filter((n) => n.type === NodeType.CONDITION || n.type === NodeType.LOOP)
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

    const conditionNodesForDisplay = this.getDisplayNodes().filter(
      (n) => n.type === NodeType.CONDITION
    );

    if (conditionNodesForDisplay.length > 0) {
      conditionNodesForDisplay.forEach((condNode) => {
        // search for diverging Node
        const elseNode = this.getRawNodes().find(
          (n) =>
            n.callers.includes(this.getRawId(condNode.id)) &&
            n.type === NodeType.CONDITION_ELSE
        );
        const elseNodeIdx = this.getDisplayNodes().findIndex(
          (n) =>
            n.id === elseNode?.id ||
            n.id === this.getDupIdBasedOnCaller("" + elseNode?.id, condNode.id)
        );

        let newCallerForConvergingNode: Node = condNode;
        let noNodeBetweenIfAndElse = false;
        let hasNodeBetweenElseAndEndIf = false;
        const rawCondNodeCallees: string[] = [];
        rawCondNodeCallees.push(
          ...(this.getRawNodes().find(
            (n) => n.id === this.getRawId(condNode.id)
          )?.callees ?? [])
        );
        const hasElseNode = elseNodeIdx !== -1;
        if (hasElseNode) {
          const nodeBeforeElse = this.getDisplayNodes()[elseNodeIdx - 1];
          const nodeAfterElse = this.getDisplayNodes()[elseNodeIdx + 1];

          if (!nodeAfterElse) {
            return;
          }

          //elseNode can be removed after identifying the nodeBeforeElse and nodeAfterElse to branch out from condition node
          this.removeDisplayNodeByIndex(elseNodeIdx);
          //removing elseNode from the callees of nodeBeforeElse and from the callers of nodeAfterElse
          nodeBeforeElse.callees.pop();
          nodeAfterElse.callers.pop();
          noNodeBetweenIfAndElse = nodeBeforeElse.id === condNode.id;
          hasNodeBetweenElseAndEndIf = rawCondNodeCallees.includes(
            this.getRawId(nodeAfterElse.id)
          );

          if (hasNodeBetweenElseAndEndIf) {
            newCallerForConvergingNode = nodeBeforeElse;
            condNode.callees.push(nodeAfterElse.id);
            nodeAfterElse.callers.push(condNode.id);
          } else {
            const nodeAfterEndIf = nodeAfterElse;
            nodeBeforeElse.callees.push(nodeAfterEndIf.id);
            nodeAfterEndIf.callers.push(nodeBeforeElse.id);
          }
        }

        let convergingNode: Node | undefined;
        // find converging node
        let lastRawCondNodeCallee =
          rawCondNodeCallees[rawCondNodeCallees.length - 1];
        if (hasElseNode) {
          lastRawCondNodeCallee =
            "" + rawCondNodeCallees.filter((n) => n !== elseNode?.id).pop();
        }
        const convergingNodeIdx =
          this.getDisplayNodes().findIndex(
            (n) =>
              n.id === lastRawCondNodeCallee ||
              n.id ===
                this.getDupIdBasedOnCaller(
                  "" + lastRawCondNodeCallee,
                  condNode.id
                )
          ) + 1;
        convergingNode = this.getDisplayNodes()[convergingNodeIdx];

        if (convergingNode) {
          newCallerForConvergingNode.callees.push(convergingNode.id);
          convergingNode.callers.push(newCallerForConvergingNode.id);

          if (noNodeBetweenIfAndElse) {
            // newCallerForConvergingNode is the condition node
            // codntion node and the first callee of condtionNode will be interpreted as if-true branch
            // switch the caller position so condtionNode --> convergingNode becomes if-true branch
            newCallerForConvergingNode.callees.push(
              newCallerForConvergingNode.callees.shift()!
            );
          }
          if (hasNodeBetweenElseAndEndIf) {
            // nodeBetweenElseAndEndIf already as the first caller of convergingNode when it should be the if-false branch
            // the caller position has to be switched so nodeBetweenElseAndEndIf --> convergingNode interpreted as if-false branch
            convergingNode.callers.push(convergingNode.callers.shift()!);
          }
        }
      });
    }
  }

  /*
  A -> B_1 -> C -> B_2 -> D
  objective
  - Create a duplicated node for each node with multiple callers.
  - it should navigate throught the callees of the current node before moving to the next callee of A
  currentNode: A
  add currentNode to displayNodes list
  Loop through callees of currentNode:
    - If currentNode have multiple callers, create a duplicated node with 
    the same label and add it to displayNodes, set currentNode
    to the last duplicated Node (haven't add to displayNodes yet).
    - get the next node from visitor nodes
    - set the current node callee to the next node
    - add the current node to displayNodes
    - set the next node caller to current node
    - if next node have callees, recursively call createDisplayNodesFrom

  push the last node to displayNodes and if it has multple callers
  call createDupNodes

  createDupNodes need node with multiple caller and its caller
  - every node need to check if have multiple caller before added to displayNodes

  node with caller defined can be added to displayNodes

    
  */

  public createDisplayNodesForCallees(
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
            callerNode = this.createDisplayNodesForCallees(
              calleeNode,
              [...calleeNode.callees],
              true
            );
            callerNodeIsDup = false;
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

  public createDupNodesId(currentNode: Node): string {
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
}
