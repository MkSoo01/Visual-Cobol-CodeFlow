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
import { TerminalNode } from "antlr4ts/tree/TerminalNode";

chai.use(sinonChai);
const expect = chai.expect;

suite("Tests for Control Flow Visitor", () => {
  let visitor: ControlFlowVisitor;

  setup(async function () {
    visitor = new ControlFlowVisitor();
  });

  function formNode(
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

  function defineProperty(object: any, property: string, value: any) {
    Object.defineProperty(object, property, {
      get: () => value,
    });
  }

  function createStubParserRuleCtx(
    ctx: ParserRuleContext,
    text: string,
    startLineNumber: number,
    endLineNumber: number
  ): ParserRuleContext {
    const stubCtx = ctx;

    const stubStartToken: Token = {
      line: startLineNumber,
    } as Token;

    const stubStopToken: Token = {
      line: endLineNumber,
    } as Token;

    defineProperty(stubCtx, "start", stubStartToken);
    defineProperty(stubCtx, "stop", stubStopToken);
    defineProperty(stubCtx, "text", text);

    return stubCtx;
  }

  function createStubParagraphCtx(
    paragraphName: string,
    startLineNumber: number,
    endLineNumber: number
  ): ParagraphContext {
    const stubCtx = createStubParserRuleCtx(
      sinon.createStubInstance(ParagraphContext),
      "",
      startLineNumber,
      endLineNumber
    ) as ParagraphContext;

    const stubParagraphName = createStubParserRuleCtx(
      sinon.createStubInstance(ParagraphNameContext),
      paragraphName,
      startLineNumber,
      startLineNumber
    ) as ParagraphNameContext;

    stubCtx.paragraphName = () => stubParagraphName;

    return stubCtx;
  }

  function setParent(child: ParserRuleContext, parent: ParserRuleContext) {
    defineProperty(child, "parent", parent);
  }

  function createStubPerformProcedureStatementCtx(
    procedureName: string,
    caller: ParserRuleContext
  ): PerformProcedureStatementContext {
    const stubCtx = sinon.createStubInstance(PerformProcedureStatementContext);
    const stubProcedureNameCtx = createStubParserRuleCtx(
      sinon.createStubInstance(ProcedureNameContext),
      procedureName,
      0,
      0
    ) as ProcedureNameContext;

    stubCtx.procedureName.returns(stubProcedureNameCtx);
    const stubSentenceCtx = sinon.createStubInstance(SentenceContext);
    const stubStatementCtx = sinon.createStubInstance(StatementContext);
    const stubPerformStatementCtx = sinon.createStubInstance(
      PerformStatementContext
    );

    setParent(stubCtx, stubPerformStatementCtx);
    setParent(stubPerformStatementCtx, stubStatementCtx);
    setParent(stubStatementCtx, stubSentenceCtx);
    setParent(stubSentenceCtx, caller);

    return stubCtx;
  }

  function initIfStatementCtx(
    stubIfStatementCtx: IfStatementContext,
    ifStatementText: string
  ) {
    const textArray = ifStatementText.split(" ");
    textArray.shift();

    const stubCobolWordTerminalNode = sinon.createStubInstance(TerminalNode);
    defineProperty(stubCobolWordTerminalNode, "text", textArray[0]);

    const stubTerminalNode = sinon.createStubInstance(TerminalNode);
    defineProperty(stubTerminalNode, "text", textArray[1]);

    const stubFigurativeConstantTerminalNode =
      sinon.createStubInstance(TerminalNode);
    defineProperty(
      stubFigurativeConstantTerminalNode,
      "text",
      textArray.slice(2).join(" ")
    );

    const stubConditionCtx = sinon.createStubInstance(ConditionContext);
    const stubCombinableConditionCtx = sinon.createStubInstance(
      CombinableConditionContext
    );
    const stubSimpleConditionCtx = sinon.createStubInstance(
      SimpleConditionContext
    );
    const stubClassConditionCtx = sinon.createStubInstance(
      ClassConditionContext
    );
    const stubIdentifierCtx = sinon.createStubInstance(IdentifierContext);
    const stubFigurativeConstantCtx = sinon.createStubInstance(
      FigurativeConstantContext
    );

    defineProperty(stubConditionCtx, "childCount", 1);
    defineProperty(stubCombinableConditionCtx, "childCount", 1);
    defineProperty(stubSimpleConditionCtx, "childCount", 1);
    defineProperty(stubClassConditionCtx, "childCount", 3);
    defineProperty(stubIdentifierCtx, "childCount", 1);
    defineProperty(stubFigurativeConstantCtx, "childCount", 1);

    stubConditionCtx.getChild.withArgs(0).returns(stubCombinableConditionCtx);
    stubCombinableConditionCtx.getChild
      .withArgs(0)
      .returns(stubSimpleConditionCtx);
    stubSimpleConditionCtx.getChild.withArgs(0).returns(stubClassConditionCtx);
    stubClassConditionCtx.getChild.withArgs(0).returns(stubIdentifierCtx);
    stubClassConditionCtx.getChild.withArgs(1).returns(stubTerminalNode);
    stubClassConditionCtx.getChild
      .withArgs(2)
      .returns(stubFigurativeConstantCtx);
    stubIdentifierCtx.getChild.withArgs(0).returns(stubCobolWordTerminalNode);
    stubFigurativeConstantCtx.getChild
      .withArgs(0)
      .returns(stubFigurativeConstantTerminalNode);

    const stubIfTerminalNode: TerminalNode = {
      text: "IF",
    } as TerminalNode;

    const stubEndIfTerminalNode: TerminalNode = {
      text: "END-IF",
    } as TerminalNode;

    stubIfStatementCtx.IF = () => stubIfTerminalNode;
    stubIfStatementCtx.END_IF = () => stubEndIfTerminalNode;
    stubIfStatementCtx.condition = () => stubConditionCtx;
  }

  function initPerformInlineStatementCtx(
    stubPerformInlineStatementCtx: PerformInlineStatementContext,
    performInlineStatementText: string
  ) {
    const stubPerformTypeCtx = sinon.createStubInstance(PerformTypeContext);
    const stubPerformUntilCtx = sinon.createStubInstance(PerformUntilContext);
    stubPerformInlineStatementCtx.performType = () => stubPerformTypeCtx;
    stubPerformTypeCtx.performUntil.returns(stubPerformUntilCtx);

    const textArray = performInlineStatementText.split(" ");
    textArray.shift();
    const untilTerminalNode = sinon.createStubInstance(TerminalNode);
    defineProperty(untilTerminalNode, "text", textArray[0]);
    const otherTerminalNode = sinon.createStubInstance(TerminalNode);
    defineProperty(otherTerminalNode, "text", textArray.splice(1).join(" "));
    const stubConditionCtx = sinon.createStubInstance(ConditionContext);
    const stubCombinableConditionCtx = sinon.createStubInstance(
      CombinableConditionContext
    );
    const stubSimpleConditionCtx = sinon.createStubInstance(
      SimpleConditionContext
    );
    const stubRelationConditionCtx = sinon.createStubInstance(
      RelationConditionContext
    );
    stubPerformUntilCtx.getChild.withArgs(0).returns(untilTerminalNode);
    stubPerformUntilCtx.getChild.withArgs(1).returns(stubConditionCtx);
    defineProperty(stubPerformUntilCtx, "childCount", 2);
    stubConditionCtx.getChild.withArgs(0).returns(stubCombinableConditionCtx);
    defineProperty(stubConditionCtx, "childCount", 1);
    stubCombinableConditionCtx.getChild
      .withArgs(0)
      .returns(stubSimpleConditionCtx);
    defineProperty(stubCombinableConditionCtx, "childCount", 1);
    stubSimpleConditionCtx.getChild
      .withArgs(0)
      .returns(stubRelationConditionCtx);
    defineProperty(stubSimpleConditionCtx, "childCount", 1);
    stubRelationConditionCtx.getChild.withArgs(0).returns(otherTerminalNode);
    defineProperty(stubRelationConditionCtx, "childCount", 1);
  }

  test("the start node data to be captured correctly", function () {
    const expectedNodeName = "0000-MAIN-ROUTINE";
    const expectedStartLineNumber = 235;
    const expectedEndLineNumber = 256;
    const stubCtx = createStubParagraphCtx(
      expectedNodeName,
      expectedStartLineNumber,
      expectedEndLineNumber
    );

    visitor.visitParagraph(stubCtx);

    expect(visitor.nodes.length).to.equal(1);

    const actual = visitor.nodes[0];
    const expected = formNode(
      expectedStartLineNumber.toString(),
      expectedNodeName,
      NodeType.START,
      expectedStartLineNumber,
      expectedEndLineNumber
    );
    expect(actual).to.deep.equal(expected);
  });

  test("the normal node data to be captured correctly", function () {
    const expectedNodeName = "1000-INIT";
    const expectedStartLineNumber = 265;
    const expectedEndLineNumber = 275;
    const stubCtx = createStubParagraphCtx(
      expectedNodeName,
      expectedStartLineNumber,
      expectedEndLineNumber
    );

    visitor.visitParagraph(stubCtx);

    const actual = visitor.nodes[0];
    const expected = formNode(
      expectedStartLineNumber.toString(),
      expectedNodeName,
      NodeType.NORMAL,
      expectedStartLineNumber,
      expectedEndLineNumber
    );

    expect(actual).to.deep.equal(expected);
  });

  test("visitParagraph call visitChildren once at the end", function () {
    const visitChildrenStub = sinon.stub(visitor, "visitChildren");

    const expectedNodeName = "1000-INIT";
    const expectedStartLineNumber = 265;
    const expectedEndLineNumber = 275;
    const stubCtx = createStubParagraphCtx(
      expectedNodeName,
      expectedStartLineNumber,
      expectedEndLineNumber
    );

    visitor.visitParagraph(stubCtx);

    expect(visitChildrenStub).to.have.been.calledOnce;
  });

  test("caller and callee to be captured correctly in visitPerformProcedureStatement", function () {
    const callerNodeName = "0000-MAIN-ROUTINE";
    const callerStartLineNumber = 235;
    const callerEndLineNumber = 256;
    const callerId = callerStartLineNumber.toString();
    const stubParagraphCtx: ParagraphContext = createStubParagraphCtx(
      callerNodeName,
      callerStartLineNumber,
      callerEndLineNumber
    ) as unknown as ParagraphContext;

    const procedureName = "1000-INIT";
    const stubCtx = createStubPerformProcedureStatementCtx(
      procedureName,
      stubParagraphCtx
    );

    visitor.visitPerformProcedureStatement(stubCtx);

    expect(
      visitor.calleeToCallersMap.get(procedureName),
      "Callee To Callers Map"
    ).to.have.members([callerId]);
    expect(
      visitor.callerToCalleesMap.get(callerId),
      "Caller To Callees Map"
    ).to.have.members([procedureName]);
  });

  test("caller (conditionNode) and callee to be captured correctly in visitPerformProcedureStatement", function () {
    const callerStartLineNumber = 235;
    const callerEndLineNumber = 256;
    const callerId = callerStartLineNumber.toString();
    let stubConditionCtx = createStubParserRuleCtx(
      sinon.createStubInstance(IfStatementContext),
      "",
      callerStartLineNumber,
      callerEndLineNumber
    ) as IfStatementContext;

    const procedureName = "1000-INIT";
    const stubCtx = createStubPerformProcedureStatementCtx(
      procedureName,
      stubConditionCtx
    );
  });

  test("caller (loop node) and callee to be captured correctly in visitPerformProcedureStatement", function () {
    const callerStartLineNumber = 235;
    const callerEndLineNumber = 256;
    const callerId = callerStartLineNumber.toString();
    let stubPerformInlineCtx = createStubParserRuleCtx(
      sinon.createStubInstance(PerformInlineStatementContext),
      "",
      callerStartLineNumber,
      callerEndLineNumber
    ) as PerformInlineStatementContext;

    const procedureName = "1000-INIT";
    const stubCtx = createStubPerformProcedureStatementCtx(
      procedureName,
      stubPerformInlineCtx
    );

    visitor.visitPerformProcedureStatement(stubCtx);

    expect(
      visitor.calleeToCallersMap.get(procedureName),
      "Callee To Callers Map"
    ).to.have.members([callerId]);
    expect(
      visitor.callerToCalleesMap.get(callerId),
      "Caller To Callees Map"
    ).to.have.members([procedureName]);
  });

  test("caller can have multiple callees", function () {
    const callerNodeName = "IF OFFICIAL-RATE EQUALS ZEROES";
    const callerStartLineNumber = 235;
    const callerEndLineNumber = 256;
    const callerId = callerStartLineNumber.toString();
    const stubParagraphCtx: ParagraphContext = createStubParagraphCtx(
      callerNodeName,
      callerStartLineNumber,
      callerEndLineNumber
    ) as unknown as ParagraphContext;

    const procedureName1 = "1000-INIT";
    const stubCtx1 = createStubPerformProcedureStatementCtx(
      procedureName1,
      stubParagraphCtx
    );

    const procedureName2 = "2000-PROCESS";
    const stubCtx2 = createStubPerformProcedureStatementCtx(
      procedureName2,
      stubParagraphCtx
    );

    visitor.visitPerformProcedureStatement(stubCtx1);
    visitor.visitPerformProcedureStatement(stubCtx2);

    expect(
      visitor.callerToCalleesMap.get(callerId),
      "Caller to Callees Map"
    ).to.have.members([procedureName1, procedureName2]);
    expect(
      visitor.calleeToCallersMap.get(procedureName1),
      "Callee to Caller Map - Procedure1"
    ).to.have.members([callerId]);
    expect(
      visitor.calleeToCallersMap.get(procedureName2),
      "Callee to Caller Map - Procedure2"
    ).to.have.members([callerId]);
  });

  test("callee can have multiple callers", function () {
    const caller1Name = "0000-MAIN-ROUTINE";
    const caller1StartLineNumber = 235;
    const caller1EndLineNumber = 256;
    const caller1ID = caller1StartLineNumber.toString();
    const caller2Name = "1000-INIT";
    const caller2StartLineNumber = 300;
    const caller2EndLineNumber = 450;
    const caller2ID = caller2StartLineNumber.toString();
    const procedureName = "2000-INIT";

    const stubParagraphCtx1: ParagraphContext = createStubParagraphCtx(
      caller1Name,
      caller1StartLineNumber,
      caller1EndLineNumber
    ) as unknown as ParagraphContext;

    const stubParagraphCtx2: ParagraphContext = createStubParagraphCtx(
      caller2Name,
      caller2StartLineNumber,
      caller2EndLineNumber
    ) as unknown as ParagraphContext;

    const stubCtx1 = createStubPerformProcedureStatementCtx(
      procedureName,
      stubParagraphCtx1
    );

    const stubCtx2 = createStubPerformProcedureStatementCtx(
      procedureName,
      stubParagraphCtx2
    );

    visitor.visitPerformProcedureStatement(stubCtx1);
    visitor.visitPerformProcedureStatement(stubCtx2);

    expect(
      visitor.calleeToCallersMap.get(procedureName),
      "Callee to Callers Map"
    ).to.have.members([caller1ID, caller2ID]);
    expect(
      visitor.callerToCalleesMap.get(caller1ID),
      "Caller to Callees Map - Caller1"
    ).to.have.members([procedureName]);
    expect(
      visitor.callerToCalleesMap.get(caller2ID),
      "Caller to Callees Map - Caller2"
    ).to.have.members([procedureName]);
  });

  test("visitPerformProcedureStatement call visitChildren once at the end", function () {
    const visitChildrenStub = sinon.stub(visitor, "visitChildren");

    const callerNodeName = "0000-MAIN-ROUTINE";
    const callerStartLineNumber = 235;
    const callerEndLineNumber = 256;
    const stubParagraphCtx: ParagraphContext = createStubParagraphCtx(
      callerNodeName,
      callerStartLineNumber,
      callerEndLineNumber
    ) as unknown as ParagraphContext;

    const procedureName = "1000-INIT";
    const stubCtx = createStubPerformProcedureStatementCtx(
      procedureName,
      stubParagraphCtx
    );

    visitor.visitPerformProcedureStatement(stubCtx);

    expect(visitChildrenStub).to.have.been.calledOnce;
  });

  test("the condition node data to be captured correctly", function () {
    const expectedNodeName = "IF OFFICIAL-RATE EQUALS ZEROES";
    const expectedStartLineNumber = 245;
    const expectedEndLineNumber = 253;
    const expectedNodeId = expectedStartLineNumber.toString();

    let stubCtx = createStubParserRuleCtx(
      sinon.createStubInstance(IfStatementContext),
      "",
      expectedStartLineNumber,
      expectedEndLineNumber
    ) as IfStatementContext;

    initIfStatementCtx(stubCtx, expectedNodeName);

    visitor.visitIfStatement(stubCtx);

    const actual = visitor.nodes[0];
    const expected = formNode(
      expectedNodeId,
      expectedNodeName,
      NodeType.CONDITION,
      expectedStartLineNumber,
      expectedEndLineNumber
    );

    expect(actual).to.deep.equal(expected);
  });

  test("visitIfStatement capture caller and callee data correctly", function () {
    const conditionNodeName = "IF OFFICIAL-RATE EQUALS ZEROES";
    const condtionStartLineNumber = 245;
    const condtionEndLineNumber = 253;
    const condtionNodeId = condtionStartLineNumber.toString();
    const caller = "1000-INIT";
    const callerStartLineNumber = 100;
    const callerEndLineNumber = 200;
    const callerID = callerStartLineNumber.toString();
    const stubParagraphCtx: ParagraphContext = createStubParagraphCtx(
      caller,
      callerStartLineNumber,
      callerEndLineNumber
    ) as ParagraphContext;

    let stubCtx = createStubParserRuleCtx(
      sinon.createStubInstance(IfStatementContext),
      "",
      condtionStartLineNumber,
      condtionEndLineNumber
    ) as IfStatementContext;

    initIfStatementCtx(stubCtx, conditionNodeName);
    setParent(stubCtx, stubParagraphCtx);

    visitor.visitIfStatement(stubCtx);

    expect(
      visitor.callerToCalleesMap.get(callerID),
      "Caller to Callees Map"
    ).to.have.members([condtionNodeId]);
    expect(
      visitor.calleeToCallersMap.get(condtionNodeId),
      "Callee to Caller Map"
    ).to.have.members([callerID]);
  });

  test("visitIfStatement call visitChildren once at the end", function () {
    const visitChildrenStub = sinon.stub(visitor, "visitChildren");

    let stubCtx = createStubParserRuleCtx(
      sinon.createStubInstance(IfStatementContext),
      "",
      0,
      0
    ) as IfStatementContext;

    initIfStatementCtx(stubCtx, "");

    visitor.visitIfStatement(stubCtx);

    expect(visitChildrenStub).to.have.been.calledOnce;
  });

  test("the Else node data to be captured correctly", function () {
    const expectedNodeName = "ELSE";
    const expectedStartLineNumber = 245;
    const expectedEndLineNumber = 253;
    const expectedNodeId = expectedStartLineNumber.toString();
    const conditionNodeStartLineNumber = 230;
    const conditionNodeEndLineNumber = 260;
    const conditionNodeId = conditionNodeStartLineNumber.toString();

    let stubConditionCtx = createStubParserRuleCtx(
      sinon.createStubInstance(IfStatementContext),
      "",
      conditionNodeStartLineNumber,
      conditionNodeEndLineNumber
    ) as IfStatementContext;

    const stubIfElseCtx = createStubParserRuleCtx(
      sinon.createStubInstance(IfElseContext),
      "",
      expectedStartLineNumber,
      expectedEndLineNumber
    ) as IfElseContext;

    const stubElseTerminalNode: TerminalNode = {
      text: "ELSE",
    } as TerminalNode;

    stubIfElseCtx.ELSE = () => stubElseTerminalNode;

    setParent(stubIfElseCtx, stubConditionCtx);

    visitor.visitIfElse(stubIfElseCtx);

    const actual = visitor.nodes[0];
    const expected = formNode(
      expectedNodeId,
      expectedNodeName,
      NodeType.CONDITION_ELSE,
      expectedStartLineNumber,
      expectedEndLineNumber
    );

    expect(actual).to.deep.equal(expected);
    expect(
      visitor.callerToCalleesMap.get(conditionNodeId),
      "Caller to Callees Map"
    ).to.contain.members([actual.id]);
    expect(
      visitor.calleeToCallersMap.get(actual.id),
      "Callee to Callers Map"
    ).to.have.members([conditionNodeId]);
  });

  test("visitIfElse call visitChildren once at the end", function () {
    const startLineNumber = 245;
    const endLineNumber = 253;
    const visitChildrenStub = sinon.stub(visitor, "visitChildren");

    const stubIfElseCtx = createStubParserRuleCtx(
      sinon.createStubInstance(IfElseContext),
      "",
      startLineNumber,
      endLineNumber
    ) as IfElseContext;

    const stubElseTerminalNode: TerminalNode = {
      text: "ELSE",
    } as TerminalNode;

    stubIfElseCtx.ELSE = () => stubElseTerminalNode;

    visitor.visitIfElse(stubIfElseCtx);

    expect(visitChildrenStub).to.have.been.calledOnce;
  });

  test("the loop node data to be captured correctly", function () {
    const expectedNodeName = "PERFORM UNTIL SQLCODE = CC-NOT-FOUND";
    const expectedStartLineNumber = 245;
    const expectedEndLineNumber = 253;
    const expectedNodeId = expectedStartLineNumber.toString();

    const stubPerformInlineStatementCtx = createStubParserRuleCtx(
      sinon.createStubInstance(PerformInlineStatementContext),
      "",
      expectedStartLineNumber,
      expectedEndLineNumber
    ) as PerformInlineStatementContext;

    initPerformInlineStatementCtx(
      stubPerformInlineStatementCtx,
      expectedNodeName
    );

    const caller = "1000-INIT";
    const callerStartLineNumber = 100;
    const callerEndLineNumber = 200;
    const callerID = callerStartLineNumber.toString();
    const stubParagraphCtx: ParagraphContext = createStubParagraphCtx(
      caller,
      callerStartLineNumber,
      callerEndLineNumber
    ) as ParagraphContext;
    setParent(stubPerformInlineStatementCtx, stubParagraphCtx);

    visitor.visitPerformInlineStatement(stubPerformInlineStatementCtx);

    const actual = visitor.nodes[0];
    const expected = formNode(
      expectedNodeId,
      expectedNodeName,
      NodeType.LOOP,
      expectedStartLineNumber,
      expectedEndLineNumber
    );

    expect(actual).to.deep.equal(expected);
    expect(visitor.callerToCalleesMap.get(callerID)).to.have.members([
      expectedNodeId,
    ]);
    expect(visitor.calleeToCallersMap.get(expectedNodeId)).to.have.members([
      callerID,
    ]);
  });

  test("visitPerformInlineStatement call visitChildren once at the end", function () {
    const visitChildrenStub = sinon.stub(visitor, "visitChildren");

    const stubPerformInlineStatementCtx = createStubParserRuleCtx(
      sinon.createStubInstance(PerformInlineStatementContext),
      "",
      0,
      0
    ) as PerformInlineStatementContext;

    initPerformInlineStatementCtx(stubPerformInlineStatementCtx, "");

    visitor.visitPerformInlineStatement(stubPerformInlineStatementCtx);

    expect(visitChildrenStub).to.have.been.calledOnce;
  });

  function createEOF(): ParserRuleContext {
    const stopNode = sinon.createStubInstance(ParserRuleContext);
    const token: Token = {
      type: Token.EOF,
    } as Token;
    defineProperty(stopNode, "stop", token);
    return stopNode;
  }

  test("when visitChildren get EOF, throw error if the start node not found in the visitor nodes", function () {
    const eof = createEOF();

    expect(() => visitor.visitChildren(eof)).to.throw(
      "Missing start or end node"
    );
  });

  test("when visitChildren get EOF, callers and callees of the node are populated correctly", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);

    const normalNode = formNode("300", "1000-INIT", NodeType.NORMAL, 300, 400);
    const normalNodeCallee = formNode(
      "400",
      "2000-PROCESS",
      NodeType.NORMAL,
      300,
      400
    );

    visitor.callerToCalleesMap.set(startNode.id, [normalNode.label]);
    visitor.calleeToCallersMap.set(normalNode.label, [startNode.id]);
    visitor.callerToCalleesMap.set(normalNode.id, [normalNodeCallee.label]);
    visitor.calleeToCallersMap.set(normalNodeCallee.label, [normalNode.id]);
    visitor.nodes = [startNode, normalNode, normalNodeCallee];

    const eof = createEOF();
    visitor.visitChildren(eof);

    const expectedStartNode = structuredClone(startNode);
    const expectedNormalNode = structuredClone(normalNode);
    const expectedNormalNodeCallee = structuredClone(normalNodeCallee);
    expectedStartNode.callees = [normalNode.id];
    expectedNormalNode.callers = [startNode.id];
    expectedNormalNode.callees = [normalNodeCallee.id];
    expectedNormalNodeCallee.callers = [normalNode.id];

    expect(startNode).to.deep.equal(expectedStartNode);
    expect(normalNode).to.deep.equal(expectedNormalNode);
    expect(normalNodeCallee).to.deep.equal(expectedNormalNodeCallee);
  });

  test("callers and callees of the node will not be populated unless visitChildren get EOF", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const normalNodeLabel = "1000-INIT";

    const normalNode = formNode(
      "400",
      normalNodeLabel,
      NodeType.NORMAL,
      400,
      500
    );

    visitor.calleeToCallersMap.set(normalNode.label, [startNode.id]);
    visitor.callerToCalleesMap.set(startNode.id, [normalNode.label]);
    visitor.nodes = [startNode, normalNode];

    const notEOF = sinon.createStubInstance(ParserRuleContext);
    visitor.visitChildren(notEOF);

    expect(normalNode.callees, "callees").to.be.empty;
    expect(normalNode.callers, "callers").to.be.empty;
  });

  test("when visitChildren get EOF, the normal node with no caller will be removed", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const normalNodeLabelWithNoCaller = "1000-INIT";

    const normalNodeWithNoCaller = formNode(
      "400",
      normalNodeLabelWithNoCaller,
      NodeType.NORMAL,
      400,
      500
    );

    visitor.nodes = [startNode, normalNodeWithNoCaller];

    const eof = createEOF();

    visitor.visitChildren(eof);

    expect(visitor.nodes.length).to.equal(1);
    expect(visitor.nodes).to.have.members([startNode]);
  });

  test("when visitChildren get EOF, the callees will be removed if its caller is removed", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const normalNodeLabelWithNoCaller = "1000-INIT";

    const normalNodeWithNoCaller = formNode(
      "400",
      normalNodeLabelWithNoCaller,
      NodeType.NORMAL,
      400,
      500
    );

    const calleeNode = formNode(
      "501",
      "1100-TEST-INIT",
      NodeType.NORMAL,
      501,
      600
    );

    visitor.callerToCalleesMap.set(normalNodeWithNoCaller.id, [
      calleeNode.label,
    ]);
    visitor.calleeToCallersMap.set(calleeNode.label, [
      normalNodeWithNoCaller.id,
    ]);

    visitor.nodes = [startNode, normalNodeWithNoCaller, calleeNode];

    const eof = createEOF();

    visitor.visitChildren(eof);

    expect(visitor.nodes.length).to.equal(1);
    expect(visitor.nodes).to.have.members([startNode]);
  });

  test("when visitChildren get EOF, the descesdant callees will be removed RECURSIVELY if its ancestor caller is removed", function () {
    const startNode: Node = formNode(
      "100",
      "0000-START",
      NodeType.START,
      100,
      200
    );

    const ancestorNode = formNode(
      "200",
      "1000-INIT",
      NodeType.NORMAL,
      200,
      300
    );

    const calleeNode = formNode(
      "301",
      "1100-TEST-INIT",
      NodeType.NORMAL,
      301,
      400
    );

    const calleeNodeDescendant = formNode(
      "401",
      "1200-TEST-INIT",
      NodeType.NORMAL,
      401,
      500
    );

    visitor.callerToCalleesMap.set(ancestorNode.id, [calleeNode.id]);
    visitor.calleeToCallersMap.set(calleeNode.id, [ancestorNode.id]);
    visitor.callerToCalleesMap.set(calleeNode.id, [calleeNodeDescendant.id]);
    visitor.calleeToCallersMap.set(calleeNodeDescendant.id, [calleeNode.id]);
    visitor.nodes = [startNode, ancestorNode, calleeNode, calleeNodeDescendant];

    const eof = createEOF();

    visitor.visitChildren(eof);

    expect(visitor.nodes.length).to.equal(1);
    expect(visitor.nodes).to.have.members([startNode]);
  });

  test("when visitChildren get EOF, the condition node with no callee will be removed", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);

    const conditionNode = formNode(
      "400",
      "IF OFFICIAL-RATE EQUALS ZEROES",
      NodeType.CONDITION,
      400,
      500
    );

    visitor.callerToCalleesMap.set(startNode.label, [conditionNode.id]);
    visitor.calleeToCallersMap.set(conditionNode.id, [startNode.label]);

    visitor.nodes = [startNode, conditionNode];

    const eof = createEOF();
    visitor.visitChildren(eof);

    expect(visitor.nodes.length).to.equal(1);
    expect(visitor.nodes).to.have.members([startNode]);
  });

  test("when visitChildren get EOF, the condition node will be removed when there's no descendant is a normal node", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);

    const conditionNode = formNode(
      "400",
      "IF OFFICIAL-RATE EQUALS ZEROES",
      NodeType.CONDITION,
      400,
      800
    );

    const nestedConditionNode = formNode(
      "501",
      "IF OFFICIAL-RATE EQUALS ZEROES",
      NodeType.CONDITION,
      501,
      600
    );

    const nestedElseNode = formNode(
      "550",
      "ELSE",
      NodeType.CONDITION_ELSE,
      550,
      600
    );

    const elseNode = formNode("601", "ELSE", NodeType.CONDITION_ELSE, 601, 700);

    visitor.callerToCalleesMap.set(startNode.label, [conditionNode.id]);
    visitor.calleeToCallersMap.set(conditionNode.id, [startNode.label]);
    visitor.callerToCalleesMap.set(conditionNode.id, [
      nestedConditionNode.id,
      elseNode.id,
    ]);
    visitor.calleeToCallersMap.set(nestedConditionNode.id, [conditionNode.id]);
    visitor.calleeToCallersMap.set(elseNode.id, [conditionNode.id]);
    visitor.callerToCalleesMap.set(nestedConditionNode.id, [nestedElseNode.id]);
    visitor.calleeToCallersMap.set(nestedElseNode.id, [nestedConditionNode.id]);

    visitor.nodes = [
      startNode,
      conditionNode,
      nestedConditionNode,
      nestedElseNode,
      elseNode,
    ];

    const eof = createEOF();
    visitor.visitChildren(eof);

    expect(visitor.nodes.length).to.equal(1);
    expect(visitor.nodes).to.have.members([startNode]);
  });

  test("when visitChildren get EOF, the condition node will NOT be removed when there's a normal node as descendant", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);

    const conditionNode = formNode(
      "400",
      "IF OFFICIAL-RATE EQUALS ZEROES",
      NodeType.CONDITION,
      400,
      800
    );

    const nestedConditionNode = formNode(
      "501",
      "IF OFFICIAL-RATE EQUALS ZEROES",
      NodeType.CONDITION,
      501,
      600
    );

    const elseNode = formNode("601", "ELSE", NodeType.CONDITION_ELSE, 601, 700);
    const normalNodeDescendant = formNode(
      "900",
      "2000-PROCESS",
      NodeType.NORMAL,
      900,
      1000
    );

    visitor.callerToCalleesMap.set(startNode.label, [conditionNode.id]);
    visitor.calleeToCallersMap.set(conditionNode.id, [startNode.label]);
    visitor.callerToCalleesMap.set(conditionNode.id, [
      nestedConditionNode.id,
      elseNode.id,
    ]);
    visitor.calleeToCallersMap.set(nestedConditionNode.id, [conditionNode.id]);
    visitor.calleeToCallersMap.set(elseNode.id, [conditionNode.id]);
    visitor.callerToCalleesMap.set(nestedConditionNode.id, [
      normalNodeDescendant.label,
    ]);
    visitor.calleeToCallersMap.set(normalNodeDescendant.label, [
      nestedConditionNode.id,
    ]);

    visitor.nodes = [
      startNode,
      conditionNode,
      nestedConditionNode,
      normalNodeDescendant,
      elseNode,
    ];

    const eof = createEOF();
    visitor.visitChildren(eof);

    expect(visitor.nodes.length).to.equal(5);
    expect(visitor.nodes).to.have.members([
      startNode,
      conditionNode,
      nestedConditionNode,
      normalNodeDescendant,
      elseNode,
    ]);
  });

  test("when visitChildren get EOF, the condition node with no caller will be removed", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const conditionNodeLabelWithNoCaller = "IF OFFICIAL-RATE EQUALS ZEROES";

    const conditionNodeWithNoCaller = formNode(
      "400",
      conditionNodeLabelWithNoCaller,
      NodeType.CONDITION,
      400,
      500
    );
    const conditionNodeCallee = formNode(
      "501",
      "1000-INIT",
      NodeType.NORMAL,
      501,
      600
    );

    visitor.nodes = [startNode, conditionNodeWithNoCaller, conditionNodeCallee];
    visitor.callerToCalleesMap.set(conditionNodeWithNoCaller.id, [
      conditionNodeCallee.id,
    ]);
    visitor.calleeToCallersMap.set(conditionNodeCallee.id, [
      conditionNodeWithNoCaller.id,
    ]);

    const eof = createEOF();

    visitor.visitChildren(eof);

    expect(visitor.nodes.length).to.equal(1);
    expect(visitor.nodes).to.have.members([startNode]);
  });

  test("when visitChildren get EOF, the loop node with no callee will be removed", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);

    const loopNode = formNode(
      "400",
      "PERFORM UNTIL SQLCODE = CC-NOT-FOUND",
      NodeType.LOOP,
      400,
      500
    );

    visitor.callerToCalleesMap.set(startNode.label, [loopNode.id]);
    visitor.calleeToCallersMap.set(loopNode.id, [startNode.label]);

    visitor.nodes = [startNode, loopNode];

    const eof = createEOF();
    visitor.visitChildren(eof);

    expect(visitor.nodes.length).to.equal(1);
    expect(visitor.nodes).to.have.members([startNode]);
  });

  test("when visitChildren get EOF, the loop node will be removed when there's no descendant is a normal node", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);

    const loopNode = formNode(
      "400",
      "PERFORM UNTIL SQLCODE = CC-NOT-FOUND",
      NodeType.LOOP,
      400,
      800
    );

    const nestedConditionNode = formNode(
      "501",
      "IF OFFICIAL-RATE EQUALS ZEROES",
      NodeType.CONDITION,
      501,
      600
    );

    const nestedElseNode = formNode(
      "550",
      "ELSE",
      NodeType.CONDITION_ELSE,
      550,
      600
    );

    visitor.callerToCalleesMap.set(startNode.label, [loopNode.id]);
    visitor.calleeToCallersMap.set(loopNode.id, [startNode.label]);
    visitor.callerToCalleesMap.set(loopNode.id, [nestedConditionNode.id]);
    visitor.calleeToCallersMap.set(nestedConditionNode.id, [loopNode.id]);
    visitor.callerToCalleesMap.set(nestedConditionNode.id, [nestedElseNode.id]);
    visitor.calleeToCallersMap.set(nestedElseNode.id, [nestedConditionNode.id]);

    visitor.nodes = [startNode, loopNode, nestedConditionNode, nestedElseNode];

    const eof = createEOF();
    visitor.visitChildren(eof);

    expect(visitor.nodes.length).to.equal(1);
    expect(visitor.nodes).to.have.members([startNode]);
  });

  test("when visitChildren get EOF, the loop node will NOT be removed when there's a normal node as descendant", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);

    const loopNode = formNode(
      "400",
      "PERFORM UNTIL SQLCODE = CC-NOT-FOUND",
      NodeType.LOOP,
      400,
      800
    );

    const nestedConditionNode = formNode(
      "501",
      "IF OFFICIAL-RATE EQUALS ZEROES",
      NodeType.CONDITION,
      501,
      600
    );

    const normalNodeDescendant = formNode(
      "900",
      "2000-PROCESS",
      NodeType.NORMAL,
      900,
      1000
    );

    visitor.callerToCalleesMap.set(startNode.label, [loopNode.id]);
    visitor.calleeToCallersMap.set(loopNode.id, [startNode.label]);
    visitor.callerToCalleesMap.set(loopNode.id, [nestedConditionNode.id]);
    visitor.calleeToCallersMap.set(nestedConditionNode.id, [loopNode.id]);
    visitor.callerToCalleesMap.set(nestedConditionNode.id, [
      normalNodeDescendant.label,
    ]);
    visitor.calleeToCallersMap.set(normalNodeDescendant.label, [
      nestedConditionNode.id,
    ]);

    visitor.nodes = [
      startNode,
      loopNode,
      nestedConditionNode,
      normalNodeDescendant,
    ];

    const eof = createEOF();
    visitor.visitChildren(eof);

    expect(visitor.nodes.length).to.equal(4);
    expect(visitor.nodes).to.have.members([
      startNode,
      loopNode,
      nestedConditionNode,
      normalNodeDescendant,
    ]);
  });

  test("when visitChildren get EOF, the loop node with no caller will be removed", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const loopNodeLabelWithNoCaller = "PERFORM UNTIL SQLCODE = CC-NOT-FOUND";

    const loopNodeWithNoCaller = formNode(
      "400",
      loopNodeLabelWithNoCaller,
      NodeType.LOOP,
      400,
      500
    );

    const callee = formNode("501", "2000-PROCESS", NodeType.NORMAL, 501, 600);

    visitor.nodes = [startNode, loopNodeWithNoCaller, callee];
    visitor.callerToCalleesMap.set(loopNodeWithNoCaller.id, [callee.id]);
    visitor.calleeToCallersMap.set(callee.id, [loopNodeWithNoCaller.id]);

    const eof = createEOF();

    visitor.visitChildren(eof);

    expect(visitor.nodes.length).to.equal(1);
    expect(visitor.nodes).to.have.members([startNode]);
  });
});
