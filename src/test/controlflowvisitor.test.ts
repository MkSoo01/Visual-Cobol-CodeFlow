const chai = require("chai");
const sinonChai = require("sinon-chai");
import {
  ParagraphContext,
  ParagraphNameContext,
  PerformInlineStatementContext,
  PerformProcedureStatementContext,
  PerformStatementContext,
  PerformTypeContext,
  PerformUntilContext,
  ProcedureNameContext,
  SentenceContext,
  StatementContext,
} from "../generated/VisualCobolParser";
import { ControlFlowVisitor } from "../ControlFlowVisitor";
import { ParserRuleContext, Token } from "antlr4ts";
import sinon from "sinon";
import { TerminalNode } from "antlr4ts/tree/TerminalNode";
import { NodeType, Node } from "../ControlFlowGraph";

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
      flow: "f1",
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
    stubPerformUntilCtx.getChild.withArgs(0).returns(untilTerminalNode);
    stubPerformUntilCtx.getChild.withArgs(1).returns(otherTerminalNode);
    defineProperty(stubPerformUntilCtx, "childCount", 2);
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

    expect(visitor.getNodes().length).to.equal(1);

    const actual = visitor.getNodes()[0];
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

    const actual = visitor.getNodes()[0];
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
      visitor.getCalleeToCallersMap().get(procedureName),
      "Callee To Callers Map"
    ).to.have.members([callerId]);
    expect(
      visitor.getCallerToCalleesMap().get(callerId),
      "Caller To Callees Map"
    ).to.have.members([procedureName]);
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
      visitor.getCalleeToCallersMap().get(procedureName),
      "Callee To Callers Map"
    ).to.have.members([callerId]);
    expect(
      visitor.getCallerToCalleesMap().get(callerId),
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
      visitor.getCallerToCalleesMap().get(callerId),
      "Caller to Callees Map"
    ).to.have.members([procedureName1, procedureName2]);
    expect(
      visitor.getCalleeToCallersMap().get(procedureName1),
      "Callee to Caller Map - Procedure1"
    ).to.have.members([callerId]);
    expect(
      visitor.getCalleeToCallersMap().get(procedureName2),
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
      visitor.getCalleeToCallersMap().get(procedureName),
      "Callee to Callers Map"
    ).to.have.members([caller1ID, caller2ID]);
    expect(
      visitor.getCallerToCalleesMap().get(caller1ID),
      "Caller to Callees Map - Caller1"
    ).to.have.members([procedureName]);
    expect(
      visitor.getCallerToCalleesMap().get(caller2ID),
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

    const actual = visitor.getNodes()[0];
    const expected = formNode(
      expectedNodeId,
      expectedNodeName,
      NodeType.LOOP,
      expectedStartLineNumber,
      expectedEndLineNumber
    );

    expect(actual).to.deep.equal(expected);
    expect(visitor.getCallerToCalleesMap().get(callerID)).to.have.members([
      expectedNodeId,
    ]);
    expect(visitor.getCalleeToCallersMap().get(expectedNodeId)).to.have.members(
      [callerID]
    );
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
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );

    const normalNode = formNode("300", "1000-INIT", NodeType.NORMAL, 300, 400);
    const normalNodeCallee = formNode(
      "400",
      "2000-PROCESS",
      NodeType.NORMAL,
      300,
      400
    );

    visitor.addEntryToCallerCalleesMap(startNode.id, normalNode.label);
    visitor.addEntryToCallerCalleesMap(normalNode.id, normalNodeCallee.label);
    visitor.addNodes([startNode, normalNode, normalNodeCallee]);

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
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );
    const normalNodeLabel = "1000-INIT";

    const normalNode = formNode(
      "400",
      normalNodeLabel,
      NodeType.NORMAL,
      400,
      500
    );

    visitor.addEntryToCallerCalleesMap(startNode.id, normalNode.label);
    visitor.addNodes([startNode, normalNode]);

    const notEOF = sinon.createStubInstance(ParserRuleContext);
    visitor.visitChildren(notEOF);

    expect(normalNode.callees, "callees").to.be.empty;
    expect(normalNode.callers, "callers").to.be.empty;
  });
});
