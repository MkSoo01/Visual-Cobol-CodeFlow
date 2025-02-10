import { ErrorNode } from "antlr4ts/tree/ErrorNode";
import { ParseTree } from "antlr4ts/tree/ParseTree";
import { RuleNode } from "antlr4ts/tree/RuleNode";
import { TerminalNode } from "antlr4ts/tree/TerminalNode";
import * as VisualCobolParser from "./generated/VisualCobolParser";
import { VisualCobolVisitor } from "./generated/VisualCobolVisitor";
import { AbstractParseTreeVisitor } from "antlr4ts/tree/AbstractParseTreeVisitor";
import { ParserRuleContext, Token } from "antlr4ts";

export enum NodeType {
  START = "start",
  END = "end",
  CONDITION = "condition",
  LOOP = "loop",
  NORMAL = "normal",
}

export interface Node {
  id: string;
  callers: string[];
  callees: string[];
  startLineNumber: number;
  endLineNumber: number;
  label: string;
  type: NodeType;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  isPolyline: boolean;
}

export class ControlFlowVisitor
  extends AbstractParseTreeVisitor<any>
  implements VisualCobolVisitor<any>
{
  nodes: Node[] = [];
  edges: Edge[] = [];
  displayNodes: Node[] = [];
  duplicatedNodes: string[] = [];
  callerMap = new Map<string, string[]>();
  calleeMap = new Map<string, string[]>();

  protected defaultResult() {
    return;
  }

  visitParagraph(ctx: VisualCobolParser.ParagraphContext): void {
    const type: NodeType = NodeType.NORMAL;

    let node: Node = {
      id: ctx.start.line.toString(),
      label: ctx.paragraphName().text,
      type: type,
      startLineNumber: ctx.start.line,
      endLineNumber: ctx.stop ? ctx.stop.line : ctx.start.line,
      callers: [],
      callees: [],
    };

    if (ctx.paragraphExit() !== undefined) {
      let endLine = ctx.paragraphExit()?.stop
        ? ctx.paragraphExit()?.stop?.line
        : ctx.paragraphExit()?.start.line;

      node.endLineNumber = endLine ? endLine : node.endLineNumber;
    }

    // ctx.sentence().forEach((sentence) => {
    //   sentence.statement().forEach((statement) => {
    //     if (
    //       statement.getChild(0) instanceof
    //       VisualCobolParser.PerformStatementContext
    //     ) {
    //       let performName = statement
    //         .performStatement()
    //         ?.performProcedureStatement()
    //         ?.procedureName(0).text;

    //       console.log("CALLED: " + performName);
    //       node.callees.push(performName ? performName : "DEFAULT");
    //     }
    //   });
    // });

    this.nodes.push(node);

    if (ctx.paragraphName().text?.startsWith("0000")) {
      node.type = NodeType.START;
      const paragraphExit = ctx.paragraphExit();
      if (paragraphExit) {
        const paragraphExitLineNumber = paragraphExit.stop
          ? paragraphExit.stop.line
          : paragraphExit.start.line;
        const exitNode: Node = {
          id: paragraphExitLineNumber.toString(),
          label: paragraphExit.paragraphName().text,
          type: NodeType.END,
          startLineNumber: paragraphExitLineNumber,
          endLineNumber: paragraphExitLineNumber,
          callers: [],
          callees: [],
        };
        this.nodes.push(exitNode);
      }
    }

    this.visitChildren(ctx);
  }

  visitPerformProcedureStatement(
    ctx: VisualCobolParser.PerformProcedureStatementContext
  ): void {
    const ancestor = this.getAncestor(ctx);
    let caller = undefined;
    let callee = undefined;
    if (ancestor) {
      caller = ancestor.paragraphName().text;
      callee = ctx.procedureName(0).text;
      this.addToMap(caller, callee);
    }

    this.visitChildren(ctx);
  }

  addToMap(caller: string | undefined, callee: string | undefined) {
    if (caller && callee) {
      if (this.calleeMap.has(callee)) {
        this.calleeMap.get(callee)?.push(caller);
      } else {
        this.calleeMap.set(callee, [caller]);
      }

      if (this.callerMap.has(caller)) {
        this.callerMap.get(caller)?.push(callee);
      } else {
        this.callerMap.set(caller, [callee]);
      }
    }
  }

  visitIfStatement(ctx: VisualCobolParser.IfStatementContext): void {
    const nodeName =
      ctx.IF().text + " " + this.getLeafNodeTexts(ctx.condition()).join(" ");

    let conditionNode: Node = {
      id: ctx.start.line.toString(),
      label: nodeName,
      type: NodeType.CONDITION,
      startLineNumber: ctx.start.line,
      endLineNumber: ctx.stop ? ctx.stop.line : ctx.start.line,
      callers: [],
      callees: [],
    };

    const ancestor = this.getAncestor(ctx);
    if (ancestor) {
      this.addToMap(ancestor.paragraphName().text, conditionNode.id);
    }

    this.nodes.push(conditionNode);
    this.visitChildren(ctx);
  }

  visitPerformInlineStatement(
    ctx: VisualCobolParser.PerformInlineStatementContext
  ): void {
    const performUntil = ctx.performType()?.performUntil();
    if (performUntil) {
      const nodeName =
        "PERFORM " + this.getLeafNodeTexts(performUntil).join(" ");

      let performUntilNode: Node = {
        id: ctx.start.line.toString(),
        label: nodeName,
        type: NodeType.LOOP,
        startLineNumber: ctx.start.line,
        endLineNumber: ctx.stop ? ctx.stop.line : ctx.start.line,
        callers: [],
        callees: [],
      };

      const ancestor = this.getAncestor(ctx);
      if (ancestor) {
        this.addToMap(ancestor.paragraphName().text, performUntilNode.id);
      }

      this.nodes.push(performUntilNode);
      this.visitChildren(ctx);
    }
  }

  private getLeafNodeTexts(leafNode: ParseTree): string[] {
    if (leafNode instanceof TerminalNode) {
      return [leafNode.text];
    } else {
      const texts: string[] = [];
      for (let i = 0; i < leafNode.childCount; i++) {
        const child = leafNode.getChild(i);
        texts.push(...this.getLeafNodeTexts(child));
      }
      return texts;
    }
  }

  visitChildren(node: ParserRuleContext) {
    super.visitChildren(node);

    if (node.stop && node.stop.type === Token.EOF) {
      let unusedNodes: string[] = [];
      this.nodes.forEach((child) => {
        let key = child.label;
        if (child.type === NodeType.CONDITION || child.type === NodeType.LOOP) {
          key = child.id;
        }
        const callees = this.callerMap.get(key);
        const callers = this.calleeMap.get(key);

        child.callees = callees ? callees : [];
        child.callers = callers ? callers : [];

        if (child.type === NodeType.NORMAL && child.callers.length === 0) {
          unusedNodes.push(child.id);
        }

        if (child.callers.length > 1) {
          const displayNodeWithMultipleCallerList =
            this.createForNodeWithMultipleCallers(child);
          this.displayNodes.push(...displayNodeWithMultipleCallerList);
        } else {
          this.displayNodes.push(child);
        }
      });

      this.nodes = this.nodes.filter(
        (child) => !unusedNodes.includes(child.id)
      );

      this.displayNodes = this.displayNodes.filter(
        (child) =>
          !unusedNodes.includes(child.id) &&
          !this.duplicatedNodes.includes(child.id)
      );

      this.nodes.forEach((node) => {
        console.log("Node: " + node.label + " ID: " + node.id);
      });

      const startNode = this.nodes.find((node) => node.type === NodeType.START);

      if (startNode) {
        const lastNode = this.formEdge(
          startNode.id,
          startNode.callees
            .map((callee) => {
              const calleeObj = this.nodes.find(
                (node) => node.label === callee || node.id === callee
              );

              return calleeObj;
            })
            .filter((node) => node !== undefined)
        );

        const endNode = this.nodes.find((node) => node.type === NodeType.END);
        this.formEdge(lastNode, endNode ? [endNode] : []);
      }
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
      const calleeNode = this.nodes.find(
        (node) => node.label === callees[0] || node.id === callees[0]
      );

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
      let hasDup = false;

      if (this.duplicatedNodes.includes(targetNode.id)) {
        const dupTargetNode = this.displayNodes.find(
          (node) =>
            node.id.startsWith(targetNode.id) &&
            !this.edges.find((e) => e.source === node.id)
        );

        if (dupTargetNode) {
          targetNode = dupTargetNode;
          hasDup = true;
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
          const calleeObj = this.nodes.find(
            (node) => node.label === callee || node.id === callee
          );

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

  private getAncestor(
    ctx: ParserRuleContext
  ): VisualCobolParser.ParagraphContext | undefined {
    let currentCtx: ParserRuleContext | undefined = ctx;
    while (currentCtx.parent) {
      if (currentCtx instanceof VisualCobolParser.ParagraphContext) {
        return currentCtx;
      }

      currentCtx = currentCtx.parent as ParserRuleContext;
    }

    return undefined;
  }
}
