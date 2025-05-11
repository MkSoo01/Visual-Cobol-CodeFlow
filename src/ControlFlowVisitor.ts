import { ParseTree } from "antlr4ts/tree/ParseTree";
import { TerminalNode } from "antlr4ts/tree/TerminalNode";
import * as VisualCobolParser from "./generated/VisualCobolParser";
import { VisualCobolVisitor } from "./generated/VisualCobolVisitor";
import { AbstractParseTreeVisitor } from "antlr4ts/tree/AbstractParseTreeVisitor";
import { ParserRuleContext, Token } from "antlr4ts";
import { Node, NodeType } from "./ControlFlowGraph";

export class ControlFlowVisitor
  extends AbstractParseTreeVisitor<any>
  implements VisualCobolVisitor<any>
{
  private nodes: Node[] = [];
  private callerToCalleesMap = new Map<string, string[]>();
  private calleeToCallersMap = new Map<string, string[]>();
  private invocationMap = new Map<string, Map<string, number>>();

  protected defaultResult() {
    return;
  }

  public getNodes(): Node[] {
    return [...this.nodes];
  }

  public addNode(node: Node) {
    if (node) {
      this.nodes.push(node);
    }
  }

  public addNodes(nodes: Node[]) {
    if (nodes.length > 0) {
      this.nodes = this.nodes.concat(nodes);
    }
  }

  public removeNodes(toBeRemovedIds: string[]) {
    if (toBeRemovedIds.length > 0) {
      this.nodes = this.nodes.filter((n) => !toBeRemovedIds.includes(n.id));
    }
  }

  public getCallerToCalleesMap(): Map<string, string[]> {
    return structuredClone(this.callerToCalleesMap);
  }

  public getInvocationMap(): Map<string, Map<string, number>> {
    return structuredClone(this.invocationMap);
  }

  public addEntryToInvocationMap(
    nodeLabel: string,
    caller: string,
    invocationLineNumber: number
  ) {
    if (nodeLabel && invocationLineNumber) {
      let invocationCaller = caller;
      while (
        invocationCaller &&
        this.getNodes().find((n) => n.id === invocationCaller)?.type ===
          NodeType.LOOP
      ) {
        invocationCaller =
          this.getCalleeToCallersMap().get(invocationCaller)![0];
      }

      const invocationMapItem = new Map<string, number>();
      invocationMapItem.set(invocationCaller, invocationLineNumber);
      const invocationList = this.invocationMap.get(nodeLabel);
      if (invocationList) {
        if (!invocationList.has(invocationCaller)) {
          invocationList.set(invocationCaller, invocationLineNumber);
        }
      } else {
        this.invocationMap.set(nodeLabel, invocationMapItem);
      }
    }
  }

  public addEntryToCallerCalleesMap(caller: string, callee: string) {
    if (caller && callee) {
      if (this.callerToCalleesMap.has(caller)) {
        const lastIndex = this.callerToCalleesMap.get(caller)!.length - 1;
        const arry: string[] = this.callerToCalleesMap.get(caller) || [];
        const sameAsPrevCallee: boolean = arry[lastIndex] === callee;
        if (sameAsPrevCallee) {
          return;
        }

        this.callerToCalleesMap.get(caller)?.push(callee);
      } else {
        this.callerToCalleesMap.set(caller, [callee]);
      }

      if (this.calleeToCallersMap.has(callee)) {
        this.calleeToCallersMap.get(callee)?.push(caller);
      } else {
        this.calleeToCallersMap.set(callee, [caller]);
      }
    }
  }

  public getCalleeToCallersMap(): Map<string, string[]> {
    return structuredClone(this.calleeToCallersMap);
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

  private getAncestor(ctx: ParserRuleContext): string {
    let currentCtx: ParserRuleContext | undefined = ctx.parent;
    while (
      currentCtx &&
      !(
        currentCtx instanceof VisualCobolParser.ParagraphContext ||
        currentCtx instanceof VisualCobolParser.PerformInlineStatementContext
      )
    ) {
      currentCtx = currentCtx.parent as ParserRuleContext;
    }

    return currentCtx ? currentCtx.start.line.toString() : "";
  }

  visitParagraph(ctx: VisualCobolParser.ParagraphContext): void {
    let node: Node = this.formNode(
      ctx.start.line.toString(),
      ctx.paragraphName().text,
      NodeType.NORMAL,
      ctx.start.line,
      ctx.stop ? ctx.stop.line : ctx.start.line
    );

    this.addNode(node);

    if (ctx.paragraphName().text?.startsWith("0000-MAIN-ROUTINE")) {
      node.type = NodeType.START;
    }

    this.visitChildren(ctx);
  }

  visitPerformProcedureStatement(
    ctx: VisualCobolParser.PerformProcedureStatementContext
  ): void {
    const isForHandlingError: boolean = ctx
      .procedureName(0)
      .text?.startsWith("99");
    if (isForHandlingError) {
      return;
    }

    let caller = undefined;
    let callee = undefined;
    if (ctx.performType()) {
      caller = this.addLoopNode(ctx);
    } else {
      caller = this.getAncestor(ctx);
    }
    if (caller) {
      callee = ctx.procedureName(0).text;

      this.addEntryToCallerCalleesMap(caller, callee);
      this.addEntryToInvocationMap(callee, caller, ctx.start.line);
    }

    this.visitChildren(ctx);
  }

  public addLoopNode(
    ctx:
      | VisualCobolParser.PerformProcedureStatementContext
      | VisualCobolParser.PerformInlineStatementContext
  ): string {
    let nodeName;
    let performTypeInstance;

    const performType = ctx.performType();
    if (performType) {
      if (performType.performUntil()) {
        performTypeInstance = performType.performUntil();
      } else if (performType.performVarying()) {
        performTypeInstance = performType.performVarying();
      } else if (performType.performTimes()) {
        performTypeInstance = performType.performTimes();
      }
    }

    if (performTypeInstance) {
      nodeName =
        "PERFORM " + this.getLeafNodeTexts(performTypeInstance).join(" ");
    }

    if (nodeName) {
      let loopNode: Node = this.formNode(
        ctx.start.line.toString(),
        nodeName,
        NodeType.LOOP,
        ctx.start.line,
        ctx.stop ? ctx.stop.line : ctx.start.line
      );

      const ancestor = this.getAncestor(ctx);
      if (ancestor) {
        this.addEntryToCallerCalleesMap(ancestor, loopNode.id);
      }

      this.addNode(loopNode);
      return loopNode.id;
    }

    return "";
  }

  visitPerformInlineStatement(
    ctx: VisualCobolParser.PerformInlineStatementContext
  ): void {
    this.addLoopNode(ctx);
    this.visitChildren(ctx);
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
      const node = this.getNodes().find(
        (n) => n.label === identifier || n.id === identifier
      );
      if (node) {
        ids.push(node.id);
      }
    });
    return ids;
  }

  visitChildren(node: ParserRuleContext) {
    super.visitChildren(node);

    if (node.stop && node.stop.type === Token.EOF) {
      const startNode = this.getNodes().find((n) => n.type === NodeType.START);
      if (!startNode) {
        throw new Error("Missing start node");
      }

      this.getNodes().forEach((child) => {
        const callees = this.getCallerToCalleesMap().get(child.id);
        const callers = this.getCalleeToCallersMap().get(
          child.type === NodeType.NORMAL ? child.label : child.id
        );

        child.callees = callees ? this.getIdFor(callees) : [];
        child.callers = callers ? callers : [];

        if (this.getInvocationMap().has(child.label)) {
          child.invocationMap = this.getInvocationMap().get(child.label);
        }
      });
    }
  }
}
