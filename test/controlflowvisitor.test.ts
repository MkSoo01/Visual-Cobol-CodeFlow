const chai = require("chai");
const sinonChai = require("sinon-chai");
import {
  ParagraphContext,
  ParagraphNameContext,
  PerformInlineStatementContext,
  PerformProcedureStatementContext,
  PerformStatementContext,
  PerformTimesContext,
  PerformTypeContext,
  PerformUntilContext,
  PerformVaryingContext,
  ProcedureNameContext,
  SentenceContext,
  StatementContext,
} from "../src/generated/VisualCobolParser";
import { ControlFlowVisitor } from "../src/ControlFlowVisitor";
import { ParserRuleContext, Token } from "antlr4ts";
import sinon from "sinon";
import { TerminalNode } from "antlr4ts/tree/TerminalNode";
import { NodeType, Node } from "../src/ControlFlowGraph";

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
    caller: ParserRuleContext,
    invocationLineNo?: number
  ): PerformProcedureStatementContext {
    const stubCtx = sinon.createStubInstance(PerformProcedureStatementContext);
    const stubStartToken: Token = {
      line: invocationLineNo ? invocationLineNo : 0,
    } as Token;
    defineProperty(stubCtx, "start", stubStartToken);
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

  function initPerformInlineForPerformUntil(
    stubPerformInlineStatementCtx: PerformInlineStatementContext,
    performInlineStatementText: string
  ) {
    const stubPerformTypeCtx = sinon.createStubInstance(PerformTypeContext);
    const stubPerformUntilCtx = sinon.createStubInstance(PerformUntilContext);
    stubPerformInlineStatementCtx.performType = () => stubPerformTypeCtx;
    stubPerformTypeCtx.performUntil.returns(stubPerformUntilCtx);

    const textArray = performInlineStatementText.split("UNTIL");
    const untilTerminalNode = sinon.createStubInstance(TerminalNode);
    defineProperty(untilTerminalNode, "text", "UNTIL");
    const otherTerminalNode = sinon.createStubInstance(TerminalNode);
    defineProperty(
      otherTerminalNode,
      "text",
      textArray.splice(1).join(" ").trim()
    );
    stubPerformUntilCtx.getChild.withArgs(0).returns(untilTerminalNode);
    stubPerformUntilCtx.getChild.withArgs(1).returns(otherTerminalNode);
    defineProperty(stubPerformUntilCtx, "childCount", 2);
  }

  function initPerformInlineForPerformVarying(
    stubPerformInlineStatementCtx: PerformInlineStatementContext,
    performInlineStatementText: string
  ) {
    const stubPerformTypeCtx = sinon.createStubInstance(PerformTypeContext);
    const stubPerformVaryingCtx = sinon.createStubInstance(
      PerformVaryingContext
    );
    stubPerformInlineStatementCtx.performType = () => stubPerformTypeCtx;
    stubPerformTypeCtx.performVarying.returns(stubPerformVaryingCtx);

    const textArray = performInlineStatementText.split("VARYING");
    const varyingTerminalNode = sinon.createStubInstance(TerminalNode);
    defineProperty(varyingTerminalNode, "text", "VARYING");
    const otherTerminalNode = sinon.createStubInstance(TerminalNode);
    defineProperty(
      otherTerminalNode,
      "text",
      textArray.splice(1).join(" ").trim()
    );
    stubPerformVaryingCtx.getChild.withArgs(0).returns(varyingTerminalNode);
    stubPerformVaryingCtx.getChild.withArgs(1).returns(otherTerminalNode);
    defineProperty(stubPerformVaryingCtx, "childCount", 2);
  }

  function initPerformInlineForPerformTimes(
    stubPerformInlineStatementCtx: PerformInlineStatementContext,
    performInlineStatementText: string
  ) {
    const stubPerformTypeCtx = sinon.createStubInstance(PerformTypeContext);
    const stubPerformTimesCtx = sinon.createStubInstance(PerformTimesContext);
    stubPerformInlineStatementCtx.performType = () => stubPerformTypeCtx;
    stubPerformTypeCtx.performTimes.returns(stubPerformTimesCtx);

    const textArray = performInlineStatementText.split(" ");
    const timesTerminalNode = sinon.createStubInstance(TerminalNode);
    defineProperty(timesTerminalNode, "text", "TIMES");
    const otherTerminalNode = sinon.createStubInstance(TerminalNode);
    defineProperty(otherTerminalNode, "text", textArray[1].trim());

    stubPerformTimesCtx.getChild.withArgs(0).returns(otherTerminalNode);
    stubPerformTimesCtx.getChild.withArgs(1).returns(timesTerminalNode);
    defineProperty(stubPerformTimesCtx, "childCount", 2);
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

  test("Paragraph for handling the error is ignored", function () {
    const callerNodeName = "0000-MAIN-ROUTINE";
    const callerStartLineNumber = 235;
    const callerEndLineNumber = 256;
    const callerId = callerStartLineNumber.toString();
    const stubParagraphCtx: ParagraphContext = createStubParagraphCtx(
      callerNodeName,
      callerStartLineNumber,
      callerEndLineNumber
    ) as unknown as ParagraphContext;

    const procedureName = "9920-PROCESS-SQL-ERROR";
    const stubCtx = createStubPerformProcedureStatementCtx(
      procedureName,
      stubParagraphCtx
    );

    visitor.visitPerformProcedureStatement(stubCtx);

    expect(visitor.getCallerToCalleesMap().get(callerId)).to.be.undefined;
    expect(visitor.getCalleeToCallersMap().get(procedureName)).to.be.undefined;
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

  test("no need to add the callee if it is same as the previous callee", function () {
    const callerId = "100";
    const calleeId = "200";
    visitor.addEntryToCallerCalleesMap(callerId, calleeId);
    visitor.addEntryToCallerCalleesMap(callerId, calleeId);

    expect(
      visitor.getCallerToCalleesMap().get(callerId),
      "Caller to Callees Map"
    ).to.have.members([calleeId]);
  });

  test("visitPerformProcedureStatement calls addPerformNode if has performType", function () {
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

    stubCtx.performType = () => sinon.createStubInstance(PerformTypeContext);

    const addLoopNodeStub = sinon.stub(visitor, "addLoopNode");
    const loopNodeId = "400";
    addLoopNodeStub.returns(loopNodeId);

    visitor.visitPerformProcedureStatement(stubCtx);

    expect(
      visitor.getCalleeToCallersMap().get(procedureName),
      "Callee To Callers Map"
    ).to.have.members([loopNodeId]);
    expect(
      visitor.getCallerToCalleesMap().get(loopNodeId),
      "Caller To Callees Map"
    ).to.have.members([procedureName]);
    expect(addLoopNodeStub).to.have.been.calledOnce;
    expect(addLoopNodeStub).to.have.been.calledWith(stubCtx);
  });

  test("visitPerformProcedureStatement call addEntryToInvocationMap and visitChildren at the end", function () {
    const addEntryToInvocationMapStub = sinon.stub(
      visitor,
      "addEntryToInvocationMap"
    );
    const visitChildrenStub = sinon.stub(visitor, "visitChildren");

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
    const invocationLineNumber = 240;
    const stubCtx = createStubPerformProcedureStatementCtx(
      procedureName,
      stubParagraphCtx,
      invocationLineNumber
    );

    visitor.visitPerformProcedureStatement(stubCtx);

    expect(addEntryToInvocationMapStub).to.have.been.calledWith(
      procedureName,
      callerId,
      invocationLineNumber
    );
    expect(visitChildrenStub, "visitChildren").to.have.been.calledOnce;
  });

  test("addEntryToInvocationMap add entry to invocationMap", function () {
    const callerNodeName = "0000-MAIN-ROUTINE";
    const callerStartLineNumber = 235;
    const callerEndLineNumber = 256;
    const callerId = callerStartLineNumber.toString();
    const calleeLabel = "1000-INIT";
    const invocationLineNumber = 240;

    visitor.addNode(
      formNode(
        callerId,
        callerNodeName,
        NodeType.NORMAL,
        callerStartLineNumber,
        callerEndLineNumber
      )
    );
    visitor.addEntryToInvocationMap(
      calleeLabel,
      callerId,
      invocationLineNumber
    );

    const invocationList = visitor.getInvocationMap().get(calleeLabel);
    expect(invocationList?.get(callerId)).to.be.equal(invocationLineNumber);
  });

  test("addEntryToInvocationMap capture the first invocation only", function () {
    const callerNodeName = "0000-MAIN-ROUTINE";
    const callerStartLineNumber = 235;
    const callerEndLineNumber = 256;
    const callerId = callerStartLineNumber.toString();
    const calleeLabel = "1000-INIT";
    const invocationLineNumber = 240;
    const secondInvocationLineNumber = 245;

    visitor.addNode(
      formNode(
        callerId,
        callerNodeName,
        NodeType.NORMAL,
        callerStartLineNumber,
        callerEndLineNumber
      )
    );
    visitor.addEntryToInvocationMap(
      calleeLabel,
      callerId,
      invocationLineNumber
    );
    visitor.addEntryToInvocationMap(
      calleeLabel,
      callerId,
      secondInvocationLineNumber
    );

    const invocationList = visitor.getInvocationMap().get(calleeLabel);
    expect(invocationList?.get(callerId)).to.be.equal(invocationLineNumber);
  });

  test("addEntryToInvocationMap (invocation caller must be normal node)", function () {
    const callerNodeName = "0000-MAIN-ROUTINE";
    const callerStartLineNumber = 235;
    const callerEndLineNumber = 256;
    const callerId = callerStartLineNumber.toString();
    const calleeLabel = "1000-INIT";
    const invocationLineNumber = 240;
    const loopNodeId = "400";

    visitor.addNode(
      formNode(
        callerId,
        callerNodeName,
        NodeType.NORMAL,
        callerStartLineNumber,
        callerEndLineNumber
      )
    );
    visitor.addNode(
      formNode(
        loopNodeId,
        "PERFORM UNTIL SQLCODE = CC-NOT-FOUND",
        NodeType.LOOP,
        400,
        400
      )
    );
    visitor.addEntryToCallerCalleesMap(callerId, loopNodeId);
    visitor.addEntryToInvocationMap(
      calleeLabel,
      loopNodeId,
      invocationLineNumber
    );

    const invocationList = visitor.getInvocationMap().get(calleeLabel);
    expect(invocationList?.get(callerId)).to.be.equal(invocationLineNumber);
  });

  test("the loop node data to be captured correctly for PERFORM UNTIL", function () {
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

    initPerformInlineForPerformUntil(
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

  test("the loop node data to be captured correctly for PERFORM VARYING", function () {
    const expectedNodeName =
      "PERFORM VARYING WS-CTR-3 FROM 1 BY 1 UNTIL WS-CTR-3 > WS-TMP-COUNT";
    const expectedStartLineNumber = 245;
    const expectedEndLineNumber = 253;
    const expectedNodeId = expectedStartLineNumber.toString();

    const stubPerformInlineStatementCtx = createStubParserRuleCtx(
      sinon.createStubInstance(PerformInlineStatementContext),
      "",
      expectedStartLineNumber,
      expectedEndLineNumber
    ) as PerformInlineStatementContext;

    initPerformInlineForPerformVarying(
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

  test("the loop node data to be captured correctly for PERFORM TIMES", function () {
    const expectedNodeName = "PERFORM 2 TIMES";
    const expectedStartLineNumber = 245;
    const expectedEndLineNumber = 253;
    const expectedNodeId = expectedStartLineNumber.toString();

    const stubPerformInlineStatementCtx = createStubParserRuleCtx(
      sinon.createStubInstance(PerformInlineStatementContext),
      "",
      expectedStartLineNumber,
      expectedEndLineNumber
    ) as PerformInlineStatementContext;

    initPerformInlineForPerformTimes(
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

  test("visitPerformInlineStatement calls addLoopNode", function () {
    const callerNodeName = "0000-MAIN-ROUTINE";
    const callerStartLineNumber = 235;
    const callerEndLineNumber = 256;

    const stubPerformInlineStatementCtx = createStubParserRuleCtx(
      sinon.createStubInstance(PerformInlineStatementContext),
      "",
      callerStartLineNumber,
      callerEndLineNumber
    ) as PerformInlineStatementContext;

    const addLoopNodeStub = sinon.stub(visitor, "addLoopNode");
    const loopNodeId = "400";
    addLoopNodeStub.returns(loopNodeId);

    visitor.visitPerformInlineStatement(stubPerformInlineStatementCtx);

    expect(addLoopNodeStub).to.have.been.calledOnce;
    expect(addLoopNodeStub).to.have.been.calledWith(
      stubPerformInlineStatementCtx
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

    expect(() => visitor.visitChildren(eof)).to.throw("Missing start node");
  });

  test("when visitChildren get EOF, callers, callees and invocationMap of the node are populated correctly", function () {
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
      400,
      500
    );

    const invocationLineNoForNormalNode = 150;
    const invocationLineNoForNormalNodeCallee = 350;
    visitor.addEntryToInvocationMap(
      normalNode.label,
      startNode.id,
      invocationLineNoForNormalNode
    );
    visitor.addEntryToInvocationMap(
      normalNodeCallee.label,
      normalNode.id,
      invocationLineNoForNormalNodeCallee
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
    expectedNormalNode.invocationMap = new Map<string, number>([
      [expectedStartNode.id, invocationLineNoForNormalNode],
    ]);
    expectedNormalNodeCallee.callers = [normalNode.id];
    expectedNormalNodeCallee.invocationMap = new Map<string, number>([
      [expectedNormalNode.id, invocationLineNoForNormalNodeCallee],
    ]);

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
