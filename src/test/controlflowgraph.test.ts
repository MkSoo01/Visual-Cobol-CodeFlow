const chai = require("chai");
const sinonChai = require("sinon-chai");
import { ControlFlowGraph, Edge } from "../ControlFlowGraph";
import { Node, NodeType } from "../ControlFlowVisitor";

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

  function setCallerCallee(caller: Node, callee: Node) {
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

    cfg.addNodes([startNode, normalNodeWithNoCaller]);

    cfg.processNodesForDisplay();

    expect(cfg.getDisplayNodes().length).to.equal(1);
    expect(cfg.getDisplayNodes()).to.have.members([startNode]);
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

    cfg.addNodes([startNode, normalNodeWithNoCaller, calleeNode]);

    cfg.processNodesForDisplay();

    expect(cfg.getDisplayNodes().length).to.equal(1);
    expect(cfg.getDisplayNodes()).to.have.members([startNode]);
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
    cfg.addNodes([startNode, ancestorNode, calleeNode, calleeNodeDescendant]);

    cfg.processNodesForDisplay();

    expect(cfg.getDisplayNodes().length).to.equal(1);
    expect(cfg.getDisplayNodes()).to.have.members([startNode]);
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
    cfg.addNodes([startNode, conditionNode]);

    cfg.processNodesForDisplay();

    expect(cfg.getDisplayNodes().length).to.equal(1);
    expect(cfg.getDisplayNodes()).to.have.members([startNode]);
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

    cfg.addNodes([
      startNode,
      conditionNode,
      nestedConditionNode,
      nestedElseNode,
      elseNode,
    ]);

    cfg.processNodesForDisplay();

    expect(cfg.getDisplayNodes().length).to.equal(1);
    expect(cfg.getDisplayNodes()).to.have.members([startNode]);
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

    cfg.addNodes([
      startNode,
      conditionNode,
      nestedConditionNode,
      normalNodeDescendant,
      elseNode,
    ]);

    cfg.processNodesForDisplay();

    expect(cfg.getDisplayNodes().length).to.equal(5);
    expect(cfg.getDisplayNodes()).to.have.members([
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

    cfg.addNodes([startNode, conditionNodeWithNoCaller, conditionNodeCallee]);
    setCallerCallee(conditionNodeWithNoCaller, conditionNodeCallee);

    cfg.processNodesForDisplay();

    expect(cfg.getDisplayNodes().length).to.equal(1);
    expect(cfg.getDisplayNodes()).to.have.members([startNode]);
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
    cfg.addNodes([startNode, loopNode]);

    cfg.processNodesForDisplay();

    expect(cfg.getDisplayNodes().length).to.equal(1);
    expect(cfg.getDisplayNodes()).to.have.members([startNode]);
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

    cfg.addNodes([startNode, loopNode, nestedConditionNode, nestedElseNode]);

    cfg.processNodesForDisplay();

    expect(cfg.getDisplayNodes().length).to.equal(1);
    expect(cfg.getDisplayNodes()).to.have.members([startNode]);
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

    cfg.addNodes([
      startNode,
      loopNode,
      nestedConditionNode,
      normalNodeDescendant,
    ]);

    cfg.processNodesForDisplay();

    expect(cfg.getDisplayNodes().length).to.equal(4);
    expect(cfg.getDisplayNodes()).to.have.members([
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

    cfg.addNodes([startNode, loopNodeWithNoCaller, callee]);
    setCallerCallee(loopNodeWithNoCaller, callee);

    cfg.processNodesForDisplay();

    expect(cfg.getDisplayNodes().length).to.equal(1);
    expect(cfg.getDisplayNodes()).to.have.members([startNode]);
  });

  test("display nodes generated correctly for simple with one normal node, start node and end node", function () {
    const startNode = getStartNode();
    const endNode = getEndNode();

    const normalNodeLabel = "1000-INIT";

    const normalNode: Node = {
      id: "400",
      callers: [],
      callees: [],
      startLineNumber: 500,
      endLineNumber: 600,
      label: normalNodeLabel,
      type: NodeType.NORMAL,
    };

    normalNode.callers.push(startNode.id);
    startNode.callees = [normalNode.id, endNode.id];
    endNode.callers.push(startNode.id);
    cfg.nodes = [startNode, normalNode, endNode];

    const expectedStartNode = getStartNode();
    const expectedNormalNode: Node = structuredClone(normalNode);
    const expectedEndNode = getEndNode();
    expectedStartNode.callees = [expectedNormalNode.id];
    expectedNormalNode.callers = [expectedStartNode.id];
    expectedNormalNode.callees = [expectedEndNode.id];
    expectedEndNode.callers = [expectedNormalNode.id];

    cfg.createDisplayNodes();

    const actualStartNode = cfg.displayNodes[0];
    const actualNormalNode = cfg.displayNodes[1];
    const actualEndNode = cfg.displayNodes[2];

    expect(actualStartNode).to.deep.equal(expectedStartNode);
    expect(actualNormalNode).to.deep.equal(expectedNormalNode);
    expect(actualEndNode).to.deep.equal(expectedEndNode);
  });

  test("display nodes generated correctly without changing the visitor nodes", function () {
    const startNode = getStartNode();
    const endNode = getEndNode();

    const normalNodeLabel = "1000-INIT";

    const normalNode: Node = {
      id: "400",
      callers: [],
      callees: [],
      startLineNumber: 500,
      endLineNumber: 600,
      label: normalNodeLabel,
      type: NodeType.NORMAL,
    };

    normalNode.callers.push(startNode.id);
    startNode.callees = [normalNode.id, endNode.id];
    endNode.callers.push(startNode.id);
    const originalVisitorNodes = [startNode, normalNode, endNode];
    cfg.nodes = structuredClone(originalVisitorNodes);

    const expectedStartNode = getStartNode();
    const expectedNormalNode: Node = structuredClone(normalNode);
    const expectedEndNode = getEndNode();
    expectedStartNode.callees = [expectedNormalNode.id];
    expectedNormalNode.callers = [expectedStartNode.id];
    expectedNormalNode.callees = [expectedEndNode.id];
    expectedEndNode.callers = [expectedNormalNode.id];

    cfg.createDisplayNodes();

    const actualStartNode = cfg.displayNodes[0];
    const actualNormalNode = cfg.displayNodes[1];
    const actualEndNode = cfg.displayNodes[2];

    expect(actualStartNode).to.deep.equal(expectedStartNode);
    expect(actualNormalNode).to.deep.equal(expectedNormalNode);
    expect(actualEndNode).to.deep.equal(expectedEndNode);
    expect(cfg.nodes).to.deep.equal(originalVisitorNodes);
  });

  test("error thrown for callee not found when generate Display Nodes", function () {
    const startNode = getStartNode();
    const endNode = getEndNode();
    const non_existing_callee = "non-existing-callee";
    const normalNodeLabel = "1000-INIT";
    const normalNode: Node = {
      id: "400",
      callers: [],
      callees: [],
      startLineNumber: 500,
      endLineNumber: 600,
      label: normalNodeLabel,
      type: NodeType.NORMAL,
    };

    normalNode.callers.push(startNode.id);
    startNode.callees.push(normalNode.id);
    startNode.callees.push(non_existing_callee);
    startNode.callees.push(endNode.id);
    endNode.callers.push(startNode.id);
    cfg.nodes = [startNode, normalNode, endNode];

    expect(() => cfg.createDisplayNodes()).throws(
      "Callee " + non_existing_callee + " not found"
    );
  });

  test("display nodes generated correctly for node with multiple callers but no callee", function () {
    const startNode = getStartNode();
    const endNode = getEndNode();

    const callerNode: Node = {
      id: "400",
      callers: [],
      callees: [],
      startLineNumber: 500,
      endLineNumber: 600,
      label: "1000-INIT",
      type: NodeType.NORMAL,
    };

    const nodeWithMultipleCallers: Node = {
      id: "700",
      callers: [],
      callees: [],
      startLineNumber: 700,
      endLineNumber: 750,
      label: "2000-PROCESS",
      type: NodeType.NORMAL,
    };

    nodeWithMultipleCallers.callers = [startNode.id, callerNode.id];
    callerNode.callers.push(startNode.id);
    callerNode.callees.push(nodeWithMultipleCallers.id);
    startNode.callees = [nodeWithMultipleCallers.id, callerNode.id, endNode.id];
    endNode.callers.push(startNode.id);
    cfg.nodes = [startNode, callerNode, nodeWithMultipleCallers, endNode];

    cfg.createDisplayNodes();

    const expectedDisplayNodeId_1 = nodeWithMultipleCallers.id + "_1";
    const expectedDisplayNode_1 = structuredClone(nodeWithMultipleCallers);
    expectedDisplayNode_1.id = expectedDisplayNodeId_1;
    expectedDisplayNode_1.callers = [startNode.id];
    expectedDisplayNode_1.callees = [callerNode.id];

    const expectedDisplayNodeId_2 = nodeWithMultipleCallers.id + "_2";
    const expectedDisplayNode_2 = structuredClone(nodeWithMultipleCallers);
    expectedDisplayNode_2.id = expectedDisplayNodeId_2;
    expectedDisplayNode_2.callers = [callerNode.id];
    expectedDisplayNode_2.callees = [endNode.id];

    const actualStartNode = cfg.displayNodes.find((n) => n.id === startNode.id);
    const actualCallerNode = cfg.displayNodes.find(
      (n) => n.id === callerNode.id
    );
    const actualEndNode = cfg.displayNodes.find((n) => n.id === endNode.id);

    expect(cfg.displayNodes).to.contain.deep.members([
      expectedDisplayNode_1,
      expectedDisplayNode_2,
    ]);
    expect(actualStartNode!.callees).to.have.members([
      expectedDisplayNode_1.id,
    ]);
    expect(actualCallerNode!.callers).to.have.members([
      expectedDisplayNode_1.id,
    ]);
    expect(actualCallerNode!.callees).to.have.members([
      expectedDisplayNode_2.id,
    ]);
    expect(actualEndNode!.callers).to.have.members([expectedDisplayNode_2.id]);
    // assert that the original visitor nodes did not get modified.
    expect(cfg.nodes).to.have.members([
      startNode,
      callerNode,
      nodeWithMultipleCallers,
      endNode,
    ]);
  });

  test("display nodes generated correctly for node that calling itself", function () {
    const startNode = getStartNode();
    const endNode = getEndNode();

    const testNode: Node = {
      id: "400",
      callers: [],
      callees: [],
      startLineNumber: 500,
      endLineNumber: 600,
      label: "1000-INIT",
      type: NodeType.NORMAL,
    };

    testNode.callers = [startNode.id, testNode.id];
    testNode.callees = [testNode.id];
    startNode.callees = [testNode.id, endNode.id];
    endNode.callers.push(startNode.id);
    cfg.nodes = [startNode, testNode, endNode];

    cfg.createDisplayNodes();

    const expectedDisplayNodeId_1 = testNode.id + "_1";
    const expectedDisplayNode_1 = structuredClone(testNode);
    expectedDisplayNode_1.id = expectedDisplayNodeId_1;
    expectedDisplayNode_1.callers = [startNode.id];

    const expectedDisplayNodeId_2 = testNode.id + "_2";
    const expectedDisplayNode_2 = structuredClone(testNode);
    expectedDisplayNode_2.id = expectedDisplayNodeId_2;
    expectedDisplayNode_2.callers = [expectedDisplayNode_1.id];
    expectedDisplayNode_2.callees = [endNode.id];
    expectedDisplayNode_1.callees = [expectedDisplayNode_2.id];

    const actualStartNode = cfg.displayNodes.find((n) => n.id === startNode.id);
    const actualEndNode = cfg.displayNodes.find((n) => n.id === endNode.id);

    expect(cfg.displayNodes).to.contain.deep.members([
      expectedDisplayNode_1,
      expectedDisplayNode_2,
    ]);
    expect(actualStartNode!.callees).to.have.members([
      expectedDisplayNode_1.id,
    ]);
    expect(actualEndNode!.callers).to.have.members([expectedDisplayNode_2.id]);
    // assert that the original visitor nodes did not get modified.
    expect(cfg.nodes).to.have.members([startNode, testNode, endNode]);
  });

  test("display nodes generated correctly for node with multiple callers and callees", function () {
    const startNode = getStartNode();
    const endNode = getEndNode();

    const callerNode: Node = {
      id: "400",
      callers: [],
      callees: [],
      startLineNumber: 500,
      endLineNumber: 600,
      label: "1000-INIT",
      type: NodeType.NORMAL,
    };

    const nodeWithMultipleCallers: Node = {
      id: "700",
      callers: [],
      callees: [],
      startLineNumber: 700,
      endLineNumber: 750,
      label: "2000-PROCESS",
      type: NodeType.NORMAL,
    };

    const calleeNode: Node = {
      id: "800",
      callers: [],
      callees: [],
      startLineNumber: 800,
      endLineNumber: 850,
      label: "3000-PROCESS_DATA",
      type: NodeType.NORMAL,
    };

    calleeNode.callers.push(nodeWithMultipleCallers.id);
    nodeWithMultipleCallers.callers = [startNode.id, callerNode.id];
    nodeWithMultipleCallers.callees.push(calleeNode.id);
    callerNode.callers.push(startNode.id);
    callerNode.callees.push(nodeWithMultipleCallers.id);
    startNode.callees = [nodeWithMultipleCallers.id, callerNode.id, endNode.id];
    endNode.callers.push(startNode.id);
    cfg.nodes = [
      startNode,
      callerNode,
      nodeWithMultipleCallers,
      calleeNode,
      endNode,
    ];

    cfg.createDisplayNodes();

    const expectedDisplayNodeId_1 = nodeWithMultipleCallers.id + "_1";
    const expectedDisplayNode_1 = structuredClone(nodeWithMultipleCallers);
    expectedDisplayNode_1.id = expectedDisplayNodeId_1;
    expectedDisplayNode_1.callers = [startNode.id];

    const expectedDisplayNodeId_2 = nodeWithMultipleCallers.id + "_2";
    const expectedDisplayNode_2 = structuredClone(nodeWithMultipleCallers);
    expectedDisplayNode_2.id = expectedDisplayNodeId_2;
    expectedDisplayNode_2.callers = [callerNode.id];

    const expectedCalleeNodeId_1 = calleeNode.id + "_1";
    const expectedCalleeNode_1 = structuredClone(calleeNode);
    expectedCalleeNode_1.id = expectedCalleeNodeId_1;
    expectedCalleeNode_1.callers = [expectedDisplayNode_1.id];
    expectedCalleeNode_1.callees = [callerNode.id];
    expectedDisplayNode_1.callees = [expectedCalleeNode_1.id];

    const expectedCalleeNodeId_2 = calleeNode.id + "_2";
    const expectedCalleeNode_2 = structuredClone(calleeNode);
    expectedCalleeNode_2.id = expectedCalleeNodeId_2;
    expectedCalleeNode_2.callers = [expectedDisplayNode_2.id];
    expectedCalleeNode_2.callees = [endNode.id];
    expectedDisplayNode_2.callees = [expectedCalleeNode_2.id];

    const actualStartNode = cfg.displayNodes.find((n) => n.id === startNode.id);
    const actualCallerNode = cfg.displayNodes.find(
      (n) => n.id === callerNode.id
    );
    const actualEndNode = cfg.displayNodes.find((n) => n.id === endNode.id);

    expect(cfg.displayNodes).to.contain.deep.members([
      expectedDisplayNode_1,
      expectedDisplayNode_2,
      expectedCalleeNode_1,
      expectedCalleeNode_2,
    ]);
    expect(actualStartNode!.callees).to.have.members([
      expectedDisplayNode_1.id,
    ]);
    expect(actualCallerNode!.callers).to.have.members([
      expectedCalleeNode_1.id,
    ]);
    expect(actualCallerNode!.callees).to.have.members([
      expectedDisplayNode_2.id,
    ]);
    expect(actualEndNode!.callers).to.have.members([expectedCalleeNode_2.id]);
    // assert that the original visitor nodes did not get modified.
    expect(cfg.nodes).to.have.members([
      startNode,
      callerNode,
      nodeWithMultipleCallers,
      calleeNode,
      endNode,
    ]);
  });

  test("display nodes generated correctly for IF", function () {
    const startNode = getStartNode();
    const endNode = getEndNode();

    const normalNode: Node = {
      id: "700",
      callers: [],
      callees: [],
      startLineNumber: 700,
      endLineNumber: 800,
      label: "1000-INIT",
      type: NodeType.NORMAL,
    };

    const conditionNodeLabel = "IF OFFICIAL-RATE EQUALS ZEROES";
    const conditionNode: Node = {
      id: "400",
      callers: [],
      callees: [],
      startLineNumber: 400,
      endLineNumber: 850,
      label: conditionNodeLabel,
      type: NodeType.CONDITION,
    };

    conditionNode.callers.push(startNode.id);
    normalNode.callers.push(startNode.id);
    startNode.callees = [conditionNode.id, normalNode.id, endNode.id];
    endNode.callers.push(startNode.id);
    cfg.nodes = [startNode, conditionNode, normalNode, endNode];

    const expectedStartNode = getStartNode();
    const expectedConditionNode: Node = structuredClone(conditionNode);
    const expectedNormalNode: Node = structuredClone(normalNode);
    const expectedEndNode = getEndNode();
    expectedStartNode.callees = [expectedConditionNode.id];
    expectedConditionNode.callers = [expectedStartNode.id];
    expectedConditionNode.callees = [expectedNormalNode.id];
    expectedNormalNode.callers = [expectedConditionNode.id];
    expectedNormalNode.callees = [expectedEndNode.id];
    expectedEndNode.callers = [expectedNormalNode.id];

    cfg.createDisplayNodes();

    const actualStartNode = cfg.displayNodes[0];
    const actualConditionNode = cfg.displayNodes[1];
    const actualNormalNode = cfg.displayNodes[2];
    const actualEndNode = cfg.displayNodes[3];

    expect(actualStartNode).to.deep.equal(expectedStartNode);
    expect(actualConditionNode).to.deep.equal(expectedConditionNode);
    expect(actualNormalNode).to.deep.equal(expectedNormalNode);
    expect(actualEndNode).to.deep.equal(expectedEndNode);
  });

  // TODO: take out the logic for condition to another function
  // so the idea is to check by endif and if the caller is condition node then
  // remove both condition and endif node from display node and bind the
  // caller of condition node and callee of the endif node together, the same applied
  // to else node
  // check there's any else node in between if and endif node, if none then
  // push the condition node as caller for the callee of endif node and vice versa,
  // remove the end if node afterwards
  // scenario 1: if have normal node, no else
  // scenario 2: if have normal node, have else, no normal node
  // scenario 3: if have normal node, have else, have normal node
  // scenario 4: if don't have normal node, no else
  // scenario 5: if don't have normal node, have else, no normal node
  // scenario 6: if don't have normal node, have else, have normal node

  test("display nodes generated correctly for IF-ELSE", function () {
    const startNode = getStartNode();
    const endNode = getEndNode();

    const conditionNodeLabel = "IF OFFICIAL-RATE EQUALS ZEROES";
    const conditionNode: Node = {
      id: "400",
      callers: [],
      callees: [],
      startLineNumber: 400,
      endLineNumber: 850,
      label: conditionNodeLabel,
      type: NodeType.CONDITION,
    };

    const ifTrueNode: Node = {
      id: "500",
      callers: [],
      callees: [],
      startLineNumber: 500,
      endLineNumber: 600,
      label: "1000-INIT",
      type: NodeType.NORMAL,
    };

    const elseNode: Node = {
      id: "601",
      callers: [],
      callees: [],
      startLineNumber: 601,
      endLineNumber: 800,
      label: "ELSE",
      type: NodeType.CONDITION_ELSE,
    };

    const ifFalseNode: Node = {
      id: "700",
      callers: [],
      callees: [],
      startLineNumber: 700,
      endLineNumber: 800,
      label: "2000-INIT",
      type: NodeType.NORMAL,
    };

    conditionNode.callers.push(startNode.id);
    ifTrueNode.callers.push(startNode.id);
    elseNode.callers.push(startNode.id);
    ifFalseNode.callers.push(startNode.id);
    startNode.callees = [
      conditionNode.id,
      ifTrueNode.id,
      elseNode.id,
      ifFalseNode.id,
      endNode.id,
    ];
    endNode.callers.push(startNode.id);
    cfg.nodes = [
      startNode,
      conditionNode,
      ifTrueNode,
      elseNode,
      ifFalseNode,
      endNode,
    ];

    const expectedStartNode = getStartNode();
    const expectedConditionNode: Node = structuredClone(conditionNode);
    const expectedIfTrueNode: Node = structuredClone(ifTrueNode);
    const expectedIfFalseNode: Node = structuredClone(ifFalseNode);
    const expectedEndNode = getEndNode();
    expectedStartNode.callees = [expectedConditionNode.id];
    expectedConditionNode.callers = [expectedStartNode.id];
    expectedConditionNode.callees = [
      expectedIfTrueNode.id,
      expectedIfFalseNode.id,
    ];
    expectedIfTrueNode.callers = [expectedConditionNode.id];
    expectedIfTrueNode.callees = [expectedEndNode.id];
    expectedIfFalseNode.callers = [expectedConditionNode.id];
    expectedIfFalseNode.callees = [expectedEndNode.id];
    expectedEndNode.callers = [expectedIfTrueNode.id, expectedIfFalseNode.id];

    cfg.createDisplayNodes();

    const actualStartNode = cfg.displayNodes[0];
    const actualConditionNode = cfg.displayNodes[1];
    const actualIfTrueNode = cfg.displayNodes[2];
    const actualIfFalseNode = cfg.displayNodes[3];
    const actualEndNode = cfg.displayNodes[4];

    expect(actualStartNode).to.deep.equal(expectedStartNode);
    expect(actualConditionNode).to.deep.equal(expectedConditionNode);
    expect(actualIfTrueNode).to.deep.equal(expectedIfTrueNode);
    expect(actualIfFalseNode).to.deep.equal(expectedIfFalseNode);
    expect(actualEndNode).to.deep.equal(expectedEndNode);
  });

  test("display nodes generated correctly for IF-ELIF-ELSE", function () {
    const startNode = getStartNode();
    const endNode = getEndNode();

    const conditionNodeLabel = "IF OFFICIAL-RATE EQUALS ZEROES";
    const conditionNode: Node = {
      id: "400",
      callers: [],
      callees: [],
      startLineNumber: 400,
      endLineNumber: 850,
      label: conditionNodeLabel,
      type: NodeType.CONDITION,
    };

    const ifTrueNode: Node = {
      id: "401",
      callers: [],
      callees: [],
      startLineNumber: 401,
      endLineNumber: 500,
      label: "1000-INIT",
      type: NodeType.NORMAL,
    };

    const elseNode1: Node = {
      id: "501",
      callers: [],
      callees: [],
      startLineNumber: 501,
      endLineNumber: 700,
      label: "ELSE",
      type: NodeType.CONDITION_ELSE,
    };

    const conditionNode2: Node = {
      id: "502",
      callers: [],
      callees: [],
      startLineNumber: 502,
      endLineNumber: 600,
      label: conditionNodeLabel,
      type: NodeType.NORMAL,
    };

    const elseIfTrueNode: Node = {
      id: "503",
      callers: [],
      callees: [],
      startLineNumber: 503,
      endLineNumber: 600,
      label: "2000-INIT",
      type: NodeType.NORMAL,
    };

    const elseNode2: Node = {
      id: "601",
      callers: [],
      callees: [],
      startLineNumber: 601,
      endLineNumber: 800,
      label: "ELSE",
      type: NodeType.CONDITION_ELSE,
    };

    const elseIfFalseNode: Node = {
      id: "602",
      callers: [],
      callees: [],
      startLineNumber: 602,
      endLineNumber: 800,
      label: "3000-INIT",
      type: NodeType.NORMAL,
    };

    conditionNode.callers.push(startNode.id);
    ifTrueNode.callers.push(startNode.id);
    elseNode1.callers.push(startNode.id);
    conditionNode2.callers.push(startNode.id);
    elseIfTrueNode.callers.push(startNode.id);
    elseNode2.callers.push(startNode.id);
    elseIfFalseNode.callers.push(startNode.id);
    startNode.callees = [
      conditionNode.id,
      ifTrueNode.id,
      elseNode1.id,
      conditionNode2.id,
      elseIfTrueNode.id,
      elseNode2.id,
      elseIfFalseNode.id,
      endNode.id,
    ];
    endNode.callers.push(startNode.id);
    cfg.nodes = [
      startNode,
      conditionNode,
      ifTrueNode,
      elseNode1,
      conditionNode2,
      elseIfTrueNode,
      elseNode2,
      elseIfFalseNode,
      endNode,
    ];

    const expectedStartNode = getStartNode();
    const expectedConditionNode: Node = structuredClone(conditionNode);
    const expectedIfTrueNode: Node = structuredClone(ifTrueNode);
    const expectedConditionNode2: Node = structuredClone(conditionNode2);
    const expectedElseIfTrueNode: Node = structuredClone(elseIfTrueNode);
    const expectedElseIfFalseNode: Node = structuredClone(elseIfFalseNode);
    const expectedEndNode = getEndNode();
    expectedStartNode.callees = [expectedConditionNode.id];
    expectedConditionNode.callers = [expectedStartNode.id];
    expectedConditionNode.callees = [expectedIfTrueNode.id, conditionNode2.id];
    expectedIfTrueNode.callers = [expectedConditionNode.id];
    expectedIfTrueNode.callees = [expectedEndNode.id];
    expectedConditionNode2.callers = [expectedConditionNode.id];
    expectedConditionNode2.callees = [
      expectedElseIfTrueNode.id,
      expectedElseIfFalseNode.id,
    ];
    expectedElseIfTrueNode.callers = [expectedConditionNode2.id];
    expectedElseIfTrueNode.callees = [expectedEndNode.id];
    expectedElseIfFalseNode.callers = [expectedConditionNode2.id];
    expectedElseIfFalseNode.callees = [expectedEndNode.id];
    expectedEndNode.callers = [
      expectedIfTrueNode.id,
      expectedElseIfTrueNode.id,
      expectedElseIfFalseNode.id,
    ];

    cfg.createDisplayNodes();

    const actualStartNode = cfg.displayNodes[0];
    const actualConditionNode = cfg.displayNodes[1];
    const actualIfTrueNode = cfg.displayNodes[2];
    const actualConditionNode2 = cfg.displayNodes[3];
    const actualElseIfTrueNode = cfg.displayNodes[4];
    const actualElseIfFalseNode = cfg.displayNodes[5];
    const actualEndNode = cfg.displayNodes[6];

    expect(actualStartNode).to.deep.equal(expectedStartNode);
    expect(actualConditionNode).to.deep.equal(expectedConditionNode);
    expect(actualIfTrueNode).to.deep.equal(actualIfTrueNode);
    expect(actualConditionNode2).to.deep.equal(expectedConditionNode2);
    expect(actualElseIfTrueNode).to.deep.equal(expectedElseIfTrueNode);
    expect(actualElseIfFalseNode).to.deep.equal(expectedElseIfFalseNode);
    expect(actualEndNode).to.deep.equal(expectedEndNode);
  });

  test("display nodes generated correctly for nested IF-ELSE", function () {
    const startNode = getStartNode();
    const endNode = getEndNode();

    const conditionNodeLabel = "IF OFFICIAL-RATE EQUALS ZEROES";
    const conditionNode: Node = {
      id: "400",
      callers: [],
      callees: [],
      startLineNumber: 400,
      endLineNumber: 850,
      label: conditionNodeLabel,
      type: NodeType.CONDITION,
    };

    const nestedConditionNode: Node = {
      id: "500",
      callers: [],
      callees: [],
      startLineNumber: 500,
      endLineNumber: 800,
      label: conditionNodeLabel,
      type: NodeType.CONDITION,
    };

    const nestedIfTrueNode: Node = {
      id: "600",
      callers: [],
      callees: [],
      startLineNumber: 600,
      endLineNumber: 700,
      label: "1000-INIT",
      type: NodeType.NORMAL,
    };

    const elseNode: Node = {
      id: "701",
      callers: [],
      callees: [],
      startLineNumber: 701,
      endLineNumber: 800,
      label: "ELSE",
      type: NodeType.CONDITION_ELSE,
    };

    const nestedIfFalseNode: Node = {
      id: "702",
      callers: [],
      callees: [],
      startLineNumber: 702,
      endLineNumber: 800,
      label: "2000-INIT",
      type: NodeType.NORMAL,
    };

    conditionNode.callers.push(startNode.id);
    nestedConditionNode.callers.push(startNode.id);
    nestedIfTrueNode.callers.push(startNode.id);
    elseNode.callers.push(startNode.id);
    nestedIfFalseNode.callers.push(startNode.id);
    startNode.callees = [
      conditionNode.id,
      nestedConditionNode.id,
      nestedIfTrueNode.id,
      elseNode.id,
      nestedIfFalseNode.id,
      endNode.id,
    ];
    endNode.callers.push(startNode.id);
    cfg.nodes = [
      startNode,
      conditionNode,
      nestedConditionNode,
      nestedIfTrueNode,
      elseNode,
      nestedIfFalseNode,
      endNode,
    ];

    const expectedStartNode = getStartNode();
    const expectedConditionNode: Node = structuredClone(conditionNode);
    const expectedNestedConditionNode: Node =
      structuredClone(nestedConditionNode);
    const expectedNestedIfTrueNode: Node = structuredClone(nestedIfTrueNode);
    const expectedNestedIfFalseNode: Node = structuredClone(nestedIfFalseNode);
    const expectedEndNode = getEndNode();
    expectedStartNode.callees = [expectedConditionNode.id];
    expectedConditionNode.callers = [expectedStartNode.id];
    expectedConditionNode.callees = [expectedNestedConditionNode.id];
    expectedNestedConditionNode.callers = [expectedConditionNode.id];
    expectedNestedConditionNode.callees = [
      expectedNestedIfTrueNode.id,
      expectedNestedIfFalseNode.id,
    ];
    expectedNestedIfTrueNode.callers = [expectedNestedConditionNode.id];
    expectedNestedIfTrueNode.callees = [expectedEndNode.id];
    expectedNestedIfFalseNode.callers = [expectedNestedConditionNode.id];
    expectedNestedIfFalseNode.callees = [expectedEndNode.id];
    expectedEndNode.callers = [
      expectedNestedIfTrueNode.id,
      expectedNestedIfFalseNode.id,
    ];

    cfg.createDisplayNodes();

    const actualStartNode = cfg.displayNodes[0];
    const actualConditionNode = cfg.displayNodes[1];
    const actualNestedConditionNode = cfg.displayNodes[2];
    const actualNestedIfTrueNode = cfg.displayNodes[3];
    const actualNestedIfFalseNode = cfg.displayNodes[4];
    const actualEndNode = cfg.displayNodes[5];

    expect(actualStartNode).to.deep.equal(expectedStartNode);
    expect(actualConditionNode).to.deep.equal(expectedConditionNode);
    expect(actualNestedConditionNode).to.deep.equal(actualNestedConditionNode);
    expect(actualNestedIfTrueNode).to.deep.equal(actualNestedIfTrueNode);
    expect(actualNestedIfFalseNode).to.deep.equal(actualNestedIfFalseNode);
    expect(actualEndNode).to.deep.equal(expectedEndNode);
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
