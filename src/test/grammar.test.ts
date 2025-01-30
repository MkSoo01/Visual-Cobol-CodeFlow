const chai = require("chai");
import { VisualCobolLexer } from "../generated/VisualCobolLexer";
import {
  VisualCobolParser,
  AuthorParagraphContext,
  DateWrittenParagraphContext,
} from "../generated/VisualCobolParser";
import { CharStreams, CommonTokenStream, Token } from "antlr4ts";

const expect = chai.expect;

function parseInputForAuthor(input: string): AuthorParagraphContext {
  const parser = parseInput(input);
  return parser.authorParagraph();
}

function parseInputForDateWritten(input: string): DateWrittenParagraphContext {
  const parser = parseInput(input);
  return parser.dateWrittenParagraph();
}

function parseInput(input: string): VisualCobolParser {
  const inputStream = CharStreams.fromString(input);
  const lexer = new VisualCobolLexer(inputStream);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new VisualCobolParser(tokenStream);
  return parser;
}

function tokenize(input: string): Token[] {
  const inputStream = CharStreams.fromString(input);
  const lexer = new VisualCobolLexer(inputStream);
  const tokenStream = new CommonTokenStream(lexer);
  return tokenStream.getTokens();
}

suite("ANTLR Grammar Tests", () => {
  test("should parse valid author paragraph without comment", () => {
    const input = "AUTHOR. JohnDoe."; // Example input to be parsed
    const authorContext = parseInputForAuthor(input);

    expect(authorContext).to.not.be.null;
    expect(authorContext.childCount).to.be.greaterThan(0);

    const authorNameNode = authorContext.authorName();
    const authorName = authorNameNode.getChild(0).text;
    expect(authorName).equal("JohnDoe");
  });

  test("should parse valid author paragraph with comment", () => {
    const input = "AUTHOR. JohnDoe. *Author comment";
    const authorContext = parseInputForAuthor(input);

    expect(authorContext).to.not.be.null;
    expect(authorContext.childCount).to.be.greaterThan(0);

    const authorNameNode = authorContext.authorName();
    const authorName = authorNameNode.getChild(0).text;
    expect(authorName).equal("JohnDoe");
  });

  test("should parse valid date (dd/mm/yy) Written without comment", () => {
    const input = "DATE-WRITTEN.   28/10/21";
    const dateWrittenContext = parseInputForDateWritten(input);

    expect(dateWrittenContext).to.not.be.null;
    expect(dateWrittenContext.childCount).to.be.greaterThan(0);

    const dateWrittenNode = dateWrittenContext.dateIdentifier();
    const dateWritten = dateWrittenNode.children?.join("");
    expect(dateWritten).equal("28/10/21");
  });

  test("should parse valid date (dd/mm/yyyy) Written without comment", () => {
    const input = "DATE-WRITTEN.   28/10/2021";
    const dateWrittenContext = parseInputForDateWritten(input);

    expect(dateWrittenContext).to.not.be.null;
    expect(dateWrittenContext.childCount).to.be.greaterThan(0);

    const dateWrittenNode = dateWrittenContext.dateIdentifier();
    const dateWritten = dateWrittenNode.children?.join("");
    expect(dateWritten).equal("28/10/2021");
  });

  test("should parse valid date Written with comment", () => {
    const input = "DATE-WRITTEN.   28/10/2021 *Date written comment";
    const dateWrittenContext = parseInputForDateWritten(input);

    expect(dateWrittenContext).to.not.be.null;
    expect(dateWrittenContext.childCount).to.be.greaterThan(0);

    const dateWrittenNode = dateWrittenContext.dateIdentifier();
    const dateWritten = dateWrittenNode.children?.join("");
    expect(dateWritten).equal("28/10/2021");
  });

  test("should tokenize the EQUALS token correctly", () => {
    const tokens = tokenize("EQUALS");

    expect(tokens[0].type).to.equal(VisualCobolLexer.EQUALS);
  });

  test("should tokenize the EQUALS token correctly in lowercase", () => {
    const tokens = tokenize("equals");

    expect(tokens[0].type).to.equal(VisualCobolLexer.EQUALS);
  });

  test("should tokenize the EQUALS token regardless of case", () => {
    const tokens = tokenize("eQuaLs");

    expect(tokens[0].type).to.equal(VisualCobolLexer.EQUALS);
  });

  test("should tokenize the E Q U A L S token not as EQUALS", () => {
    const tokens = tokenize("E Q U A L S");

    expect(tokens[0].type).to.not.equal(VisualCobolLexer.EQUALS);
  });
});
