const chai = require("chai");
const sinonChai = require("sinon-chai");
import { start } from "repl";
import { ControlFlowGraph, Node, NodeType } from "../ControlFlowGraph";
import exp from "constants";

chai.use(sinonChai);
const expect = chai.expect;

suite("Tests for Control Flow Graph", () => {
  let cfg: ControlFlowGraph;

  setup(async function () {
    cfg = new ControlFlowGraph();
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

  function formEdge(source: string, target: string, isPolyline: boolean) {
    return {
      id: source + "-" + target,
      source: source,
      target: target,
      isPolyline: isPolyline,
    };
  }

  function setCallerCallee(caller: Node, callee: Node) {
    caller.callees.push(callee.id);
    callee.callers.push(caller.id);
  }

  function setCallerCalleeAfterReset(caller: Node, callee: Node) {
    caller.callees = [];
    callee.callers = [];
    caller.callees.push(callee.id);
    callee.callers.push(caller.id);
  }

  test("the normal node with no caller will be removed", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const normalNodeLabelWithNoCaller = "1000-INIT";

    const normalNodeWithNoCaller = formNode(
      "400",
      normalNodeLabelWithNoCaller,
      NodeType.NORMAL,
      400,
      500
    );

    cfg.addRawNodes([startNode, normalNodeWithNoCaller]);

    cfg.generateDisplayNodes();

    expect(cfg.getRawNodes().length).to.equal(1);
    expect(cfg.getRawNodes()).to.be.deep.equal([startNode]);
  });

  test("the callees will be removed if its caller is removed", function () {
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

    setCallerCallee(normalNodeWithNoCaller, calleeNode);

    cfg.addRawNodes([startNode, normalNodeWithNoCaller, calleeNode]);

    cfg.generateDisplayNodes();

    expect(cfg.getRawNodes().length).to.equal(1);
    expect(cfg.getRawNodes()).to.be.deep.equal([startNode]);
  });

  test("the descesdant callees will be removed RECURSIVELY if its ancestor caller is removed", function () {
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

    setCallerCallee(ancestorNode, calleeNode);
    setCallerCallee(calleeNode, calleeNodeDescendant);
    cfg.addRawNodes([
      startNode,
      ancestorNode,
      calleeNode,
      calleeNodeDescendant,
    ]);

    cfg.generateDisplayNodes();

    expect(cfg.getRawNodes().length).to.equal(1);
    expect(cfg.getRawNodes()).to.be.deep.equal([startNode]);
  });

  test("the condition node with no callee will be removed", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);

    const conditionNode = formNode(
      "400",
      "IF OFFICIAL-RATE EQUALS ZEROES",
      NodeType.CONDITION,
      400,
      500
    );

    setCallerCallee(startNode, conditionNode);
    cfg.addRawNodes([startNode, conditionNode]);

    cfg.generateDisplayNodes();

    expect(cfg.getRawNodes().length).to.equal(1);
    expect(cfg.getRawNodes()).to.be.deep.equal([startNode]);
  });

  test("the condition node will be removed when there's no descendant is a normal node", function () {
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

    setCallerCallee(startNode, conditionNode);
    setCallerCallee(conditionNode, nestedConditionNode);
    setCallerCallee(conditionNode, elseNode);
    setCallerCallee(nestedConditionNode, nestedElseNode);

    cfg.addRawNodes([
      startNode,
      conditionNode,
      nestedConditionNode,
      nestedElseNode,
      elseNode,
    ]);

    cfg.generateDisplayNodes();

    expect(cfg.getRawNodes().length).to.equal(1);
    expect(cfg.getRawNodes()).to.be.deep.equal([startNode]);
  });

  test("the condition node will NOT be removed when there's a normal node as descendant", function () {
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

    setCallerCallee(startNode, conditionNode);
    setCallerCallee(conditionNode, nestedConditionNode);
    setCallerCallee(conditionNode, elseNode);
    setCallerCallee(nestedConditionNode, normalNodeDescendant);

    cfg.addRawNodes([
      startNode,
      conditionNode,
      nestedConditionNode,
      normalNodeDescendant,
      elseNode,
    ]);

    cfg.generateDisplayNodes();

    expect(cfg.getRawNodes().length).to.equal(5);
    expect(cfg.getRawNodes()).to.be.deep.equal([
      startNode,
      conditionNode,
      nestedConditionNode,
      normalNodeDescendant,
      elseNode,
    ]);
  });

  test("the condition node with no caller will be removed", function () {
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

    cfg.addRawNodes([
      startNode,
      conditionNodeWithNoCaller,
      conditionNodeCallee,
    ]);
    setCallerCallee(conditionNodeWithNoCaller, conditionNodeCallee);

    cfg.generateDisplayNodes();

    expect(cfg.getRawNodes().length).to.equal(1);
    expect(cfg.getRawNodes()).to.be.deep.equal([startNode]);
  });

  test("the loop node with no callee will be removed", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);

    const loopNode = formNode(
      "400",
      "PERFORM UNTIL SQLCODE = CC-NOT-FOUND",
      NodeType.LOOP,
      400,
      500
    );

    setCallerCallee(startNode, loopNode);
    cfg.addRawNodes([startNode, loopNode]);

    cfg.generateDisplayNodes();

    expect(cfg.getRawNodes().length).to.equal(1);
    expect(cfg.getRawNodes()).to.be.deep.equal([startNode]);
  });

  test("the loop node will be removed when there's no descendant is a normal node", function () {
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

    setCallerCallee(startNode, loopNode);
    setCallerCallee(loopNode, nestedConditionNode);
    setCallerCallee(nestedConditionNode, nestedElseNode);

    cfg.addRawNodes([startNode, loopNode, nestedConditionNode, nestedElseNode]);

    cfg.generateDisplayNodes();

    expect(cfg.getRawNodes().length).to.equal(1);
    expect(cfg.getRawNodes()).to.be.deep.equal([startNode]);
  });

  test("the loop node will NOT be removed when there's a normal node as descendant", function () {
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

    setCallerCallee(startNode, loopNode);
    setCallerCallee(loopNode, nestedConditionNode);
    setCallerCallee(nestedConditionNode, normalNodeDescendant);

    cfg.addRawNodes([
      startNode,
      loopNode,
      nestedConditionNode,
      normalNodeDescendant,
    ]);

    cfg.generateDisplayNodes();

    expect(cfg.getRawNodes().length).to.equal(4);
    expect(cfg.getRawNodes()).to.be.deep.equal([
      startNode,
      loopNode,
      nestedConditionNode,
      normalNodeDescendant,
    ]);
  });

  test("the loop node with no caller will be removed", function () {
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

    cfg.addRawNodes([startNode, loopNodeWithNoCaller, callee]);
    setCallerCallee(loopNodeWithNoCaller, callee);

    cfg.generateDisplayNodes();

    expect(cfg.getRawNodes().length).to.equal(1);
    expect(cfg.getRawNodes()).to.be.deep.equal([startNode]);
  });

  test("display nodes generated correctly for simple with one start node and normal node", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const normalNode = formNode("400", "1000-INIT", NodeType.NORMAL, 400, 500);

    setCallerCallee(startNode, normalNode);
    cfg.addRawNodes([startNode, normalNode]);

    const expectedStartNode = structuredClone(startNode);
    const expectedNormalNode = structuredClone(normalNode);
    expectedStartNode.callees = [expectedNormalNode.id];
    expectedNormalNode.callers = [expectedStartNode.id];

    cfg.generateDisplayNodes();

    expect(cfg.getDisplayNodes()).to.be.deep.equal([
      expectedStartNode,
      expectedNormalNode,
    ]);
  });

  test("error thrown for callee not found when generate Display Nodes", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const normalNode = formNode("400", "1000-INIT", NodeType.NORMAL, 400, 500);
    const non_existing_callee = "non-existing-callee";

    setCallerCallee(startNode, normalNode);
    normalNode.callees.push(non_existing_callee);
    cfg.addRawNodes([startNode, normalNode]);

    expect(() => cfg.generateDisplayNodes()).throws(
      "Callee " + non_existing_callee + " not found"
    );
  });

  test("display nodes generated correctly for node with multiple callers but no callee", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);

    const callerNode = formNode("300", "1000-INIT", NodeType.NORMAL, 300, 400);

    const nodeWithMultipleCallers = formNode(
      "500",
      "2000-PROCESS",
      NodeType.NORMAL,
      500,
      600
    );

    nodeWithMultipleCallers.callers = [startNode.id, callerNode.id];
    setCallerCallee(startNode, nodeWithMultipleCallers);
    setCallerCallee(startNode, callerNode);
    setCallerCallee(callerNode, nodeWithMultipleCallers);

    cfg.addRawNodes([startNode, callerNode, nodeWithMultipleCallers]);

    cfg.generateDisplayNodes();

    const expectedStartNode = structuredClone(startNode);
    const expectedCallerNode = structuredClone(callerNode);
    const expectedDisplayNode_1 = structuredClone(nodeWithMultipleCallers);
    expectedDisplayNode_1.id = nodeWithMultipleCallers.id + "_1";
    const expectedDisplayNode_2 = structuredClone(nodeWithMultipleCallers);
    expectedDisplayNode_2.id = nodeWithMultipleCallers.id + "_2";

    setCallerCalleeAfterReset(expectedStartNode, expectedDisplayNode_1);
    setCallerCalleeAfterReset(expectedDisplayNode_1, expectedCallerNode);
    setCallerCalleeAfterReset(expectedCallerNode, expectedDisplayNode_2);

    expect(cfg.getDisplayNodes()).to.be.deep.equal([
      expectedStartNode,
      expectedDisplayNode_1,
      expectedCallerNode,
      expectedDisplayNode_2,
    ]);
  });

  test("display nodes generated correctly for node that calling itself", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const testNode = formNode("300", "1000-INIT", NodeType.NORMAL, 300, 400);
    const calleeNode = formNode(
      "500",
      "2000-PROCESS",
      NodeType.NORMAL,
      500,
      600
    );

    setCallerCallee(startNode, testNode);
    setCallerCallee(testNode, testNode);
    setCallerCallee(testNode, calleeNode);
    cfg.addRawNodes([startNode, testNode, calleeNode]);

    cfg.generateDisplayNodes();

    const expectedStartNode = structuredClone(startNode);
    const expectedDisplayNode_1 = structuredClone(testNode);
    expectedDisplayNode_1.id = testNode.id + "_1";
    const expectedDisplayNode_2 = structuredClone(testNode);
    expectedDisplayNode_2.id = testNode.id + "_2";
    const expectedCalleeNode = structuredClone(calleeNode);
    expectedCalleeNode.id = calleeNode.id + "_1";

    setCallerCalleeAfterReset(expectedStartNode, expectedDisplayNode_1);
    setCallerCalleeAfterReset(expectedDisplayNode_1, expectedDisplayNode_2);
    setCallerCalleeAfterReset(expectedDisplayNode_2, expectedCalleeNode);

    expect(cfg.getDisplayNodes()).to.be.deep.equal([
      expectedStartNode,
      expectedDisplayNode_1,
      expectedDisplayNode_2,
      expectedCalleeNode,
    ]);

    // assert that the original raw nodes did not get modified.
    expect(cfg.getRawNodes(), "raw nodes").to.be.deep.equal([
      startNode,
      testNode,
      calleeNode,
    ]);
  });

  test("display nodes generated correctly for node with multiple callers and has callee", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const callerNode = formNode("300", "1000-INIT", NodeType.NORMAL, 300, 400);
    const nodeWithMultipleCallers = formNode(
      "500",
      "2000-PROCESS",
      NodeType.NORMAL,
      500,
      600
    );
    const calleeNode = formNode(
      "700",
      "3000-PROCESS",
      NodeType.NORMAL,
      700,
      800
    );

    setCallerCallee(startNode, nodeWithMultipleCallers);
    setCallerCallee(startNode, callerNode);
    setCallerCallee(callerNode, nodeWithMultipleCallers);
    setCallerCallee(nodeWithMultipleCallers, calleeNode);
    cfg.addRawNodes([
      startNode,
      callerNode,
      nodeWithMultipleCallers,
      calleeNode,
    ]);

    cfg.generateDisplayNodes();

    const expectedStartNode = structuredClone(startNode);
    const expectedCallerNode = structuredClone(callerNode);
    const expectedDisplayNode_1 = structuredClone(nodeWithMultipleCallers);
    expectedDisplayNode_1.id = nodeWithMultipleCallers.id + "_1";
    const expectedDisplayNode_2 = structuredClone(nodeWithMultipleCallers);
    expectedDisplayNode_2.id = nodeWithMultipleCallers.id + "_2";
    const expectedCalleeNode_1 = structuredClone(calleeNode);
    expectedCalleeNode_1.id = calleeNode.id + "_1";
    const expectedCalleeNode_2 = structuredClone(calleeNode);
    expectedCalleeNode_2.id = calleeNode.id + "_2";

    setCallerCalleeAfterReset(expectedStartNode, expectedDisplayNode_1);
    setCallerCalleeAfterReset(expectedDisplayNode_1, expectedCalleeNode_1);
    setCallerCalleeAfterReset(expectedCalleeNode_1, expectedCallerNode);
    setCallerCalleeAfterReset(expectedCallerNode, expectedDisplayNode_2);
    setCallerCalleeAfterReset(expectedDisplayNode_2, expectedCalleeNode_2);

    expect(cfg.getDisplayNodes()).to.be.deep.equal([
      expectedStartNode,
      expectedDisplayNode_1,
      expectedCalleeNode_1,
      expectedCallerNode,
      expectedDisplayNode_2,
      expectedCalleeNode_2,
    ]);
  });

  test("display nodes generated correctly for condition node having callee but no elseNode", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const conditionNode = formNode(
      "200",
      "IF OFFICIAL-RATE EQUALS ZEROES",
      NodeType.CONDITION,
      200,
      300
    );
    const conditonNodeCallee = formNode(
      "400",
      "1000-INIT",
      NodeType.NORMAL,
      400,
      500
    );
    const normalNode = formNode(
      "500",
      "2000-PROCESS",
      NodeType.NORMAL,
      500,
      600
    );

    setCallerCallee(startNode, conditionNode);
    setCallerCallee(startNode, normalNode);
    setCallerCallee(conditionNode, conditonNodeCallee);
    cfg.addRawNodes([startNode, conditionNode, conditonNodeCallee, normalNode]);

    const expectedStartNode = structuredClone(startNode);
    const expectedConditionNode = structuredClone(conditionNode);
    const expectedConditionNodeCallee = structuredClone(conditonNodeCallee);
    const expectedNormalNode = structuredClone(normalNode);
    setCallerCalleeAfterReset(expectedStartNode, expectedConditionNode);
    setCallerCalleeAfterReset(
      expectedConditionNode,
      expectedConditionNodeCallee
    );
    setCallerCalleeAfterReset(expectedConditionNodeCallee, expectedNormalNode);
    setCallerCallee(expectedConditionNode, expectedNormalNode);

    cfg.generateDisplayNodes();

    expect(cfg.getDisplayNodes()).to.be.deep.equal([
      expectedStartNode,
      expectedConditionNode,
      expectedConditionNodeCallee,
      expectedNormalNode,
    ]);
  });

  // TODO: take out the logic for condition to another function
  // so the idea is to check by endif and if the caller is condition node then
  // remove both condition and endif node from display node and bind the
  // caller of condition node and callee of the endif node together, the same applied
  // to else node
  // check there's any else node in between if and endif node, if none then
  // push the condition node as caller for the callee of endif node and vice versa,
  // remove the end if node afterwards
  // --scenario 1: if have normal node, no else
  // --scenario 2: if have normal node, have else, no normal node
  // --scenario 3: if have normal node, have else, have normal node
  // --scenario 4: if don't have normal node, no else
  // --scenario 5: if don't have normal node, have else, no normal node
  // scenario 6: if don't have normal node, have else, have normal node

  test("display nodes generated correctly for IF-ELSE but no callee after elseNode", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const conditionNode = formNode(
      "200",
      "IF OFFICIAL-RATE EQUALS ZEROES",
      NodeType.CONDITION,
      200,
      300
    );
    const conditonNodeCallee = formNode(
      "400",
      "1000-INIT",
      NodeType.NORMAL,
      400,
      500
    );
    const normalNode = formNode(
      "501",
      "2000-PROCESS",
      NodeType.NORMAL,
      501,
      600
    );
    const elseNode = formNode("450", "ELSE", NodeType.CONDITION_ELSE, 450, 500);

    setCallerCallee(startNode, conditionNode);
    setCallerCallee(startNode, normalNode);
    setCallerCallee(conditionNode, conditonNodeCallee);
    setCallerCallee(conditionNode, elseNode);
    cfg.addRawNodes([
      startNode,
      conditionNode,
      conditonNodeCallee,
      elseNode,
      normalNode,
    ]);

    const expectedStartNode = structuredClone(startNode);
    const expectedConditionNode = structuredClone(conditionNode);
    const expectedConditionNodeCallee = structuredClone(conditonNodeCallee);
    const expectedNormalNode = structuredClone(normalNode);
    setCallerCalleeAfterReset(expectedStartNode, expectedConditionNode);
    setCallerCalleeAfterReset(
      expectedConditionNode,
      expectedConditionNodeCallee
    );
    setCallerCalleeAfterReset(expectedConditionNodeCallee, expectedNormalNode);
    setCallerCallee(expectedConditionNode, expectedNormalNode);

    cfg.generateDisplayNodes();

    expect(cfg.getDisplayNodes()).to.be.deep.equal([
      expectedStartNode,
      expectedConditionNode,
      expectedConditionNodeCallee,
      expectedNormalNode,
    ]);
  });

  test("display nodes generated correctly for IF-ELSE but HAS callees before and after elseNode", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const conditionNode = formNode(
      "200",
      "IF OFFICIAL-RATE EQUALS ZEROES",
      NodeType.CONDITION,
      200,
      300
    );
    const conditonNodeCallee = formNode(
      "400",
      "1000-INIT",
      NodeType.NORMAL,
      400,
      500
    );
    const normalNode = formNode(
      "501",
      "2000-PROCESS",
      NodeType.NORMAL,
      501,
      600
    );
    const elseNode = formNode("450", "ELSE", NodeType.CONDITION_ELSE, 450, 500);
    const normalNodeAfterElse = formNode(
      "601",
      "3000-PROCESS",
      NodeType.NORMAL,
      601,
      700
    );

    setCallerCallee(startNode, conditionNode);
    setCallerCallee(startNode, normalNode);
    setCallerCallee(conditionNode, conditonNodeCallee);
    setCallerCallee(conditionNode, elseNode);
    setCallerCallee(conditionNode, normalNodeAfterElse);
    cfg.addRawNodes([
      startNode,
      conditionNode,
      conditonNodeCallee,
      elseNode,
      normalNodeAfterElse,
      normalNode,
    ]);

    const expectedStartNode = structuredClone(startNode);
    const expectedConditionNode = structuredClone(conditionNode);
    const expectedConditionNodeCallee = structuredClone(conditonNodeCallee);
    const expectedNormalNode = structuredClone(normalNode);
    const expectedNormalNodeAfterElse = structuredClone(normalNodeAfterElse);
    expectedStartNode.callees = [];
    expectedConditionNode.callers = [];
    expectedConditionNode.callees = [];
    expectedConditionNodeCallee.callers = [];
    expectedConditionNodeCallee.callees = [];
    expectedNormalNodeAfterElse.callers = [];
    expectedNormalNodeAfterElse.callees = [];
    expectedNormalNode.callers = [];
    expectedNormalNode.callees = [];
    setCallerCallee(expectedStartNode, expectedConditionNode);
    setCallerCallee(expectedConditionNode, expectedConditionNodeCallee);
    setCallerCallee(expectedConditionNode, expectedNormalNodeAfterElse);
    setCallerCallee(expectedConditionNodeCallee, expectedNormalNode);
    setCallerCallee(expectedNormalNodeAfterElse, expectedNormalNode);

    cfg.generateDisplayNodes();

    expect(cfg.getDisplayNodes()).to.be.deep.equal([
      expectedStartNode,
      expectedConditionNode,
      expectedConditionNodeCallee,
      expectedNormalNodeAfterElse,
      expectedNormalNode,
    ]);
  });

  test("display nodes generated correctly for IF-ELSE but only HAS callees after elseNode", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const conditionNode = formNode(
      "200",
      "IF OFFICIAL-RATE EQUALS ZEROES",
      NodeType.CONDITION,
      200,
      300
    );
    const elseNode = formNode("450", "ELSE", NodeType.CONDITION_ELSE, 450, 500);
    const normalNodeAfterElse = formNode(
      "601",
      "3000-PROCESS",
      NodeType.NORMAL,
      601,
      700
    );
    const normalNodeAfterEndIf = formNode(
      "501",
      "2000-PROCESS",
      NodeType.NORMAL,
      501,
      600
    );

    setCallerCallee(startNode, conditionNode);
    setCallerCallee(startNode, normalNodeAfterEndIf);
    setCallerCallee(conditionNode, elseNode);
    setCallerCallee(conditionNode, normalNodeAfterElse);
    cfg.addRawNodes([
      startNode,
      conditionNode,
      elseNode,
      normalNodeAfterElse,
      normalNodeAfterEndIf,
    ]);

    const expectedStartNode = structuredClone(startNode);
    const expectedConditionNode = structuredClone(conditionNode);
    const expectedNormalNodeAfterElse = structuredClone(normalNodeAfterElse);
    const expectedNormalNodeAfterEndIf = structuredClone(normalNodeAfterEndIf);
    expectedStartNode.callees = [];
    expectedConditionNode.callers = [];
    expectedConditionNode.callees = [];
    expectedNormalNodeAfterElse.callers = [];
    expectedNormalNodeAfterElse.callees = [];
    expectedNormalNodeAfterEndIf.callers = [];
    expectedNormalNodeAfterEndIf.callees = [];
    setCallerCallee(expectedStartNode, expectedConditionNode);
    setCallerCallee(expectedConditionNode, expectedNormalNodeAfterEndIf);
    setCallerCallee(expectedConditionNode, expectedNormalNodeAfterElse);
    setCallerCallee(expectedNormalNodeAfterElse, expectedNormalNodeAfterEndIf);

    cfg.generateDisplayNodes();

    expect(cfg.getDisplayNodes()).to.be.deep.equal([
      expectedStartNode,
      expectedConditionNode,
      expectedNormalNodeAfterElse,
      expectedNormalNodeAfterEndIf,
    ]);
  });

  test("duplicated display nodes generated correctly for IF-ELSE but only HAS callees after elseNode", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const callerNode = formNode("300", "1000-INIT", NodeType.NORMAL, 300, 350);
    const nodeWithMultipleCallers = formNode(
      "400",
      "2000-PROCESS",
      NodeType.NORMAL,
      400,
      450
    );
    const conditionNode = formNode(
      "500",
      "IF OFFICIAL-RATE EQUALS ZEROES",
      NodeType.CONDITION,
      500,
      600
    );
    const elseNode = formNode("550", "ELSE", NodeType.CONDITION_ELSE, 550, 600);
    const normalNodeAfterElse = formNode(
      "701",
      "3000-PROCESS",
      NodeType.NORMAL,
      701,
      800
    );

    const normalNodeAfterEndIf = formNode(
      "601",
      "2000-PROCESS",
      NodeType.NORMAL,
      601,
      700
    );

    setCallerCallee(startNode, nodeWithMultipleCallers);
    setCallerCallee(startNode, callerNode);
    setCallerCallee(callerNode, nodeWithMultipleCallers);
    setCallerCallee(callerNode, normalNodeAfterEndIf);
    setCallerCallee(nodeWithMultipleCallers, conditionNode);
    setCallerCallee(conditionNode, elseNode);
    setCallerCallee(conditionNode, normalNodeAfterElse);
    cfg.addRawNodes([
      startNode,
      callerNode,
      nodeWithMultipleCallers,
      conditionNode,
      elseNode,
      normalNodeAfterElse,
      normalNodeAfterEndIf,
    ]);

    const expectedStartNode = structuredClone(startNode);
    const expectedCallerNode = structuredClone(callerNode);
    const expectedNodeWithMultipleCallers_1 = structuredClone(
      nodeWithMultipleCallers
    );
    expectedNodeWithMultipleCallers_1.id = nodeWithMultipleCallers.id + "_1";
    const expectedNodeWithMultipleCallers_2 = structuredClone(
      nodeWithMultipleCallers
    );
    expectedNodeWithMultipleCallers_2.id = nodeWithMultipleCallers.id + "_2";
    const expectedConditionNode_1 = structuredClone(conditionNode);
    expectedConditionNode_1.id = conditionNode.id + "_1";
    const expectedConditionNode_2 = structuredClone(conditionNode);
    expectedConditionNode_2.id = conditionNode.id + "_2";
    const expectedNormalNodeAfterElse_1 = structuredClone(normalNodeAfterElse);
    expectedNormalNodeAfterElse_1.id = normalNodeAfterElse.id + "_1";
    const expectedNormalNodeAfterElse_2 = structuredClone(normalNodeAfterElse);
    expectedNormalNodeAfterElse_2.id = normalNodeAfterElse.id + "_2";
    const expectedNormalNodeAfterEndIf = structuredClone(normalNodeAfterEndIf);
    expectedStartNode.callees = [];
    expectedCallerNode.callers = [];
    expectedCallerNode.callees = [];
    expectedNodeWithMultipleCallers_1.callers = [];
    expectedNodeWithMultipleCallers_1.callees = [];
    expectedNodeWithMultipleCallers_2.callers = [];
    expectedNodeWithMultipleCallers_2.callees = [];
    expectedConditionNode_1.callers = [];
    expectedConditionNode_1.callees = [];
    expectedConditionNode_2.callers = [];
    expectedConditionNode_2.callees = [];
    expectedNormalNodeAfterElse_1.callers = [];
    expectedNormalNodeAfterElse_1.callees = [];
    expectedNormalNodeAfterElse_2.callers = [];
    expectedNormalNodeAfterElse_2.callees = [];
    expectedNormalNodeAfterEndIf.callers = [];
    expectedNormalNodeAfterEndIf.callees = [];
    setCallerCallee(expectedStartNode, expectedNodeWithMultipleCallers_1);
    setCallerCallee(expectedNodeWithMultipleCallers_1, expectedConditionNode_1);
    setCallerCallee(expectedConditionNode_1, expectedCallerNode);
    setCallerCallee(expectedConditionNode_1, expectedNormalNodeAfterElse_1);
    setCallerCallee(expectedNormalNodeAfterElse_1, expectedCallerNode);
    setCallerCallee(expectedCallerNode, expectedNodeWithMultipleCallers_2);
    setCallerCallee(expectedNodeWithMultipleCallers_2, expectedConditionNode_2);
    setCallerCallee(expectedConditionNode_2, expectedNormalNodeAfterEndIf);
    setCallerCallee(expectedConditionNode_2, expectedNormalNodeAfterElse_2);
    setCallerCallee(
      expectedNormalNodeAfterElse_2,
      expectedNormalNodeAfterEndIf
    );

    cfg.generateDisplayNodes();

    expect(cfg.getDisplayNodes()).to.be.deep.equal([
      expectedStartNode,
      expectedNodeWithMultipleCallers_1,
      expectedConditionNode_1,
      expectedNormalNodeAfterElse_1,
      expectedCallerNode,
      expectedNodeWithMultipleCallers_2,
      expectedConditionNode_2,
      expectedNormalNodeAfterElse_2,
      expectedNormalNodeAfterEndIf,
    ]);
  });

  test("duplicated node (last callee of condition node that has multiple callers) generated correctly for IF-ELSE but only HAS callees after elseNode", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const callerNode = formNode("300", "1000-INIT", NodeType.NORMAL, 300, 350);
    const conditionNode = formNode(
      "500",
      "IF OFFICIAL-RATE EQUALS ZEROES",
      NodeType.CONDITION,
      500,
      600
    );
    const elseNode = formNode("550", "ELSE", NodeType.CONDITION_ELSE, 550, 600);
    const normalNodeAfterElse = formNode(
      "701",
      "3000-PROCESS",
      NodeType.NORMAL,
      701,
      800
    );

    const normalNodeAfterEndIf = formNode(
      "601",
      "2000-PROCESS",
      NodeType.NORMAL,
      601,
      700
    );

    setCallerCallee(startNode, normalNodeAfterElse);
    setCallerCallee(startNode, callerNode);
    setCallerCallee(callerNode, conditionNode);
    setCallerCallee(callerNode, normalNodeAfterEndIf);
    setCallerCallee(conditionNode, elseNode);
    setCallerCallee(conditionNode, normalNodeAfterElse);
    cfg.addRawNodes([
      startNode,
      callerNode,
      conditionNode,
      elseNode,
      normalNodeAfterElse,
      normalNodeAfterEndIf,
    ]);

    const expectedStartNode = structuredClone(startNode);
    const expectedCallerNode = structuredClone(callerNode);
    const expectedConditionNode = structuredClone(conditionNode);
    const expectedNormalNodeAfterElse_1 = structuredClone(normalNodeAfterElse);
    expectedNormalNodeAfterElse_1.id = normalNodeAfterElse.id + "_1";
    const expectedNormalNodeAfterElse_2 = structuredClone(normalNodeAfterElse);
    expectedNormalNodeAfterElse_2.id = normalNodeAfterElse.id + "_2";
    const expectedNormalNodeAfterEndIf = structuredClone(normalNodeAfterEndIf);
    expectedStartNode.callees = [];
    expectedCallerNode.callers = [];
    expectedCallerNode.callees = [];
    expectedConditionNode.callers = [];
    expectedConditionNode.callees = [];
    expectedNormalNodeAfterElse_1.callers = [];
    expectedNormalNodeAfterElse_1.callees = [];
    expectedNormalNodeAfterElse_2.callers = [];
    expectedNormalNodeAfterElse_2.callees = [];
    expectedNormalNodeAfterEndIf.callers = [];
    expectedNormalNodeAfterEndIf.callees = [];

    setCallerCallee(expectedStartNode, expectedNormalNodeAfterElse_1);
    setCallerCallee(expectedNormalNodeAfterElse_1, expectedCallerNode);
    setCallerCallee(expectedCallerNode, expectedConditionNode);
    setCallerCallee(expectedConditionNode, expectedNormalNodeAfterEndIf);
    setCallerCallee(expectedConditionNode, expectedNormalNodeAfterElse_2);
    setCallerCallee(
      expectedNormalNodeAfterElse_2,
      expectedNormalNodeAfterEndIf
    );

    cfg.generateDisplayNodes();

    expect(cfg.getDisplayNodes()).to.be.deep.equal([
      expectedStartNode,
      expectedNormalNodeAfterElse_1,
      expectedCallerNode,
      expectedConditionNode,
      expectedNormalNodeAfterElse_2,
      expectedNormalNodeAfterEndIf,
    ]);
  });

  test("the edges generated correctly for display nodes that has no condition node and loop node", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const callerNode = formNode("300", "1000-INIT", NodeType.NORMAL, 300, 350);
    const calleeNode = formNode(
      "500",
      "2000-PROCESS",
      NodeType.NORMAL,
      500,
      600
    );

    setCallerCallee(startNode, callerNode);
    setCallerCallee(callerNode, calleeNode);
    cfg.addRawNodes([startNode, callerNode, calleeNode]);

    cfg.generateDisplayNodes();
    cfg.generateEdges();

    const expectedE1 = formEdge(startNode.id, callerNode.id, false);
    const expectedE2 = formEdge(callerNode.id, calleeNode.id, false);

    expect(cfg.getEdges()).to.be.deep.equal([expectedE1, expectedE2]);
  });

  test("edges generated correctly for node with multiple callers and has callee", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const callerNode = formNode("300", "1000-INIT", NodeType.NORMAL, 300, 400);
    const nodeWithMultipleCallers = formNode(
      "500",
      "2000-PROCESS",
      NodeType.NORMAL,
      500,
      600
    );
    const calleeNode = formNode(
      "700",
      "3000-PROCESS",
      NodeType.NORMAL,
      700,
      800
    );

    setCallerCallee(startNode, nodeWithMultipleCallers);
    setCallerCallee(startNode, callerNode);
    setCallerCallee(callerNode, nodeWithMultipleCallers);
    setCallerCallee(nodeWithMultipleCallers, calleeNode);
    cfg.addRawNodes([
      startNode,
      callerNode,
      nodeWithMultipleCallers,
      calleeNode,
    ]);

    cfg.generateDisplayNodes();
    cfg.generateEdges();

    const dupNodeId_1 = nodeWithMultipleCallers.id + "_1";
    const dupNodeId_2 = nodeWithMultipleCallers.id + "_2";
    const dupCalleeNodeId_1 = calleeNode.id + "_1";
    const dupCalleeNodeId_2 = calleeNode.id + "_2";
    const expectedE1 = formEdge(startNode.id, dupNodeId_1, false);
    const expectedE2 = formEdge(dupNodeId_1, dupCalleeNodeId_1, false);
    const expectedE3 = formEdge(dupCalleeNodeId_1, callerNode.id, false);
    const expectedE4 = formEdge(callerNode.id, dupNodeId_2, false);
    const expectedE5 = formEdge(dupNodeId_2, dupCalleeNodeId_2, false);

    expect(cfg.getEdges()).to.be.deep.equal([
      expectedE1,
      expectedE2,
      expectedE3,
      expectedE4,
      expectedE5,
    ]);
  });

  test("edges generated correctly for last loop node callee and loop node", function () {
    const startNode = formNode("100", "0000-START", NodeType.START, 100, 200);
    const loopNode = formNode("300", "1000-LOOP", NodeType.LOOP, 300, 400);
    const calleeNode = formNode(
      "500",
      "2000-PROCESS",
      NodeType.NORMAL,
      500,
      600
    );

    const lastCalleeNode = formNode(
      "700",
      "3000-PROCESS",
      NodeType.NORMAL,
      700,
      800
    );

    const afterLoopNode = formNode(
      "900",
      "4000-PROCESS",
      NodeType.NORMAL,
      900,
      1000
    );

    setCallerCallee(startNode, loopNode);
    setCallerCallee(loopNode, calleeNode);
    setCallerCallee(loopNode, lastCalleeNode);
    setCallerCallee(startNode, afterLoopNode);
    cfg.addRawNodes([
      startNode,
      loopNode,
      calleeNode,
      lastCalleeNode,
      afterLoopNode,
    ]);

    cfg.generateDisplayNodes();
    cfg.generateEdges();

    const expectedE1 = formEdge(startNode.id, loopNode.id, false);
    const expectedE2 = formEdge(loopNode.id, calleeNode.id, false);
    const expectedE3 = formEdge(calleeNode.id, lastCalleeNode.id, false);
    const expectedE4 = formEdge(lastCalleeNode.id, loopNode.id, true);
    const expectedE5 = formEdge(lastCalleeNode.id, afterLoopNode.id, false);

    expect(cfg.getEdges()).to.be.deep.equal([
      expectedE1,
      expectedE2,
      expectedE3,
      expectedE4,
      expectedE5,
    ]);
  });

  // TODO: test perform end node should point back to perform node

  // test("should contain all the edges correctly", function () {
  //   expect(cfg.edges).to.not.be.empty;

  //   const expectedEdges = [
  //     "235-271",
  //     "271-482",
  //     "482-245",
  //     "245-751",
  //     "751-279",
  //     "279-294",
  //     "294-530",
  //     "530-544_1",
  //     "544_1-459_1",
  //     "459_1-651_1",
  //     "651_1-304",
  //     "304-305",
  //     "305-613",
  //     "613-324",
  //     "324-515",
  //     "515-499_1",
  //     "499_1-339",
  //     "339-340",
  //     "340-378",
  //     "378-388",
  //     "388-398",
  //     "398-630",
  //     "630-668",
  //     "668-688",
  //     "688-709",
  //     "709-729",
  //     "729-419",
  //     "419-499_2",
  //     "499_2-442",
  //     "442-770",
  //     "770-544_2",
  //     "544_2-459_2",
  //     "459_2-651_2",
  //     "651_2-256",
  //   ];
  //   expect(cfg.edges.map((edge) => edge.id)).to.have.members(expectedEdges);
  // });
});
