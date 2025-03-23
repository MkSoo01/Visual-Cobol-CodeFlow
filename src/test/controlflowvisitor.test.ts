const chai = require("chai");
const sinonChai = require("sinon-chai");
import {
  ClassConditionContext,
  CombinableConditionContext,
  ConditionContext,
  FigurativeConstantContext,
  IdentifierContext,
  IfElseContext,
  IfStatementContext,
  ParagraphContext,
  ParagraphExitContext,
  ParagraphNameContext,
  PerformInlineStatementContext,
  PerformProcedureStatementContext,
  PerformStatementContext,
  PerformTypeContext,
  PerformUntilContext,
  ProcedureNameContext,
  RelationConditionContext,
  SentenceContext,
  SimpleConditionContext,
  StatementContext,
} from "../generated/VisualCobolParser";
import { ControlFlowVisitor, Node, NodeType } from "../ControlFlowVisitor";
import { ParserRuleContext, Token } from "antlr4ts";
import sinon from "sinon";
import { ControlFlowGraph } from "../ControlFlowGraph";
import { TerminalNode } from "antlr4ts/tree/TerminalNode";

chai.use(sinonChai);
const expect = chai.expect;

suite("Tests for Control Flow Visitor", () => {
  let visitor: ControlFlowVisitor;

  setup(async function () {
    visitor = new ControlFlowVisitor();
  });

  function defineProperty(object: any, property: string, value: any) {
    Object.defineProperty(object, property, {
      get: () => value,
    });
  }

  function createMockedParserRuleCtx(
    ctx: ParserRuleContext,
    text: string,
    startLineNumber: number,
    endLineNumber: number
  ): ParserRuleContext {
    const mockedCtx = ctx;

    const mockedStartToken: Token = {
      line: startLineNumber,
    } as Token;

    const mockedStopToken: Token = {
      line: endLineNumber,
    } as Token;

    defineProperty(mockedCtx, "start", mockedStartToken);
    defineProperty(mockedCtx, "stop", mockedStopToken);
    defineProperty(mockedCtx, "text", text);

    return mockedCtx;
  }

  function createMockedParagraphCtx(
    paragraphName: string,
    startLineNumber: number,
    endLineNumber: number
  ): ParagraphContext {
    const mockedCtx = createMockedParserRuleCtx(
      sinon.createStubInstance(ParagraphContext),
      "",
      startLineNumber,
      endLineNumber
    ) as ParagraphContext;

    const mockedParagraphName = createMockedParserRuleCtx(
      sinon.createStubInstance(ParagraphNameContext),
      paragraphName,
      startLineNumber,
      startLineNumber
    ) as ParagraphNameContext;

    mockedCtx.paragraphName = () => mockedParagraphName;

    return mockedCtx;
  }

  function setParent(child: ParserRuleContext, parent: ParserRuleContext) {
    defineProperty(child, "parent", parent);
  }

  function createMockedPerformProcedureStatementCtx(
    procedureName: string,
    caller: ParserRuleContext
  ): PerformProcedureStatementContext {
    const mockedCtx = sinon.createStubInstance(
      PerformProcedureStatementContext
    );
    const mockedProcedureNameCtx = createMockedParserRuleCtx(
      sinon.createStubInstance(ProcedureNameContext),
      procedureName,
      0,
      0
    ) as ProcedureNameContext;

    mockedCtx.procedureName.returns(mockedProcedureNameCtx);
    const mockedSentenceCtx = sinon.createStubInstance(SentenceContext);
    const mockedStatementCtx = sinon.createStubInstance(StatementContext);
    const mockedPerformStatementCtx = sinon.createStubInstance(
      PerformStatementContext
    );

    setParent(mockedCtx, mockedPerformStatementCtx);
    setParent(mockedPerformStatementCtx, mockedStatementCtx);
    setParent(mockedStatementCtx, mockedSentenceCtx);
    setParent(mockedSentenceCtx, caller);

    return mockedCtx;
  }

  function initIfStatementCtx(
    mockedIfStatementCtx: IfStatementContext,
    ifStatementText: string
  ) {
    const textArray = ifStatementText.split(" ");
    textArray.shift();

    const mockedCobolWordTerminalNode = sinon.createStubInstance(TerminalNode);
    defineProperty(mockedCobolWordTerminalNode, "text", textArray[0]);

    const mockedTerminalNode = sinon.createStubInstance(TerminalNode);
    defineProperty(mockedTerminalNode, "text", textArray[1]);

    const mockedFigurativeConstantTerminalNode =
      sinon.createStubInstance(TerminalNode);
    defineProperty(
      mockedFigurativeConstantTerminalNode,
      "text",
      textArray.slice(2).join(" ")
    );

    const mockedConditionCtx = sinon.createStubInstance(ConditionContext);
    const mockedCombinableConditionCtx = sinon.createStubInstance(
      CombinableConditionContext
    );
    const mockedSimpleConditionCtx = sinon.createStubInstance(
      SimpleConditionContext
    );
    const mockedClassConditionCtx = sinon.createStubInstance(
      ClassConditionContext
    );
    const mockedIdentifierCtx = sinon.createStubInstance(IdentifierContext);
    const mockedFigurativeConstantCtx = sinon.createStubInstance(
      FigurativeConstantContext
    );

    defineProperty(mockedConditionCtx, "childCount", 1);
    defineProperty(mockedCombinableConditionCtx, "childCount", 1);
    defineProperty(mockedSimpleConditionCtx, "childCount", 1);
    defineProperty(mockedClassConditionCtx, "childCount", 3);
    defineProperty(mockedIdentifierCtx, "childCount", 1);
    defineProperty(mockedFigurativeConstantCtx, "childCount", 1);

    mockedConditionCtx.getChild
      .withArgs(0)
      .returns(mockedCombinableConditionCtx);
    mockedCombinableConditionCtx.getChild
      .withArgs(0)
      .returns(mockedSimpleConditionCtx);
    mockedSimpleConditionCtx.getChild
      .withArgs(0)
      .returns(mockedClassConditionCtx);
    mockedClassConditionCtx.getChild.withArgs(0).returns(mockedIdentifierCtx);
    mockedClassConditionCtx.getChild.withArgs(1).returns(mockedTerminalNode);
    mockedClassConditionCtx.getChild
      .withArgs(2)
      .returns(mockedFigurativeConstantCtx);
    mockedIdentifierCtx.getChild
      .withArgs(0)
      .returns(mockedCobolWordTerminalNode);
    mockedFigurativeConstantCtx.getChild
      .withArgs(0)
      .returns(mockedFigurativeConstantTerminalNode);

    const mockedIfStatementTerminalNode: TerminalNode = {
      text: "IF",
    } as TerminalNode;

    mockedIfStatementCtx.IF = () => mockedIfStatementTerminalNode;
    mockedIfStatementCtx.condition = () => mockedConditionCtx;
  }

  function initPerformInlineStatementCtx(
    mockedPerformInlineStatementCtx: PerformInlineStatementContext,
    performInlineStatementText: string
  ) {
    const mockedPerformTypeCtx = sinon.createStubInstance(PerformTypeContext);
    const mockedPerformUntilCtx = sinon.createStubInstance(PerformUntilContext);
    mockedPerformInlineStatementCtx.performType = () => mockedPerformTypeCtx;
    mockedPerformTypeCtx.performUntil.returns(mockedPerformUntilCtx);

    const textArray = performInlineStatementText.split(" ");
    textArray.shift();
    const untilTerminalNode = sinon.createStubInstance(TerminalNode);
    defineProperty(untilTerminalNode, "text", textArray[0]);
    const otherTerminalNode = sinon.createStubInstance(TerminalNode);
    defineProperty(otherTerminalNode, "text", textArray.splice(1).join(" "));
    const mockedConditionCtx = sinon.createStubInstance(ConditionContext);
    const mockedCombinableConditionCtx = sinon.createStubInstance(
      CombinableConditionContext
    );
    const mockedSimpleConditionCtx = sinon.createStubInstance(
      SimpleConditionContext
    );
    const mockedRelationConditionCtx = sinon.createStubInstance(
      RelationConditionContext
    );
    mockedPerformUntilCtx.getChild.withArgs(0).returns(untilTerminalNode);
    mockedPerformUntilCtx.getChild.withArgs(1).returns(mockedConditionCtx);
    defineProperty(mockedPerformUntilCtx, "childCount", 2);
    mockedConditionCtx.getChild
      .withArgs(0)
      .returns(mockedCombinableConditionCtx);
    defineProperty(mockedConditionCtx, "childCount", 1);
    mockedCombinableConditionCtx.getChild
      .withArgs(0)
      .returns(mockedSimpleConditionCtx);
    defineProperty(mockedCombinableConditionCtx, "childCount", 1);
    mockedSimpleConditionCtx.getChild
      .withArgs(0)
      .returns(mockedRelationConditionCtx);
    defineProperty(mockedSimpleConditionCtx, "childCount", 1);
    mockedRelationConditionCtx.getChild.withArgs(0).returns(otherTerminalNode);
    defineProperty(mockedRelationConditionCtx, "childCount", 1);
  }

  test("the start node data to be captured correctly", function () {
    const expectedNodeName = "0000-MAIN-ROUTINE";
    const expectedStartLineNumber = 235;
    const expectedEndLineNumber = 256;
    const mockedCtx = createMockedParagraphCtx(
      expectedNodeName,
      expectedStartLineNumber,
      expectedEndLineNumber
    );

    visitor.visitParagraph(mockedCtx);

    expect(visitor.nodes.length).to.equal(1);

    const startNode = visitor.nodes[0];

    expect(startNode?.id).to.equal(startNode?.startLineNumber.toString());
    expect(startNode?.label).to.equal(expectedNodeName);
    expect(startNode?.startLineNumber).to.equal(expectedStartLineNumber);
    expect(startNode?.endLineNumber).to.equal(expectedEndLineNumber);
    expect(startNode?.type).to.equal(NodeType.START);
    expect(startNode?.callers).to.be.empty;
  });

  test("the end node data to be captured correctly", function () {
    const startNodeName = "0000-MAIN-ROUTINE";
    const startNodeStartLineNumber = 235;
    const startNodeEndLineNumber = 256;
    const mockedCtx = createMockedParagraphCtx(
      startNodeName,
      startNodeStartLineNumber,
      startNodeEndLineNumber
    );

    const expectedNodeName = "0000-EXIT";
    const expectedEndLineNumber = startNodeEndLineNumber;

    const mockedParagraphExit = createMockedParagraphCtx(
      expectedNodeName,
      expectedEndLineNumber,
      expectedEndLineNumber
    ) as unknown as ParagraphExitContext;

    mockedCtx.paragraphExit = () => mockedParagraphExit;

    visitor.visitParagraph(mockedCtx);

    expect(visitor.nodes).to.not.be.empty;

    const endNode = visitor.nodes[1];

    expect(endNode.id).to.equal(endNode?.startLineNumber.toString());
    expect(endNode.label).to.equal(expectedNodeName);
    expect(endNode.startLineNumber).to.equal(expectedEndLineNumber);
    expect(endNode.endLineNumber).to.equal(endNode?.startLineNumber);
    expect(endNode.type).to.equal(NodeType.END);
    expect(visitor.calleeToCallersMap.has(endNode.label)).to.be.true;
    expect(visitor.calleeToCallersMap.get(endNode.label)).to.have.members([
      startNodeName,
    ]);
    expect(visitor.callerToCalleesMap.has(startNodeName)).to.be.true;
    expect(visitor.callerToCalleesMap.get(startNodeName)).to.have.members([
      endNode.label,
    ]);
  });

  test("the normal node data to be captured correctly", function () {
    const expectedNodeName = "1000-INIT";
    const expectedStartLineNumber = 265;
    const expectedEndLineNumber = 275;
    const mockedCtx = createMockedParagraphCtx(
      expectedNodeName,
      expectedStartLineNumber,
      expectedEndLineNumber
    );

    visitor.visitParagraph(mockedCtx);

    expect(visitor.nodes.length).to.equal(1);

    const normalNode = visitor.nodes[0];

    expect(normalNode?.id).to.equal(normalNode?.startLineNumber.toString());
    expect(normalNode?.label).to.equal(expectedNodeName);
    expect(normalNode?.startLineNumber).to.equal(expectedStartLineNumber);
    expect(normalNode?.endLineNumber).to.equal(expectedEndLineNumber);
    expect(normalNode?.type).to.equal(NodeType.NORMAL);
    expect(normalNode?.callers).to.be.empty;
  });

  test("visitParagraph call visitChildren once at the end", function () {
    const visitChildrenStub = sinon.stub(visitor, "visitChildren");

    const expectedNodeName = "1000-INIT";
    const expectedStartLineNumber = 265;
    const expectedEndLineNumber = 275;
    const mockedCtx = createMockedParagraphCtx(
      expectedNodeName,
      expectedStartLineNumber,
      expectedEndLineNumber
    );

    visitor.visitParagraph(mockedCtx);

    expect(visitChildrenStub).to.have.been.calledOnce;
  });

  test("caller and callee to be identified correctly", function () {
    const callerNodeName = "0000-MAIN-ROUTINE";
    const callerStartLineNumber = 235;
    const callerEndLineNumber = 256;
    const mockedParagraphCtx: ParagraphContext = createMockedParagraphCtx(
      callerNodeName,
      callerStartLineNumber,
      callerEndLineNumber
    ) as unknown as ParagraphContext;

    const procedureName = "1000-INIT";
    const mockedCtx = createMockedPerformProcedureStatementCtx(
      procedureName,
      mockedParagraphCtx
    );

    visitor.visitPerformProcedureStatement(mockedCtx);

    expect(visitor.calleeToCallersMap.has(procedureName)).to.be.true;
    expect(visitor.calleeToCallersMap.get(procedureName)).to.have.members([
      callerNodeName,
    ]);
    expect(visitor.callerToCalleesMap.has(callerNodeName)).to.be.true;
    expect(visitor.callerToCalleesMap.get(callerNodeName)).to.have.members([
      procedureName,
    ]);
  });

  test("caller can have multiple callees", function () {
    const callerNodeName = "0000-MAIN-ROUTINE";
    const callerStartLineNumber = 235;
    const callerEndLineNumber = 256;
    const mockedParagraphCtx: ParagraphContext = createMockedParagraphCtx(
      callerNodeName,
      callerStartLineNumber,
      callerEndLineNumber
    ) as unknown as ParagraphContext;

    const procedureName1 = "1000-INIT";
    const mockedCtx1 = createMockedPerformProcedureStatementCtx(
      procedureName1,
      mockedParagraphCtx
    );

    const procedureName2 = "2000-PROCESS";
    const mockedCtx2 = createMockedPerformProcedureStatementCtx(
      procedureName2,
      mockedParagraphCtx
    );

    visitor.visitPerformProcedureStatement(mockedCtx1);
    visitor.visitPerformProcedureStatement(mockedCtx2);

    expect(visitor.callerToCalleesMap.has(callerNodeName)).to.be.true;
    expect(visitor.callerToCalleesMap.get(callerNodeName)).to.have.members([
      procedureName1,
      procedureName2,
    ]);
    expect(visitor.calleeToCallersMap.has(procedureName1)).to.be.true;
    expect(visitor.calleeToCallersMap.get(procedureName1)).to.have.members([
      callerNodeName,
    ]);
    expect(visitor.calleeToCallersMap.has(procedureName2)).to.be.true;
    expect(visitor.calleeToCallersMap.get(procedureName2)).to.have.members([
      callerNodeName,
    ]);
  });

  test("callee can have multiple callers", function () {
    const callerNode1Name = "0000-MAIN-ROUTINE";
    const callerStartLineNumber = 235;
    const callerEndLineNumber = 256;
    const mockedParagraphCtx1: ParagraphContext = createMockedParagraphCtx(
      callerNode1Name,
      callerStartLineNumber,
      callerEndLineNumber
    ) as unknown as ParagraphContext;

    const callerNode2Name = "1000-INIT";
    const mockedParagraphCtx2: ParagraphContext = createMockedParagraphCtx(
      callerNode2Name,
      callerStartLineNumber,
      callerEndLineNumber
    ) as unknown as ParagraphContext;

    const procedureName = "2000-INIT";
    const mockedCtx1 = createMockedPerformProcedureStatementCtx(
      procedureName,
      mockedParagraphCtx1
    );

    const mockedCtx2 = createMockedPerformProcedureStatementCtx(
      procedureName,
      mockedParagraphCtx2
    );

    visitor.visitPerformProcedureStatement(mockedCtx1);
    visitor.visitPerformProcedureStatement(mockedCtx2);

    expect(visitor.calleeToCallersMap.has(procedureName)).to.be.true;
    expect(visitor.calleeToCallersMap.get(procedureName)).to.have.members([
      callerNode1Name,
      callerNode2Name,
    ]);

    expect(visitor.callerToCalleesMap.has(callerNode1Name)).to.be.true;
    expect(visitor.callerToCalleesMap.get(callerNode1Name)).to.have.members([
      procedureName,
    ]);
    expect(visitor.callerToCalleesMap.has(callerNode2Name)).to.be.true;
    expect(visitor.callerToCalleesMap.get(callerNode2Name)).to.have.members([
      procedureName,
    ]);
  });

  test("visitPerformProcedureStatement call visitChildren once at the end", function () {
    const visitChildrenStub = sinon.stub(visitor, "visitChildren");

    const callerNodeName = "0000-MAIN-ROUTINE";
    const callerStartLineNumber = 235;
    const callerEndLineNumber = 256;
    const mockedParagraphCtx: ParagraphContext = createMockedParagraphCtx(
      callerNodeName,
      callerStartLineNumber,
      callerEndLineNumber
    ) as unknown as ParagraphContext;

    const procedureName = "1000-INIT";
    const mockedCtx = createMockedPerformProcedureStatementCtx(
      procedureName,
      mockedParagraphCtx
    );

    visitor.visitPerformProcedureStatement(mockedCtx);

    expect(visitChildrenStub).to.have.been.calledOnce;
  });

  test("the condition node data to be captured correctly", function () {
    const expectedNodeName = "IF OFFICIAL-RATE EQUALS ZEROES";
    const expectedStartLineNumber = 245;
    const expectedEndLineNumber = 253;
    const expectedNodeId = expectedStartLineNumber.toString();

    let mockedCtx = createMockedParserRuleCtx(
      sinon.createStubInstance(IfStatementContext),
      "",
      expectedStartLineNumber,
      expectedEndLineNumber
    ) as IfStatementContext;

    initIfStatementCtx(mockedCtx, expectedNodeName);
    const caller = "1000-INIT";
    const mockedParagraphCtx: ParagraphContext = createMockedParagraphCtx(
      caller,
      0,
      0
    ) as ParagraphContext;
    setParent(mockedCtx, mockedParagraphCtx);

    visitor.visitIfStatement(mockedCtx);

    const conditionNode = visitor.nodes[0];

    expect(conditionNode).to.not.be.undefined;
    expect(conditionNode.label).to.equal(expectedNodeName);
    expect(conditionNode.id).to.equal(expectedNodeId);
    expect(conditionNode.startLineNumber).to.equal(expectedStartLineNumber);
    expect(conditionNode.endLineNumber).to.equal(expectedEndLineNumber);
    expect(visitor.callerToCalleesMap.get(caller)).to.have.members([
      expectedNodeId,
    ]);
    expect(visitor.calleeToCallersMap.get(expectedNodeId)).to.have.members([
      caller,
    ]);
  });

  test("the Else node data to be captured correctly", function () {
    const expectedNodeName = "ELSE";
    const expectedStartLineNumber = 245;
    const expectedEndLineNumber = 253;
    const expectedNodeId = expectedStartLineNumber.toString();

    let mockedCtx = createMockedParserRuleCtx(
      sinon.createStubInstance(IfStatementContext),
      "",
      230,
      260
    ) as IfStatementContext;

    initIfStatementCtx(mockedCtx, expectedNodeName);
    const mockedIfElseCtx = createMockedParserRuleCtx(
      sinon.createStubInstance(IfElseContext),
      "",
      expectedStartLineNumber,
      expectedEndLineNumber
    ) as IfElseContext;

    const mockedElseTerminalNode: TerminalNode = {
      text: "ELSE",
    } as TerminalNode;

    mockedIfElseCtx.ELSE = () => mockedElseTerminalNode;
    mockedCtx.ifElse = () => mockedIfElseCtx;

    const caller = "1000-INIT";
    const mockedParagraphCtx: ParagraphContext = createMockedParagraphCtx(
      caller,
      0,
      0
    ) as ParagraphContext;
    setParent(mockedCtx, mockedParagraphCtx);

    visitor.visitIfStatement(mockedCtx);

    const elseNode = visitor.nodes[1];

    expect(elseNode).to.not.be.undefined;
    expect(elseNode.label).to.equal(expectedNodeName);
    expect(elseNode.id).to.equal(expectedNodeId);
    expect(elseNode.startLineNumber).to.equal(expectedStartLineNumber);
    expect(elseNode.endLineNumber).to.equal(expectedEndLineNumber);
    expect(visitor.callerToCalleesMap.get(caller)).to.contain.members([
      expectedNodeId,
    ]);
    expect(visitor.calleeToCallersMap.get(expectedNodeId)).to.have.members([
      caller,
    ]);
  });

  test("visitIfStatement call visitChildren once at the end", function () {
    const visitChildrenStub = sinon.stub(visitor, "visitChildren");

    let mockedCtx = createMockedParserRuleCtx(
      sinon.createStubInstance(IfStatementContext),
      "",
      0,
      0
    ) as IfStatementContext;

    initIfStatementCtx(mockedCtx, "");

    visitor.visitIfStatement(mockedCtx);

    expect(visitChildrenStub).to.have.been.calledOnce;
  });

  test("the loop node data to be captured correctly", function () {
    const expectedNodeName = "PERFORM UNTIL SQLCODE = CC-NOT-FOUND";
    const expectedStartLineNumber = 245;
    const expectedEndLineNumber = 253;
    const expectedNodeId = expectedStartLineNumber.toString();

    const mockedPerformInlineStatementCtx = createMockedParserRuleCtx(
      sinon.createStubInstance(PerformInlineStatementContext),
      "",
      expectedStartLineNumber,
      expectedEndLineNumber
    ) as PerformInlineStatementContext;

    initPerformInlineStatementCtx(
      mockedPerformInlineStatementCtx,
      expectedNodeName
    );

    const caller = "1000-INIT";
    const mockedParagraphCtx: ParagraphContext = createMockedParagraphCtx(
      caller,
      0,
      0
    ) as ParagraphContext;
    setParent(mockedPerformInlineStatementCtx, mockedParagraphCtx);

    visitor.visitPerformInlineStatement(mockedPerformInlineStatementCtx);

    const loopNode = visitor.nodes[0];

    expect(loopNode.label).to.equal(expectedNodeName);
    expect(loopNode.id).to.equal(expectedNodeId);
    expect(loopNode.startLineNumber).to.equal(expectedStartLineNumber);
    expect(loopNode.endLineNumber).to.equal(expectedEndLineNumber);
    expect(loopNode.type).to.equal(NodeType.LOOP);
    expect(visitor.callerToCalleesMap.get(caller)).to.have.members([
      expectedNodeId,
    ]);
    expect(visitor.calleeToCallersMap.get(expectedNodeId)).to.have.members([
      caller,
    ]);
  });

  test("visitPerformInlineStatement call visitChildren once at the end", function () {
    const visitChildrenStub = sinon.stub(visitor, "visitChildren");

    const mockedPerformInlineStatementCtx = createMockedParserRuleCtx(
      sinon.createStubInstance(PerformInlineStatementContext),
      "",
      0,
      0
    ) as PerformInlineStatementContext;

    initPerformInlineStatementCtx(mockedPerformInlineStatementCtx, "");

    visitor.visitPerformInlineStatement(mockedPerformInlineStatementCtx);

    expect(visitChildrenStub).to.have.been.calledOnce;
  });

  function createLastNodeCtx(): ParserRuleContext {
    const stopNode = sinon.createStubInstance(ParserRuleContext);
    const token: Token = {
      type: Token.EOF,
    } as Token;
    defineProperty(stopNode, "stop", token);
    return stopNode;
  }

  function getEndNode(): Node {
    return {
      id: "200",
      callers: [],
      callees: [],
      startLineNumber: 200,
      endLineNumber: 200,
      label: "0000-END",
      type: NodeType.END,
    };
  }

  test("when the last node visited, throw error if the start node not found in the visitor nodes", function () {
    const endNode: Node = getEndNode();
    visitor.nodes = [endNode];

    const lastNode = createLastNodeCtx();

    expect(() => visitor.visitChildren(lastNode)).to.throw(
      "Missing start or end node"
    );
  });

  function getStartNode(): Node {
    return {
      id: "100",
      callers: [],
      callees: [],
      startLineNumber: 100,
      endLineNumber: 200,
      label: "0000-START",
      type: NodeType.START,
    };
  }

  test("when the last node visited, throw error if the end node not found in the visitor nodes", function () {
    const startNode: Node = getStartNode();

    visitor.nodes = [startNode];

    const lastNode = createLastNodeCtx();

    expect(() => visitor.visitChildren(lastNode)).to.throw(
      "Missing start or end node"
    );
  });

  test("when the last node visited, throw error if both start node and end node not found in the visitor nodes", function () {
    visitor.nodes = [];

    const lastNode = createLastNodeCtx();

    expect(() => visitor.visitChildren(lastNode)).to.throw(
      "Missing start or end node"
    );
  });

  test("when the last node visited, the normal node with no caller will be removed", function () {
    const startNode: Node = getStartNode();
    const endNode: Node = getEndNode();
    const normalNodeLabelWithNoCaller = "1000-INIT";

    const normalNodeWithNoCaller: Node = {
      id: "400",
      callers: [],
      callees: [],
      startLineNumber: 400,
      endLineNumber: 500,
      label: normalNodeLabelWithNoCaller,
      type: NodeType.NORMAL,
    };

    visitor.calleeToCallersMap.set(endNode.label, [startNode.label]);
    visitor.nodes = [startNode, endNode, normalNodeWithNoCaller];

    const lastNode = createLastNodeCtx();

    visitor.visitChildren(lastNode);

    expect(visitor.nodes.length).to.equal(2);
    expect(visitor.nodes).to.have.members([startNode, endNode]);
  });

  test("when the last node visited, the condition node with no caller will be removed", function () {
    const startNode: Node = getStartNode();
    const endNode: Node = getEndNode();
    const conditionNodeLabelWithNoCaller = "IF OFFICIAL-RATE EQUALS ZEROES";

    const conditionNodeWithNoCaller: Node = {
      id: "400",
      callers: [],
      callees: [],
      startLineNumber: 400,
      endLineNumber: 500,
      label: conditionNodeLabelWithNoCaller,
      type: NodeType.CONDITION,
    };

    visitor.calleeToCallersMap.set(endNode.label, [startNode.label]);
    visitor.nodes = [startNode, endNode, conditionNodeWithNoCaller];

    const lastNode = createLastNodeCtx();

    visitor.visitChildren(lastNode);

    expect(visitor.nodes.length).to.equal(2);
    expect(visitor.nodes).to.have.members([startNode, endNode]);
  });

  test("when the last node visited, the loop node with no caller will be removed", function () {
    const startNode: Node = getStartNode();
    const endNode: Node = getEndNode();
    const loopNodeLabelWithNoCaller = "PERFORM UNTIL SQLCODE = CC-NOT-FOUND";

    const loopNodeWithNoCaller: Node = {
      id: "400",
      callers: [],
      callees: [],
      startLineNumber: 400,
      endLineNumber: 500,
      label: loopNodeLabelWithNoCaller,
      type: NodeType.LOOP,
    };

    visitor.calleeToCallersMap.set(endNode.label, [startNode.label]);
    visitor.nodes = [startNode, endNode, loopNodeWithNoCaller];

    const lastNode = createLastNodeCtx();

    visitor.visitChildren(lastNode);

    expect(visitor.nodes.length).to.equal(2);
    expect(visitor.nodes).to.have.members([startNode, endNode]);
  });

  test("when the last node visited, the callees of the node with no caller will be removed if only has one caller", function () {
    const startNode: Node = getStartNode();
    const endNode: Node = getEndNode();
    const normalNodeLabelWithNoCaller = "1000-INIT";

    const normalNodeWithNoCaller: Node = {
      id: "700",
      callers: [],
      callees: [],
      startLineNumber: 700,
      endLineNumber: 800,
      label: normalNodeLabelWithNoCaller,
      type: NodeType.NORMAL,
    };

    const calleeNodeWithOneCaller: Node = {
      id: "900",
      callers: [],
      callees: [],
      startLineNumber: 900,
      endLineNumber: 1000,
      label: "1100-TEST-INIT",
      type: NodeType.NORMAL,
    };

    const calleeNodeWithMultipleCaller: Node = {
      id: "1000",
      callers: [],
      callees: [],
      startLineNumber: 1000,
      endLineNumber: 1100,
      label: "1200-TEST-INIT",
      type: NodeType.NORMAL,
    };

    visitor.calleeToCallersMap.set(endNode.label, [startNode.label]);
    visitor.calleeToCallersMap.set(calleeNodeWithOneCaller.label, [
      normalNodeWithNoCaller.label,
    ]);
    visitor.calleeToCallersMap.set(calleeNodeWithMultipleCaller.label, [
      startNode.label,
      normalNodeWithNoCaller.label,
    ]);
    visitor.callerToCalleesMap.set(startNode.label, [
      calleeNodeWithMultipleCaller.label,
      endNode.label,
    ]);
    visitor.callerToCalleesMap.set(normalNodeWithNoCaller.label, [
      calleeNodeWithOneCaller.label,
      calleeNodeWithMultipleCaller.label,
    ]);
    visitor.nodes = [
      startNode,
      endNode,
      normalNodeWithNoCaller,
      calleeNodeWithOneCaller,
      calleeNodeWithMultipleCaller,
    ];

    const lastNode = createLastNodeCtx();

    visitor.visitChildren(lastNode);

    expect(visitor.nodes.length).to.equal(3);
    expect(visitor.nodes).to.have.members([
      startNode,
      calleeNodeWithMultipleCaller,
      endNode,
    ]);
  });

  test("when the last node visited, the callees of the node with no caller will be removed RECURSIVELY if only has one caller", function () {
    const startNode: Node = getStartNode();
    const endNode: Node = getEndNode();
    const normalNodeLabelWithNoCaller = "1000-INIT";

    const normalNodeWithNoCaller: Node = {
      id: "700",
      callers: [],
      callees: [],
      startLineNumber: 700,
      endLineNumber: 800,
      label: normalNodeLabelWithNoCaller,
      type: NodeType.NORMAL,
    };

    const calleeNodeWithOneCaller: Node = {
      id: "800",
      callers: [],
      callees: [],
      startLineNumber: 800,
      endLineNumber: 900,
      label: "1100-TEST-INIT",
      type: NodeType.NORMAL,
    };

    const calleeNodeWithOneCaller2: Node = {
      id: "900",
      callers: [],
      callees: [],
      startLineNumber: 900,
      endLineNumber: 1000,
      label: "1200-TEST-INIT",
      type: NodeType.NORMAL,
    };

    visitor.calleeToCallersMap.set(endNode.label, [startNode.label]);
    visitor.calleeToCallersMap.set(calleeNodeWithOneCaller.label, [
      normalNodeWithNoCaller.label,
    ]);
    visitor.calleeToCallersMap.set(calleeNodeWithOneCaller2.label, [
      calleeNodeWithOneCaller.label,
    ]);
    visitor.callerToCalleesMap.set(startNode.label, [endNode.label]);
    visitor.callerToCalleesMap.set(normalNodeWithNoCaller.label, [
      calleeNodeWithOneCaller.label,
    ]);
    visitor.callerToCalleesMap.set(calleeNodeWithOneCaller.label, [
      calleeNodeWithOneCaller2.label,
    ]);
    visitor.nodes = [
      startNode,
      endNode,
      normalNodeWithNoCaller,
      calleeNodeWithOneCaller,
      calleeNodeWithOneCaller2,
    ];

    const lastNode = createLastNodeCtx();

    visitor.visitChildren(lastNode);

    expect(visitor.nodes.length).to.equal(2);
    expect(visitor.nodes).to.have.members([startNode, endNode]);
  });

  test("callers and callees of the node will not be populated unless the last node visisted", function () {
    const startNode: Node = getStartNode();
    const endNode: Node = getEndNode();
    const normalNodeLabel = "1000-INIT";

    const normalNode: Node = {
      id: "400",
      callers: [],
      callees: [],
      startLineNumber: 400,
      endLineNumber: 500,
      label: normalNodeLabel,
      type: NodeType.NORMAL,
    };

    visitor.calleeToCallersMap.set(normalNode.label, [startNode.label]);
    visitor.calleeToCallersMap.set(endNode.label, [startNode.label]);
    visitor.callerToCalleesMap.set(startNode.label, [
      normalNode.label,
      endNode.label,
    ]);
    visitor.nodes = [startNode, endNode, normalNode];

    visitor.visitChildren(sinon.createStubInstance(ParserRuleContext));

    expect(normalNode.callees).to.be.empty;
    expect(normalNode.callers).to.be.empty;
  });

  test("when the last node visisted, callers and callees of the normal node are populated correctly", function () {
    const startNode: Node = getStartNode();
    const endNode: Node = getEndNode();

    const normalNode: Node = {
      id: "700",
      callers: [],
      callees: [],
      startLineNumber: 700,
      endLineNumber: 750,
      label: "1000-INIT",
      type: NodeType.NORMAL,
    };
    const normalNodeCallee: Node = {
      id: "800",
      callers: [],
      callees: [],
      startLineNumber: 800,
      endLineNumber: 850,
      label: "2000-PROCESS",
      type: NodeType.NORMAL,
    };

    visitor.calleeToCallersMap.set(normalNode.label, [startNode.label]);
    visitor.calleeToCallersMap.set(normalNodeCallee.label, [normalNode.label]);
    visitor.calleeToCallersMap.set(endNode.label, [startNode.label]);

    visitor.callerToCalleesMap.set(normalNode.label, [normalNodeCallee.label]);
    visitor.callerToCalleesMap.set(startNode.label, [
      normalNode.label,
      endNode.label,
    ]);
    visitor.nodes = [startNode, endNode, normalNode, normalNodeCallee];

    const lastNode = createLastNodeCtx();
    visitor.visitChildren(lastNode);

    expect(normalNode.callees).to.have.members([normalNodeCallee.id]);
    expect(normalNode.callers).to.have.members([startNode.id]);
    expect(normalNodeCallee.callers).to.have.members([normalNode.id]);
    expect(startNode.callees).to.have.members([normalNode.id, endNode.id]);
    expect(endNode.callers).to.have.members([startNode.id]);
  });

  test("when the last node visisted, callers of the condition node are populated correctly", function () {
    const startNode: Node = getStartNode();
    const endNode: Node = getEndNode();
    const conditionNodeId = "700";

    const conditionNode: Node = {
      id: conditionNodeId,
      callers: [],
      callees: [],
      startLineNumber: 700,
      endLineNumber: 750,
      label: "IF OFFICIAL-RATE EQUALS ZEROES",
      type: NodeType.CONDITION,
    };

    visitor.calleeToCallersMap.set(conditionNode.id, [startNode.label]);
    visitor.calleeToCallersMap.set(endNode.label, [startNode.label]);
    visitor.callerToCalleesMap.set(startNode.label, [
      conditionNode.id,
      endNode.label,
    ]);
    visitor.nodes = [startNode, endNode, conditionNode];

    const lastNode = createLastNodeCtx();
    visitor.visitChildren(lastNode);

    expect(conditionNode.callers).to.have.members([startNode.id]);
    expect(startNode.callees).to.have.members([conditionNode.id, endNode.id]);
    expect(endNode.callers).to.have.members([startNode.id]);
  });

  test("when the last node visisted, callers of the else node are populated correctly", function () {
    const startNode: Node = getStartNode();
    const endNode: Node = getEndNode();
    const elseNodeId = "700";
    const elseNodeLabel = "ELSE";

    const elseNode: Node = {
      id: elseNodeId,
      callers: [],
      callees: [],
      startLineNumber: 700,
      endLineNumber: 750,
      label: elseNodeLabel,
      type: NodeType.CONDITION_ELSE,
    };

    visitor.calleeToCallersMap.set(elseNode.id, [startNode.label]);
    visitor.calleeToCallersMap.set(endNode.label, [startNode.label]);
    visitor.callerToCalleesMap.set(startNode.label, [
      elseNode.id,
      endNode.label,
    ]);
    visitor.nodes = [startNode, endNode, elseNode];

    const lastNode = createLastNodeCtx();
    visitor.visitChildren(lastNode);

    expect(elseNode.callers).to.have.members([startNode.id]);
    expect(startNode.callees).to.have.members([elseNode.id, endNode.id]);
    expect(endNode.callers).to.have.members([startNode.id]);
  });

  test("when the last node visisted, callers of the loop node are populated correctly", function () {
    const startNode: Node = getStartNode();
    const endNode: Node = getEndNode();
    const loopNodeId = "700";

    const loopNode: Node = {
      id: loopNodeId,
      callers: [],
      callees: [],
      startLineNumber: 700,
      endLineNumber: 750,
      label: "PERFORM UNTIL SQLCODE = CC-NOT-FOUND",
      type: NodeType.LOOP,
    };

    visitor.calleeToCallersMap.set(loopNode.id, [startNode.label]);
    visitor.calleeToCallersMap.set(endNode.label, [startNode.label]);
    visitor.callerToCalleesMap.set(startNode.label, [
      loopNode.id,
      endNode.label,
    ]);
    visitor.nodes = [startNode, endNode, loopNode];

    const lastNode = createLastNodeCtx();
    visitor.visitChildren(lastNode);

    expect(loopNode.callers).to.have.members([startNode.id]);
    expect(startNode.callees).to.have.members([loopNode.id, endNode.id]);
    expect(endNode.callers).to.have.members([startNode.id]);
  });
});
