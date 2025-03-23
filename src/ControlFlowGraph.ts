import { ControlFlowVisitor, Node, NodeType } from "./ControlFlowVisitor";
import { CharStreams, CommonTokenStream } from "antlr4ts";
import * as fs from "fs";
import { VisualCobolLexer } from "./generated/VisualCobolLexer";
import { VisualCobolParser } from "./generated/VisualCobolParser";

export interface Edge {
  id: string;
  source: string;
  target: string;
  isPolyline: boolean;
}

export class ControlFlowGraph {
  nodes: Node[] = [];
  displayNodes: Node[] = [];
  duplicatedNodes: string[] = [];
  edges: Edge[] = [];

  public generateGraph(filePath: string) {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const inputStream = CharStreams.fromString(fileContent);
    const lexer = new VisualCobolLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new VisualCobolParser(tokenStream);
    const tree = parser.startRule();

    const visitor = new ControlFlowVisitor();
    visitor.visit(tree);

    if (visitor.nodes.length > 0) {
      this.nodes = visitor.nodes;
      this.createDisplayNodes();
      this.populateEdges();
    }
  }

  public createDisplayNodes(): void {
    const startNode = this.nodes.find((node) => node.type === NodeType.START);
    if (startNode) {
      const startNodeForDisplay = structuredClone(startNode);
      this.displayNodes.push(startNodeForDisplay);
      this.createForCallees(
        startNodeForDisplay,
        [...startNodeForDisplay.callees],
        false
      );
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

  public createForCallees(
    callerNode: Node,
    callees: String[],
    callerNodeIsDup: boolean
  ): Node {
    callees.forEach((callee) => {
      let calleeNode = this.nodes.find((node) => node.id === callee);
      if (calleeNode) {
        calleeNode = structuredClone(calleeNode);
        const hasMultipleCaller = calleeNode.callers.length > 1;
        if (callerNodeIsDup || hasMultipleCaller) {
          calleeNode.id = this.createDupNodesId(calleeNode);
        }
        calleeNode.callers = [callerNode.id];
        callerNode.callees = [calleeNode.id];
        this.displayNodes.push(calleeNode);

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

  public populateEdges(): void {
    this.edges = [];
    const startNode = this.nodes.find((node) => node.type === NodeType.START);

    if (startNode) {
      this.formEdge(
        startNode.id,
        startNode.callees
          .map((callee) => {
            const calleeObj = this.nodes.find((node) => node.id === callee);

            return calleeObj;
          })
          .filter((node) => node !== undefined)
      );

      //const endNode = this.nodes.find((node) => node.type === NodeType.END);
      //this.formEdge(lastNode, endNode ? [endNode] : []);
    }
  }

  private createForNodeWithMultipleCallers(node: Node): Node[] {
    const result: Node[] = [];
    const delimiter = "_";
    const prefix = node.id + delimiter;
    const callers = node.callers;
    for (let i = 0; i < callers.length; i++) {
      const caller = callers[i];

      const newNode: Node = {
        id: prefix + (i + 1).toString(),
        label: node.label,
        type: node.type,
        startLineNumber: node.startLineNumber,
        endLineNumber: node.endLineNumber,
        callers: [caller],
        callees: node.callees,
      };

      this.duplicatedNodes.push(node.id);
      result.push(newNode);
    }

    result.push(
      ...this.createCalleeNodesFrom(
        [...node.callees],
        callers.length,
        delimiter
      )
    );

    return result;
  }

  private createCalleeNodesFrom(
    callees: string[],
    numOfCallers: number,
    delimiter: string
  ): Node[] {
    const result: Node[] = [];
    if (callees.length > 0) {
      const calleeNode = this.nodes.find((node) => node.id === callees[0]);

      if (calleeNode) {
        for (let i = 0; i < numOfCallers; i++) {
          const newCalleeId = calleeNode.id + delimiter + (i + 1);
          const newCalleeNode: Node = {
            id: newCalleeId,
            label: calleeNode.label,
            type: calleeNode.type,
            startLineNumber: calleeNode.startLineNumber,
            endLineNumber: calleeNode.endLineNumber,
            callers: calleeNode.callers,
            callees: calleeNode.callees,
          };

          this.duplicatedNodes.push(calleeNode.id);
          result.push(newCalleeNode);
          result.push(
            ...this.createCalleeNodesFrom(
              [...calleeNode.callees],
              numOfCallers,
              delimiter
            )
          );
        }
      }

      callees.splice(0, 1);
      result.push(
        ...this.createCalleeNodesFrom(callees, numOfCallers, delimiter)
      );
    }

    return result;
  }

  private formEdge(source: string, target: Node[]): string {
    for (let i = 0; i < target.length; i++) {
      let targetNode = target[i];

      if (this.duplicatedNodes.includes(targetNode.id)) {
        const dupTargetNode = this.displayNodes.find(
          (node) =>
            node.id.startsWith(targetNode.id) &&
            !this.edges.find((e) => e.source === node.id)
        );

        if (dupTargetNode) {
          targetNode = dupTargetNode;
        }
      }

      const edge: Edge = {
        id: source + "-" + targetNode.id,
        source: source,
        target: targetNode.id,
        isPolyline: false,
      };

      if (this.edges.find((e) => e.id === edge.id)) {
        continue;
      }

      this.edges.push(edge);

      const targetNodeCallees = targetNode.callees
        .map((callee) => {
          const calleeObj = this.nodes.find((node) => node.id === callee);

          return calleeObj;
        })
        .filter((node) => node !== undefined);

      source = edge.target;

      const newSource = this.formEdge(source, targetNodeCallees);

      source = newSource;
    }

    const lastNode = source;
    return lastNode;
  }
}
