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

  function formEdge(source: string, target: string, isLoopBackEdge: boolean) {
    return {
      id: source + "-" + target,
      source: source,
      target: target,
      isLoopBackEdge: isLoopBackEdge,
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

  // test("sample", function () {
  //   const cfgTest = new ControlFlowGraph();
  //   cfgTest.generateGraph(
  //     "C://Users//khims//Downloads//cbl-test//online//onrpt//bpsr005.cbl"
  //   );
  // });

  test("the normal node with no caller will be removed", function () {
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );
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
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );
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
      "0000-MAIN-ROUTINE",
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

  test("the loop node with no callee will be removed", function () {
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );

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
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );

    const loopNode = formNode(
      "400",
      "PERFORM UNTIL SQLCODE = CC-NOT-FOUND",
      NodeType.LOOP,
      400,
      800
    );

    const nestedLoopNode = formNode(
      "501",
      "PERFORM UNTIL SQLCODE NOT EQUAL CC-NOT-FOUND",
      NodeType.LOOP,
      501,
      600
    );

    setCallerCallee(startNode, loopNode);
    setCallerCallee(loopNode, nestedLoopNode);
    cfg.addRawNodes([startNode, loopNode, nestedLoopNode]);

    cfg.generateDisplayNodes();

    expect(cfg.getRawNodes().length).to.equal(1);
    expect(cfg.getRawNodes()).to.be.deep.equal([startNode]);
  });

  test("the loop node will NOT be removed when there's a normal node as descendant", function () {
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );

    const loopNode = formNode(
      "400",
      "PERFORM UNTIL SQLCODE = CC-NOT-FOUND",
      NodeType.LOOP,
      400,
      800
    );

    const nestedLoopNode = formNode(
      "501",
      "PERFORM UNTIL SQLCODE = CC-NOT-FOUND",
      NodeType.LOOP,
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
    setCallerCallee(loopNode, nestedLoopNode);
    setCallerCallee(nestedLoopNode, normalNodeDescendant);

    cfg.addRawNodes([
      startNode,
      loopNode,
      nestedLoopNode,
      normalNodeDescendant,
    ]);

    cfg.generateDisplayNodes();

    expect(cfg.getRawNodes().length).to.equal(4);
    expect(cfg.getRawNodes()).to.be.deep.equal([
      startNode,
      loopNode,
      nestedLoopNode,
      normalNodeDescendant,
    ]);
  });

  test("the loop node with no caller will be removed", function () {
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );
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
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );
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
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );
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
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );

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
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );
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
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );
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

  test("infinite loop", function () {
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );

    const node2 = formNode("300", "1000-INIT", NodeType.NORMAL, 300, 400);
    const node3 = formNode("500", "2000-PROCESS", NodeType.NORMAL, 500, 600);
    const node4 = formNode("700", "3000-PROCESS", NodeType.NORMAL, 700, 800);
    const node5 = formNode("900", "4000-PROCESS", NodeType.NORMAL, 900, 1000);

    // infinite loop: node2 -> node3 -> node5 -> node2
    setCallerCallee(startNode, node2);
    setCallerCallee(node2, node3);
    setCallerCallee(node2, node4);
    setCallerCallee(node3, node5);
    setCallerCallee(node5, node2);

    cfg.addRawNodes([startNode, node2, node3, node4, node5]);

    cfg.generateDisplayNodes();

    expect(cfg.getDisplayNodes().length).to.be.equal(6);
    const node2_dup = cfg
      .getDisplayNodes()
      .find((node) => node.id === node2.id + "_2");
    expect(node2_dup?.callees).to.be.deep.equal([node4.id + "_1"]);
    expect(
      cfg.getDisplayNodes()[cfg.getDisplayNodes().length - 1].id
    ).to.be.equal(node4.id + "_1");
  });

  test("the edges generated correctly for display nodes that has no condition node and loop node", function () {
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );
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
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );
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

  test("edges generated correctly for the last loop node callee and loop node", function () {
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );
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

  test("edges generated correctly for the last loop node callee and loop node 2", function () {
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );
    const loopNode = formNode("300", "1000-LOOP", NodeType.LOOP, 300, 400);
    const calleeNode = formNode(
      "500",
      "2000-PROCESS",
      NodeType.NORMAL,
      500,
      600
    );

    const lastCalleeNodeInLoop = formNode(
      "700",
      "3000-PROCESS",
      NodeType.NORMAL,
      700,
      800
    );

    const calleeNodeOfLastNodeInLoop = formNode(
      "1001",
      "5000-PROCESS",
      NodeType.NORMAL,
      1001,
      1100
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
    setCallerCallee(loopNode, lastCalleeNodeInLoop);
    setCallerCallee(lastCalleeNodeInLoop, calleeNodeOfLastNodeInLoop);
    setCallerCallee(startNode, afterLoopNode);
    cfg.addRawNodes([
      startNode,
      loopNode,
      calleeNode,
      lastCalleeNodeInLoop,
      calleeNodeOfLastNodeInLoop,
      afterLoopNode,
    ]);

    cfg.generateDisplayNodes();
    cfg.generateEdges();

    const expectedE1 = formEdge(startNode.id, loopNode.id, false);
    const expectedE2 = formEdge(loopNode.id, calleeNode.id, false);
    const expectedE3 = formEdge(calleeNode.id, lastCalleeNodeInLoop.id, false);
    const expectedE4 = formEdge(
      lastCalleeNodeInLoop.id,
      calleeNodeOfLastNodeInLoop.id,
      false
    );
    const expectedE5 = formEdge(
      calleeNodeOfLastNodeInLoop.id,
      loopNode.id,
      true
    );
    const expectedE6 = formEdge(
      calleeNodeOfLastNodeInLoop.id,
      afterLoopNode.id,
      false
    );

    expect(cfg.getEdges()).to.be.deep.equal([
      expectedE1,
      expectedE2,
      expectedE3,
      expectedE4,
      expectedE5,
      expectedE6,
    ]);
  });

  test("edges generated correctly for the inner loop node and its callee in another loop node", function () {
    const startNode = formNode(
      "100",
      "0000-MAIN-ROUTINE",
      NodeType.START,
      100,
      200
    );
    const loopNode = formNode("300", "1000-LOOP", NodeType.LOOP, 300, 400);
    const innerLoopNode = formNode("401", "2000-LOOP", NodeType.LOOP, 401, 450);
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
    setCallerCallee(loopNode, innerLoopNode);
    setCallerCallee(loopNode, lastCalleeNode);
    setCallerCallee(innerLoopNode, calleeNode);
    setCallerCallee(startNode, afterLoopNode);
    cfg.addRawNodes([
      startNode,
      loopNode,
      innerLoopNode,
      lastCalleeNode,
      calleeNode,
      afterLoopNode,
    ]);

    cfg.generateDisplayNodes();
    cfg.generateEdges();

    const expectedE1 = formEdge(startNode.id, loopNode.id, false);
    const expectedE2 = formEdge(loopNode.id, innerLoopNode.id, false);
    const expectedE3 = formEdge(innerLoopNode.id, calleeNode.id, false);
    const expectedE4 = formEdge(calleeNode.id, innerLoopNode.id, true);
    const expectedE5 = formEdge(calleeNode.id, lastCalleeNode.id, false);
    const expectedE6 = formEdge(lastCalleeNode.id, loopNode.id, true);
    const expectedE7 = formEdge(lastCalleeNode.id, afterLoopNode.id, false);

    expect(cfg.getEdges()).to.be.deep.equal([
      expectedE1,
      expectedE2,
      expectedE3,
      expectedE4,
      expectedE5,
      expectedE6,
      expectedE7,
    ]);
  });
});
