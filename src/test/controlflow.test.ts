const chai = require("chai");
import { VisualCobolLexer } from "../generated/VisualCobolLexer";
import { VisualCobolParser } from "../generated/VisualCobolParser";
import { ControlFlowVisitor, Node, NodeType } from "../ControlFlowVisitor";
import { CharStreams, CommonTokenStream } from "antlr4ts";
import * as fs from "fs";
import * as path from "path";

const expect = chai.expect;

suite("Tests for Control Flow of Visual COBOL", () => {
  let visitor: ControlFlowVisitor;

  setup(async function () {
    const filePath = path.join(__dirname, "backtesting-summary.cbl");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const inputStream = CharStreams.fromString(fileContent);
    const lexer = new VisualCobolLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new VisualCobolParser(tokenStream);
    const tree = parser.startRule();

    visitor = new ControlFlowVisitor();
    visitor.visit(tree);
  });

  test("should contain expected start node", function () {
    expect(visitor.nodes).to.not.be.empty;

    const startNode = visitor.nodes.find(
      (node) => node.type === NodeType.START
    );

    expect(startNode?.id).to.equal(startNode?.startLineNumber.toString());
    expect(startNode?.label).to.equal("0000-MAIN-ROUTINE");
    expect(startNode?.startLineNumber).to.equal(235);
    expect(startNode?.endLineNumber).to.equal(256);
    expect(startNode?.type).to.equal(NodeType.START);
    expect(startNode?.callers).to.be.empty;
    expect(startNode?.callees.length).to.equal(5);
  });

  test("should contain expected end node", function () {
    expect(visitor.nodes).to.not.be.empty;

    const endNode = visitor.nodes.find((node) => node.type === NodeType.END);

    expect(endNode?.id).to.equal(endNode?.startLineNumber.toString());
    expect(endNode?.label).to.equal("0000-EXIT");
    expect(endNode?.startLineNumber).to.equal(256);
    expect(endNode?.endLineNumber).to.equal(endNode?.startLineNumber);
    expect(endNode?.type).to.equal(NodeType.END);
  });

  test("should contain nodes with caller only", function () {
    expect(visitor.nodes).to.not.be.empty;

    const normalNodes = visitor.nodes.filter(
      (node) => node.type === NodeType.NORMAL && node.callers.length > 0
    );

    expect(normalNodes).to.not.be.empty;
  });

  test("should not contain nodes with duplicate id", function () {
    expect(visitor.nodes).to.not.be.empty;

    const seenIds = new Set<string>();
    let hasDuplicates = false;

    for (const item of visitor.nodes) {
      if (seenIds.has(item.id)) {
        hasDuplicates = true;
        break;
      }
      seenIds.add(item.id);
    }

    expect(hasDuplicates).to.be.false;
  });

  test("should contain nodes of type condition", function () {
    expect(visitor.nodes).to.not.be.empty;
    const conditionNodes: Node[] = visitor.nodes.filter(
      (node) => node.type === NodeType.CONDITION
    );

    expect(conditionNodes).to.not.be.empty;
    expect(conditionNodes[0].label).to.contain("IF");
    expect(conditionNodes[0].label.split(" ")).to.have.length.greaterThan(1);
    expect(conditionNodes[0].callers.length).to.equal(1);
    expect(conditionNodes[0].startLineNumber).to.equal(245);
    expect(conditionNodes[0].endLineNumber).to.equal(253);
  });

  test("should contain nodes of type loop", function () {
    expect(visitor.nodes).to.not.be.empty;

    expect(
      visitor.nodes.filter(
        (node) =>
          node.type === NodeType.LOOP && node.label.includes("PERFORM UNTIL")
      ).length
    ).to.be.greaterThan(0);
  });
});
