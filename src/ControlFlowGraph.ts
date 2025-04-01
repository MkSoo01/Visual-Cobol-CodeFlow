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
  private displayNodes: Node[] = [];
  private edges: Edge[] = [];

  public getDisplayNodes(): Node[] {
    return [...this.displayNodes];
  }

  public addNode(node: Node) {
    if (node) {
      this.displayNodes.push(node);
    }
  }

  public addNodes(nodes: Node[]) {
    if (nodes.length > 0) {
      this.displayNodes.push(...nodes);
    }
  }

  public removeNodes(toBeRemovedNodes: Node[]) {
    if (toBeRemovedNodes.length > 0) {
      this.displayNodes = this.displayNodes.filter(
        (n) => !toBeRemovedNodes.includes(n)
      );
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

    if (visitor.getNodes().length > 0) {
      this.addNodes(visitor.getNodes());
      this.processNodesForDisplay();
      this.populateEdges();
    }
  }

  private findCalleesOfUnusedNode(unusedNode: Node): Node[] {
    const calleesOfUnusedNode: Node[] = [];
    if (unusedNode && unusedNode.callees.length > 0) {
      unusedNode.callees.forEach((callee) => {
        const calleeNode = this.getDisplayNodes().find((n) => n.id === callee);
        if (calleeNode && calleeNode.callers.length === 1) {
          calleesOfUnusedNode.push(calleeNode);
          calleesOfUnusedNode.push(...this.findCalleesOfUnusedNode(calleeNode));
        }
      });
    }

    return calleesOfUnusedNode;
  }

  private hasNormalNodeAsDescendants(parent: Node): boolean {
    const currentDescendants: string[] = parent.callees;
    let hasNormalNode = false;

    currentDescendants.forEach((descendant) => {
      if (hasNormalNode) {
        return;
      }

      const descendantNode = this.getDisplayNodes().find(
        (n) => n.id === descendant
      );
      if (descendantNode && descendantNode.type === NodeType.NORMAL) {
        hasNormalNode = true;
        return;
      }

      if (descendantNode && descendantNode.callees.length > 0) {
        hasNormalNode = this.hasNormalNodeAsDescendants(descendantNode);
      }
    });

    return hasNormalNode;
  }

  public processNodesForDisplay(): void {
    const toBeRemovedNodes: Node[] = [];
    toBeRemovedNodes.push(
      ...this.getDisplayNodes().filter(
        (n) => n.type !== NodeType.START && n.callers.length === 0
      )
    );

    this.getDisplayNodes()
      .filter((n) => n.type === NodeType.CONDITION || n.type === NodeType.LOOP)
      .forEach((n) => {
        if (n.callees.length === 0 || !this.hasNormalNodeAsDescendants(n)) {
          toBeRemovedNodes.push(n);
        }
      });

    [...toBeRemovedNodes].forEach((toBeRemovedNode) => {
      toBeRemovedNodes.push(...this.findCalleesOfUnusedNode(toBeRemovedNode));
    });

    this.removeNodes(toBeRemovedNodes);

    // const startNode = this.getDisplayNodes().find(
    //   (node) => node.type === NodeType.START
    // );
    // if (startNode) {
    //   const startNodeForDisplay = structuredClone(startNode);
    //   this.displayNodes.push(startNodeForDisplay);
    //   this.createForCallees(
    //     startNodeForDisplay,
    //     [...startNodeForDisplay.callees],
    //     false
    //   );
    // }
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

  private findConditionNode(elseNode: Node): Node {
    let conditionNode;
    const caller = elseNode.callers[0];
    const callerNode = this.getDisplayNodes().find((n) => n.id === caller);
    const conditionNodeList = this.displayNodes.filter(
      (n) =>
        n.type === NodeType.CONDITION &&
        callerNode!.callees.includes(n.id) &&
        n.startLineNumber < elseNode.startLineNumber &&
        n.endLineNumber >= elseNode.endLineNumber
    );

    let conditionStartLineNumber = 0;
    conditionNodeList.forEach((node) => {
      if (node.startLineNumber > conditionStartLineNumber) {
        conditionStartLineNumber = node.startLineNumber;
        conditionNode = node;
      }
    });

    if (conditionNode) {
      return conditionNode;
    } else {
      throw new Error(
        "Cannot find condition node for ELSE at line " +
          elseNode.startLineNumber
      );
    }
  }

  public createForCallees(
    callerNode: Node,
    callees: String[],
    callerNodeIsDup: boolean
  ): Node {
    let branchEndNodeIdList: string[] = [];
    let elseNodeEndLineNumber: number = 0;
    callees.forEach((callee) => {
      let calleeNode = this.getDisplayNodes().find(
        (node) => node.id === callee
      );
      if (calleeNode) {
        if (calleeNode.type === NodeType.CONDITION_ELSE) {
          branchEndNodeIdList.push(callerNode.id);
          elseNodeEndLineNumber = calleeNode.endLineNumber;
          callerNode = this.findConditionNode(calleeNode);
          return;
        }

        calleeNode = structuredClone(calleeNode);
        const hasMultipleCaller = calleeNode.callers.length > 1;
        if (callerNodeIsDup || hasMultipleCaller) {
          calleeNode.id = this.createDupNodesId(calleeNode);
        }
        calleeNode.callers = [callerNode.id];
        if (
          callerNode.type === NodeType.CONDITION &&
          branchEndNodeIdList.length > 0
        ) {
          callerNode.callees.push(calleeNode.id);
        } else {
          callerNode.callees = [calleeNode.id];
        }
        this.displayNodes.push(calleeNode);

        const isMergeNode =
          elseNodeEndLineNumber !== 0 &&
          calleeNode.endLineNumber > elseNodeEndLineNumber;
        if (isMergeNode) {
          branchEndNodeIdList.push(callerNode.id);
          calleeNode.callers = [...branchEndNodeIdList];
          calleeNode.callers.forEach((caller) => {
            const callerNode = this.displayNodes.find(
              (node) => node.id === caller
            );
            if (callerNode) {
              callerNode.callees = [calleeNode!.id];
            }
          });
          elseNodeEndLineNumber = 0;
          branchEndNodeIdList = [];
        }

        const isCallingItself = calleeNode.callers[0].startsWith(
          calleeNode.id.split("_")[0] + "_"
        );
        if (hasMultipleCaller && !isCallingItself) {
          callerNode = this.createForCallees(
            calleeNode,
            [...calleeNode.callees],
            true
          );
          callerNodeIsDup = false;
        } else if (calleeNode.callees.length > 0 && !isCallingItself) {
          callerNode = this.createForCallees(
            calleeNode,
            [...calleeNode.callees],
            false
          );
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
        this.displayNodes.filter((node) =>
          node.id.startsWith(currentNode.id + "_")
        ).length + 1
      ).toString();

    return dupNodeId;
  }
}
