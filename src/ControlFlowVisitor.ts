import { ParseTree } from "antlr4ts/tree/ParseTree";
import { TerminalNode } from "antlr4ts/tree/TerminalNode";
import * as VisualCobolParser from "./generated/VisualCobolParser";
import { VisualCobolVisitor } from "./generated/VisualCobolVisitor";
import { AbstractParseTreeVisitor } from "antlr4ts/tree/AbstractParseTreeVisitor";
import { ParserRuleContext, Token } from "antlr4ts";

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
  callers: string[];
  callees: string[];
  startLineNumber: number;
  endLineNumber: number;
  label: string;
  type: NodeType;
}

export class ControlFlowVisitor
  extends AbstractParseTreeVisitor<any>
  implements VisualCobolVisitor<any>
{
  nodes: Node[] = [];
  callerToCalleesMap = new Map<string, string[]>();
  calleeToCallersMap = new Map<string, string[]>();

  protected defaultResult() {
    return;
  }

  visitParagraph(ctx: VisualCobolParser.ParagraphContext): void {
    const type: NodeType = NodeType.NORMAL;
    //console.log(JSON.stringify(ctx, null, 2));
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
        this.addToMap(node.label, exitNode.label);
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
      if (this.calleeToCallersMap.has(callee)) {
        this.calleeToCallersMap.get(callee)?.push(caller);
      } else {
        this.calleeToCallersMap.set(callee, [caller]);
      }

      if (this.callerToCalleesMap.has(caller)) {
        this.callerToCalleesMap.get(caller)?.push(callee);
      } else {
        this.callerToCalleesMap.set(caller, [callee]);
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

    this.nodes.push(conditionNode);

    const ancestor = this.getAncestor(ctx);
    if (ancestor) {
      this.addToMap(ancestor.paragraphName().text, conditionNode.id);
      const ifElse = ctx.ifElse();
      if (ifElse) {
        const elseNode = {
          id: ifElse.start.line.toString(),
          label: ifElse.ELSE().text,
          type: NodeType.CONDITION_ELSE,
          startLineNumber: ifElse.start.line,
          endLineNumber: ifElse.stop ? ifElse.stop.line : ifElse.start.line,
          callers: [],
          callees: [],
        };
        this.nodes.push(elseNode);
        this.addToMap(ancestor.paragraphName().text, elseNode.id);
      }
    }

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

  private getIdFor(identifiers: string[]): string[] {
    let ids: string[] = [];
    identifiers.forEach((identifier) => {
      const node = this.nodes.find(
        (n) => n.label === identifier || n.id === identifier
      );
      if (node) {
        ids.push(node.id);
      }
    });
    return ids;
  }

  private findCalleesOfUnusedNode(unusedNode: Node): string[] {
    let calleesOfUnusedNode: string[] = [];
    if (unusedNode && unusedNode.callees.length > 0) {
      unusedNode.callees.forEach((callee) => {
        const calleeNode = this.nodes.find((n) => n.id === callee);
        if (calleeNode && calleeNode.callers.length === 1) {
          calleesOfUnusedNode.push(calleeNode.id);
          calleesOfUnusedNode.push(...this.findCalleesOfUnusedNode(calleeNode));
        }
      });
    }

    return calleesOfUnusedNode;
  }

  visitChildren(node: ParserRuleContext) {
    super.visitChildren(node);

    if (node.stop && node.stop.type === Token.EOF) {
      let unusedNodes: string[] = [];
      this.nodes.forEach((child) => {
        let key = child.label;
        if (
          child.type === NodeType.CONDITION ||
          child.type === NodeType.CONDITION_ELSE ||
          child.type === NodeType.LOOP
        ) {
          key = child.id;
        }
        const callees = this.callerToCalleesMap.get(key);
        const callers = this.calleeToCallersMap.get(key);

        child.callees = callees ? this.getIdFor(callees) : [];
        child.callers = callers ? this.getIdFor(callers) : [];

        if (child.type !== NodeType.START && child.callers.length === 0) {
          unusedNodes.push(child.id);
        }
      });

      [...unusedNodes].forEach((unusedNodeId) => {
        const unusedNode = this.nodes.find((n) => n.id === unusedNodeId);
        if (unusedNode) {
          unusedNodes.push(...this.findCalleesOfUnusedNode(unusedNode));
        }
      });

      this.nodes = this.nodes.filter(
        (child) => !unusedNodes.includes(child.id)
      );

      const startNodeCount = this.nodes.filter(
        (node) => node.type === NodeType.START
      ).length;
      const endNodeCount = this.nodes.filter(
        (node) => node.type === NodeType.END
      ).length;
      if (startNodeCount < 1 || endNodeCount < 1) {
        throw new Error("Missing start or end node");
      }
    }
  }

  private getAncestor(
    ctx: ParserRuleContext
  ): VisualCobolParser.ParagraphContext | undefined {
    let currentCtx: ParserRuleContext | undefined = ctx;
    while (
      !(currentCtx instanceof VisualCobolParser.ParagraphContext) &&
      currentCtx
    ) {
      currentCtx = currentCtx.parent as ParserRuleContext;
    }

    return currentCtx;
  }
}
