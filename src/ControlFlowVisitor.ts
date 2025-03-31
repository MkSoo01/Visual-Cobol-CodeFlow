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
  label: string;
  type: NodeType;
  startLineNumber: number;
  endLineNumber: number;
  callers: string[];
  callees: string[];
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

  private formNode(
    id: string,
    label: string,
    type: NodeType,
    startLineNumber: number,
    endLineNumber: number
  ): Node {
    return {
      id: id,
      label: label,
      type: type,
      startLineNumber: startLineNumber,
      endLineNumber: endLineNumber,
      callers: [],
      callees: [],
    };
  }

  visitParagraph(ctx: VisualCobolParser.ParagraphContext): void {
    let node: Node = this.formNode(
      ctx.start.line.toString(),
      ctx.paragraphName().text,
      NodeType.NORMAL,
      ctx.start.line,
      ctx.stop ? ctx.stop.line : ctx.start.line
    );

    this.nodes.push(node);

    if (ctx.paragraphName().text?.startsWith("0000")) {
      node.type = NodeType.START;
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
      caller = ancestor;
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

    const conditionNode: Node = this.formNode(
      ctx.start.line.toString(),
      nodeName,
      NodeType.CONDITION,
      ctx.start.line,
      ctx.stop ? ctx.stop.line : ctx.start.line
    );

    this.nodes.push(conditionNode);

    const ancestor = this.getAncestor(ctx);
    if (ancestor) {
      this.addToMap(ancestor, conditionNode.id);
    }

    this.visitChildren(ctx);
  }

  visitIfElse(ctx: VisualCobolParser.IfElseContext): void {
    const elseNode: Node = this.formNode(
      ctx.start.line.toString(),
      ctx.ELSE().text,
      NodeType.CONDITION_ELSE,
      ctx.start.line,
      ctx.stop ? ctx.stop.line : ctx.start.line
    );

    this.nodes.push(elseNode);

    const ancestor = this.getAncestor(ctx);
    if (ancestor) {
      this.addToMap(ancestor, elseNode.id);
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

      let performUntilNode: Node = this.formNode(
        ctx.start.line.toString(),
        nodeName,
        NodeType.LOOP,
        ctx.start.line,
        ctx.stop ? ctx.stop.line : ctx.start.line
      );

      const ancestor = this.getAncestor(ctx);
      if (ancestor) {
        this.addToMap(ancestor, performUntilNode.id);
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
    const calleesOfUnusedNode: string[] = [];
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

  private hasNormalNodeAsDescendants(parent: Node): boolean {
    const currentDescendants: string[] = parent.callees;
    let hasNormalNode = false;

    currentDescendants.forEach((descendant) => {
      if (hasNormalNode) {
        return;
      }

      const descendantNode = this.nodes.find((n) => n.id === descendant);
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

  visitChildren(node: ParserRuleContext) {
    super.visitChildren(node);

    if (node.stop && node.stop.type === Token.EOF) {
      const startNode = this.nodes.find((n) => n.type === NodeType.START);
      if (!startNode) {
        throw new Error("Missing start or end node");
      }

      let unusedNodes: string[] = [];
      this.nodes.forEach((child) => {
        const callees = this.callerToCalleesMap.get(child.id);
        const callers = this.calleeToCallersMap.get(
          child.type === NodeType.NORMAL ? child.label : child.id
        );

        child.callees = callees ? this.getIdFor(callees) : [];
        child.callers = callers ? callers : [];

        if (child.type !== NodeType.START && child.callers.length === 0) {
          unusedNodes.push(child.id);
        }
      });

      this.nodes
        .filter(
          (n) => n.type === NodeType.CONDITION || n.type === NodeType.LOOP
        )
        .forEach((n) => {
          if (n.callees.length === 0 || !this.hasNormalNodeAsDescendants(n)) {
            unusedNodes.push(n.id);
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
    }
  }

  private getAncestor(ctx: ParserRuleContext): string {
    let currentCtx: ParserRuleContext | undefined = ctx.parent;
    while (
      currentCtx &&
      !(
        currentCtx instanceof VisualCobolParser.ParagraphContext ||
        currentCtx instanceof VisualCobolParser.IfStatementContext ||
        currentCtx instanceof VisualCobolParser.PerformInlineStatementContext
      )
    ) {
      currentCtx = currentCtx.parent as ParserRuleContext;
    }

    return currentCtx ? currentCtx.start.line.toString() : "";
  }
}
