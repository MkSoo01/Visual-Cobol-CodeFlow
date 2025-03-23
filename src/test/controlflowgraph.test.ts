const chai = require("chai");
const sinonChai = require("sinon-chai");
import { ControlFlowGraph, Edge } from "../ControlFlowGraph";
import { Node, NodeType } from "../ControlFlowVisitor";

chai.use(sinonChai);
const expect = chai.expect;

suite("Tests for Control Flow Graph", () => {
  let cfg: ControlFlowGraph;
  const startNode: Node = {
    id: "100",
    label: "0000-MAIN-ROUTINE",
    type: NodeType.START,
    startLineNumber: 100,
    endLineNumber: 150,
    callers: [],
    callees: ["1000-INIT", "2000-PROCESS"],
  };
  const endNode: Node = {
    id: "150",
    label: "0000-EXIT",
    type: NodeType.END,
    startLineNumber: 150,
    endLineNumber: 150,
    callers: [],
    callees: [],
  };
  const nodeWithMultipleCallers: Node = {
    id: "500",
    label: "3000-PROCESS-DATA",
    type: NodeType.NORMAL,
    startLineNumber: 500,
    endLineNumber: 550,
    callers: ["1000-INIT", "8005-GET-DATE"],
    callees: ["8006-AUDIT-DATA"],
  };

  const testData1: Node[] = [
    {
      id: "235",
      label: "0000-MAIN-ROUTINE",
      type: NodeType.START,
      startLineNumber: 235,
      endLineNumber: 256,
      callers: [],
      callees: [
        "1000-INIT",
        "8001-GET-DATE",
        "245",
        "8015-DELETE",
        "2000-PROCESS",
      ],
    },
    {
      id: "256",
      label: "0000-EXIT",
      type: NodeType.END,
      startLineNumber: 256,
      endLineNumber: 256,
      callers: [],
      callees: [],
    },
    {
      id: "245",
      label: "IF DT-BUSINESS OF BUSINESS-DATES NOT EQUALS SPACES",
      type: NodeType.CONDITION,
      startLineNumber: 245,
      endLineNumber: 253,
      callers: ["0000-MAIN-ROUTINE"],
      callees: [],
    },
    {
      id: "271",
      label: "1000-INIT",
      type: NodeType.NORMAL,
      startLineNumber: 271,
      endLineNumber: 274,
      callers: ["0000-MAIN-ROUTINE"],
      callees: [],
    },
    {
      id: "279",
      label: "2000-PROCESS",
      type: NodeType.NORMAL,
      startLineNumber: 279,
      endLineNumber: 288,
      callers: ["0000-MAIN-ROUTINE"],
      callees: ["2100-PROCESS-MARGIN"],
    },
    {
      id: "294",
      label: "2100-PROCESS-MARGIN",
      type: NodeType.NORMAL,
      startLineNumber: 294,
      endLineNumber: 319,
      callers: ["2000-PROCESS"],
      callees: [
        "8004-OPEN-BUYER-SELLER",
        "8005-FETCH-BUYER-SELLER",
        "304",
        "305",
        "8009-GET-NM-PARTICIPANT",
        "2200-GET-SUMMARY",
        "8005-FETCH-BUYER-SELLER",
      ],
    },
    {
      id: "304",
      label: "IF ID-COUNTER-PREV NOT EQUALS ZEROS",
      type: NodeType.CONDITION,
      startLineNumber: 304,
      endLineNumber: 317,
      callers: ["2100-PROCESS-MARGIN"],
      callees: [],
    },
    {
      id: "305",
      label: "PERFORM UNTIL SQLCODE = CC-NOT-FOUND",
      type: NodeType.LOOP,
      startLineNumber: 305,
      endLineNumber: 316,
      callers: ["2100-PROCESS-MARGIN"],
      callees: [],
    },
    {
      id: "324",
      label: "2200-GET-SUMMARY",
      type: NodeType.NORMAL,
      startLineNumber: 324,
      endLineNumber: 376,
      callers: ["2100-PROCESS-MARGIN"],
      callees: [
        "8003-GET-IDCOUNTER",
        "8002-FETCH-IDCOUNTER",
        "339",
        "340",
        "3000-GET-OFFICIAL-RATE",
        "3100-GET-FHVAR",
        "8010-GET-CHANGE-PRICE",
        "8011-GET-MTMSELLER-1",
        "8012-GET-MTMSELLER",
        "8013-GET-MTMBUYER-1",
        "8014-GET-MTMBUYER",
        "2201-PROCESS-SUMMARY",
        "8002-FETCH-IDCOUNTER",
        "2202-INSERT-BACKTESTING",
        "8016-INSERT",
      ],
    },
    {
      id: "339",
      label: "IF ID-COUNTER-PREV NOT EQUALS ZEROS",
      type: NodeType.CONDITION,
      startLineNumber: 339,
      endLineNumber: 375,
      callers: ["2200-GET-SUMMARY"],
      callees: [],
    },
    {
      id: "340",
      label: "PERFORM UNTIL SQLCODE = CC-NOT-FOUND",
      type: NodeType.LOOP,
      startLineNumber: 340,
      endLineNumber: 370,
      callers: ["2200-GET-SUMMARY"],
      callees: [],
    },
    {
      id: "378",
      label: "3000-GET-OFFICIAL-RATE",
      type: NodeType.NORMAL,
      startLineNumber: 378,
      endLineNumber: 396,
      callers: ["2200-GET-SUMMARY"],
      callees: ["388"],
    },
    {
      id: "388",
      label: "IF COUNTER-OFFICIAL-RATE EQUALS ZEROES",
      type: NodeType.CONDITION,
      startLineNumber: 388,
      endLineNumber: 394,
      callers: ["3000-GET-OFFICIAL-RATE"],
      callees: [],
    },
    {
      id: "398",
      label: "3100-GET-FHVAR",
      type: NodeType.NORMAL,
      startLineNumber: 398,
      endLineNumber: 414,
      callers: ["2200-GET-SUMMARY"],
      callees: [],
    },
    {
      id: "419",
      label: "2201-PROCESS-SUMMARY",
      type: NodeType.NORMAL,
      startLineNumber: 419,
      endLineNumber: 440,
      callers: ["2200-GET-SUMMARY"],
      callees: [],
    },
    {
      id: "442",
      label: "2202-INSERT-BACKTESTING",
      type: NodeType.NORMAL,
      startLineNumber: 442,
      endLineNumber: 454,
      callers: ["2200-GET-SUMMARY"],
      callees: [],
    },
    {
      id: "459",
      label: "2203-CLEAR-STAGING",
      type: NodeType.NORMAL,
      startLineNumber: 459,
      endLineNumber: 477,
      callers: ["8005-FETCH-BUYER-SELLER"],
      callees: [],
    },
    {
      id: "482",
      label: "8001-GET-DATE",
      type: NodeType.NORMAL,
      startLineNumber: 482,
      endLineNumber: 497,
      callers: ["0000-MAIN-ROUTINE"],
      callees: [],
    },
    {
      id: "499",
      label: "8002-FETCH-IDCOUNTER",
      type: NodeType.NORMAL,
      startLineNumber: 499,
      endLineNumber: 512,
      callers: ["2200-GET-SUMMARY", "2200-GET-SUMMARY"],
      callees: [],
    },
    {
      id: "515",
      label: "8003-GET-IDCOUNTER",
      type: NodeType.NORMAL,
      startLineNumber: 515,
      endLineNumber: 525,
      callers: ["2200-GET-SUMMARY"],
      callees: [],
    },
    {
      id: "530",
      label: "8004-OPEN-BUYER-SELLER",
      type: NodeType.NORMAL,
      startLineNumber: 530,
      endLineNumber: 539,
      callers: ["2100-PROCESS-MARGIN"],
      callees: [],
    },
    {
      id: "544",
      label: "8005-FETCH-BUYER-SELLER",
      type: NodeType.NORMAL,
      startLineNumber: 544,
      endLineNumber: 560,
      callers: ["2100-PROCESS-MARGIN", "2100-PROCESS-MARGIN"],
      callees: ["2203-CLEAR-STAGING", "8010A-GET-MAX-DT-FHVAR"],
    },
    {
      id: "613",
      label: "8009-GET-NM-PARTICIPANT",
      type: NodeType.NORMAL,
      startLineNumber: 613,
      endLineNumber: 625,
      callers: ["2100-PROCESS-MARGIN"],
      callees: [],
    },
    {
      id: "630",
      label: "8010-GET-CHANGE-PRICE",
      type: NodeType.NORMAL,
      startLineNumber: 630,
      endLineNumber: 646,
      callers: ["2200-GET-SUMMARY"],
      callees: [],
    },
    {
      id: "651",
      label: "8010A-GET-MAX-DT-FHVAR",
      type: NodeType.NORMAL,
      startLineNumber: 651,
      endLineNumber: 663,
      callers: ["8005-FETCH-BUYER-SELLER"],
      callees: [],
    },
    {
      id: "668",
      label: "8011-GET-MTMSELLER-1",
      type: NodeType.NORMAL,
      startLineNumber: 668,
      endLineNumber: 685,
      callers: ["2200-GET-SUMMARY"],
      callees: [],
    },
    {
      id: "688",
      label: "8012-GET-MTMSELLER",
      type: NodeType.NORMAL,
      startLineNumber: 688,
      endLineNumber: 706,
      callers: ["2200-GET-SUMMARY"],
      callees: [],
    },
    {
      id: "709",
      label: "8013-GET-MTMBUYER-1",
      type: NodeType.NORMAL,
      startLineNumber: 709,
      endLineNumber: 726,
      callers: ["2200-GET-SUMMARY"],
      callees: [],
    },
    {
      id: "729",
      label: "8014-GET-MTMBUYER",
      type: NodeType.NORMAL,
      startLineNumber: 729,
      endLineNumber: 749,
      callers: ["2200-GET-SUMMARY"],
      callees: [],
    },
    {
      id: "751",
      label: "8015-DELETE",
      type: NodeType.NORMAL,
      startLineNumber: 751,
      endLineNumber: 765,
      callers: ["0000-MAIN-ROUTINE"],
      callees: [],
    },
    {
      id: "770",
      label: "8016-INSERT",
      type: NodeType.NORMAL,
      startLineNumber: 770,
      endLineNumber: 799,
      callers: ["2200-GET-SUMMARY"],
      callees: [],
    },
  ];
  const testData2: Node[] = [
    startNode,
    endNode,
    {
      id: "200",
      label: "1000-INIT",
      type: NodeType.NORMAL,
      startLineNumber: 200,
      endLineNumber: 250,
      callers: ["0000-MAIN-ROUTINE"],
      callees: [],
    },
    {
      id: "300",
      label: "2000-PROCESS",
      type: NodeType.NORMAL,
      startLineNumber: 300,
      endLineNumber: 350,
      callers: ["0000-MAIN-ROUTINE"],
      callees: ["8005-GET-DATE"],
    },
    {
      id: "400",
      label: "8005-GET-DATE",
      type: NodeType.NORMAL,
      startLineNumber: 400,
      endLineNumber: 450,
      callers: ["2000-PROCESS"],
      callees: [],
    },
  ];
  const testData3: Node[] = [
    ...testData2,
    nodeWithMultipleCallers,
    {
      id: "600",
      label: "8006-AUDIT-DATA",
      type: NodeType.NORMAL,
      startLineNumber: 600,
      endLineNumber: 650,
      callers: ["3000-PROCESS-DATA"],
      callees: ["8007-UPDATE-DATA"],
    },
    {
      id: "700",
      label: "8007-UPDATE-DATA",
      type: NodeType.NORMAL,
      startLineNumber: 700,
      endLineNumber: 750,
      callers: ["8006-AUDIT-DATA"],
      callees: [],
    },
  ];

  // find the callees of the condition node based on the startlinenumber and endlinenumber
  // find a way to differentiate else if and else from the
  // callees of the condition node

  // find the callees of the loop node based on the startlinenumber and endlinenumber
  // node with multiple caller need to be duplicated to be displayed
  // and it includes the callees of the node with multiple callers and its callees recursively until no callee left

  // simple scenario 1: no nodes with multiple callers, no condition node and loop node
  // just start node, normal node and end node

  setup(async function () {
    cfg = new ControlFlowGraph();
  });

  function getStartNode(): Node {
    return {
      id: "500",
      callers: [],
      callees: [],
      startLineNumber: 100,
      endLineNumber: 200,
      label: "0000-START",
      type: NodeType.START,
    };
  }

  function getEndNode(): Node {
    return {
      id: "600",
      callers: [],
      callees: [],
      startLineNumber: 300,
      endLineNumber: 400,
      label: "0000-END",
      type: NodeType.END,
    };
  }

  test("display nodes generated correctly for simple scenario with one normal node, start node and end node", function () {
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

  test("display nodes generated correctly for simple scenario with one normal node, one condition node, start node and end node", function () {
    const startNode = getStartNode();
    const endNode = getEndNode();

    const normalNodeLabel = "1000-INIT";

    const normalNode: Node = {
      id: "700",
      callers: [],
      callees: [],
      startLineNumber: 700,
      endLineNumber: 800,
      label: normalNodeLabel,
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

  // TODO: test else if and nested if and else node

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
