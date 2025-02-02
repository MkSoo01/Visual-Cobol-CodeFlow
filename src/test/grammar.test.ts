const chai = require("chai");
import { VisualCobolLexer } from "../generated/VisualCobolLexer";
import {
  VisualCobolParser,
  AuthorParagraphContext,
  DateWrittenParagraphContext,
  StopStatementContext,
} from "../generated/VisualCobolParser";
import { CharStreams, CommonTokenStream, Token } from "antlr4ts";

const expect = chai.expect;

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
  tokenStream.fill();
  return tokenStream.getTokens();
}

suite("Visual COBOL Grammar Tests for lexer", () => {
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

  test("SKIP_COPY_DIRECTIVE should skip the COPY statement correctly", () => {
    const tokens = tokenize(
      "COPY TEST              REPLACING ==(PREFIX)== BY ==TEST==."
    );

    expect(tokens.length).to.equal(1);
    expect(tokens[0].type).to.equal(Token.EOF); // lexer always emits an EOF token at the end of the input
  });

  test("SKIP_COPY_DIRECTIVE should skip the COPY directive correctly and tokenize the next line correctly", () => {
    const tokens = tokenize(
      "COPY TEST              REPLACING ==(PREFIX)== BY ==TEST==.\r\nNEXT"
    );

    expect(tokens.length).to.equal(3);
    expect(tokens[0].text).to.equal("\r\n");
    expect(tokens[1].text).to.equal("NEXT");
    expect(tokens[2].type).to.equal(Token.EOF);
  });

  test("SKIP_ANOMALY should skip the line with '/' only", () => {
    const tokens = tokenize("/\r\n");

    expect(tokens.length).to.equal(1);
    expect(tokens[0].type).to.equal(Token.EOF);
  });

  test("SKIP_ANOMALY should skip the line with '/' only and tokenize the next line correctly", () => {
    const tokens = tokenize("/\r\nNEXT");

    expect(tokens.length).to.equal(2);
    expect(tokens[0].text).to.equal("NEXT");
    expect(tokens[1].type).to.equal(Token.EOF);
  });

  test("SKIP_ANOMALY should not skip the line that has '/' and tokenize correctly", () => {
    const tokens = tokenize("COMPUTE A = B / C");

    expect(tokens.length).to.be.greaterThan(1);

    const slashToken = tokens.find((token) => token.text === "/");
    expect(slashToken).to.not.be.undefined;
  });

  test("SKIP_MULTIPLY should skip the COMPUTE statement with '*' in single line", () => {
    const tokens = tokenize("COMPUTE A = B * 5.");

    expect(tokens.length).to.equal(1);
    expect(tokens[0].type).to.equal(Token.EOF);
  });

  test("SKIP_MULTIPLY should skip the COMPUTE statement with '*' (no space befor and after *) in single line", () => {
    const tokens = tokenize("COMPUTE A = B*5.");

    expect(tokens.length).to.equal(1);
    expect(tokens[0].type).to.equal(Token.EOF);
  });

  test("SKIP_MULTIPLY should skip the COMPUTE statement with '*' in multiple lines", () => {
    const tokens = tokenize("COMPUTE A = B + C + \r\n D * 5.");

    expect(tokens.length).to.equal(1);
    expect(tokens[0].type).to.equal(Token.EOF);
  });

  test("SKIP_MULTIPLY should not skip the COMPUTE statement without '*' in the line", () => {
    const tokens = tokenize("COMPUTE A = B + C.");

    expect(tokens.length).to.be.greaterThan(1);
  });

  test("SKIP_COMMENT should skip the comment with '*'", () => {
    const tokens = tokenize("* COMPUTE A = B + C.\r\n");

    expect(tokens.length).to.equal(1);
    expect(tokens[0].type).to.equal(Token.EOF);
  });

  test("SKIP_COMMENT should not skip the line after the comment with '*'", () => {
    const tokens = tokenize("* COMPUTE A = B + C.\r\nNEXT");

    expect(tokens.length).to.equal(2);
    expect(tokens[0].text).to.equal("NEXT");
    expect(tokens[1].type).to.equal(Token.EOF);
  });

  test("SKIP_COMMENT should skip the comment with '*' but no space behind", () => {
    const tokens = tokenize("*COMPUTE A = B + C.\r\n");

    expect(tokens.length).to.equal(1);
    expect(tokens[0].type).to.equal(Token.EOF);
  });

  test("SKIP_COMMENT should skip the comment with '*' but no text behind", () => {
    const tokens = tokenize("*\r\n");

    expect(tokens.length).to.equal(1);
    expect(tokens[0].type).to.equal(Token.EOF);
  });

  test("SKIP_COMMENT should skip the comment with multiple '*'", () => {
    const tokens = tokenize("******************\r\n");

    expect(tokens.length).to.equal(1);
    expect(tokens[0].type).to.equal(Token.EOF);
  });

  test("SKIP_COMMENT should skip the comment with '*>'", () => {
    const tokens = tokenize("*> COMPUTE A = B + C. \r\n");

    expect(tokens.length).to.equal(1);
    expect(tokens[0].type).to.equal(Token.EOF);
  });

  test("SKIP_COMMENT should not skip the text before '*'", () => {
    const tokens = tokenize("TEST * COMPUTE A = B + C. \r\n");

    expect(tokens.length).to.be.greaterThan(1);
    expect(tokens[0].text).to.equal("TEST");
  });

  test("should tokenize 'EXEC SQL' correctly", () => {
    const tokens = tokenize("EXEC SQL");

    expect(tokens[0].type).to.equal(VisualCobolLexer.EXECSQLTAG);
  });

  test("should tokenize 'EXEC SQL' correctly 2", () => {
    const tokens = tokenize("EXECSQL");

    expect(tokens[0].type).to.not.equal(VisualCobolLexer.EXECSQLTAG);
  });

  test("should tokenize EXECSQLLINE in single line correctly", () => {
    const tokens = tokenize("EXEC SQL INCLUDE SQLCA END-EXEC.");

    expect(tokens[0].type).to.equal(VisualCobolLexer.EXECSQLLINE);
    expect(tokens[1].type).to.equal(VisualCobolLexer.DOT_FS);
  });

  test("should tokenize EXECSQLLINE in multiple lines correctly", () => {
    const tokens = tokenize(
      "EXEC SQL DECLARE SELECT CURSOR FOR\r\nLINE 2\r\nLINE 3\r\nEND-EXEC."
    );

    expect(tokens[0].type).to.equal(VisualCobolLexer.EXECSQLLINE);
    expect(tokens[1].type).to.equal(VisualCobolLexer.DOT_FS);
  });
});

suite("Visual COBOL Grammar Tests for parser", () => {
  test("should parse valid author paragraph without comment", () => {
    const input = "AUTHOR. JohnDoe.";
    const authorContext = parseInput(input).authorParagraph();

    expect(authorContext).to.not.be.null;
    expect(authorContext.childCount).to.be.greaterThan(0);

    const authorName = authorContext.authorName().text;
    expect(authorName).equal("JohnDoe");
  });

  test("should parse valid author paragraph with comment", () => {
    const input = "AUTHOR. JohnDoe. *Author comment";
    const authorContext = parseInput(input).authorParagraph();

    expect(authorContext).to.not.be.null;
    expect(authorContext.childCount).to.be.greaterThan(0);

    const authorName = authorContext.authorName().text;
    expect(authorName).equal("JohnDoe");
  });

  test("should parse valid date (dd/mm/yy) Written without comment", () => {
    const input = "DATE-WRITTEN.   28/10/21";
    const dateWrittenContext = parseInput(input).dateWrittenParagraph();

    expect(dateWrittenContext).to.not.be.null;
    expect(dateWrittenContext.childCount).to.be.greaterThan(0);

    const dateWritten = dateWrittenContext.dateIdentifier().text;
    expect(dateWritten).equal("28/10/21");
  });

  test("should parse valid date (dd/mm/yyyy) Written without comment", () => {
    const input = "DATE-WRITTEN.   28/10/2021";
    const dateWrittenContext = parseInput(input).dateWrittenParagraph();

    expect(dateWrittenContext).to.not.be.null;
    expect(dateWrittenContext.childCount).to.be.greaterThan(0);

    const dateWritten = dateWrittenContext.dateIdentifier().text;
    expect(dateWritten).equal("28/10/2021");
  });

  test("should parse valid date Written with comment", () => {
    const input = "DATE-WRITTEN.   28/10/2021 *Date written comment";
    const dateWrittenContext = parseInput(input).dateWrittenParagraph();

    expect(dateWrittenContext).to.not.be.null;
    expect(dateWrittenContext.childCount).to.be.greaterThan(0);

    const dateWritten = dateWrittenContext.dateIdentifier().text;
    expect(dateWritten).equal("28/10/2021");
  });

  test("should parse STOP statement correctly", () => {
    const input = "STOP RUN.";
    const StopStatementContext = parseInput(input).stopStatement();

    expect(StopStatementContext).to.not.be.null;
    expect(StopStatementContext.childCount).to.be.equal(2);
  });

  test("should parse STOP statement with GIVING 1 correctly", () => {
    const input = "STOP RUN GIVING 1.";
    const StopStatementContext = parseInput(input).stopStatement();

    expect(StopStatementContext).to.not.be.null;
    expect(StopStatementContext.childCount).to.be.equal(3);
  });

  test("should parse the paragraphExit correctly", () => {
    const input = "0000-MAIN-ROUTINE.\r\n 0000-EXIT.";
    const paragraph = parseInput(input).paragraph();

    expect(paragraph).to.not.be.null;

    const paragraphName = paragraph.paragraphName().text;
    expect(paragraphName).to.be.equal("0000-MAIN-ROUTINE");

    const paragraphExit = paragraph.paragraphExit()?.text;
    expect(paragraphExit).to.be.equal("0000-EXIT.");
  });

  test("should parse the lastParagraph correctly", () => {
    const input =
      "0000-MAIN-ROUTINE.\r\n 0000-EXIT.\r\n EXEC SQL\r\n COMMIT \r\n END-EXEC.\r\n STOP RUN.";
    const paragraph = parseInput(input).paragraph();

    expect(paragraph).to.not.be.null;

    const lastParagraphNode = paragraph.lastParagraph();
    const lastSQLStatementNode = lastParagraphNode?.lastSQLStatement();
    const stopStatementNode = lastParagraphNode?.stopStatement();

    expect(lastSQLStatementNode).to.not.be.null;
    expect(stopStatementNode).to.not.be.null;
    expect(lastParagraphNode?.DOT_FS()).to.not.be.null;
  });

  test("should parse the classCondition with 'EQUALS ZEROS' correctly", () => {
    const input = "RESULT EQUALS ZEROS";
    const classCondition = parseInput(input).classCondition();

    expect(classCondition).to.not.be.null;
    expect(classCondition.getChild(0).text).to.be.equal("RESULT");
    expect(classCondition.getChild(1).text).to.be.equal("EQUALS");
    expect(classCondition.figurativeConstant()?.text).to.be.equal("ZEROS");
  });

  test("should parse the classCondition with 'EQUALS SPACES' correctly", () => {
    const input = "RESULT EQUALS SPACES";
    const classCondition = parseInput(input).classCondition();

    expect(classCondition).to.not.be.null;
    expect(classCondition.getChild(0).text).to.be.equal("RESULT");
    expect(classCondition.getChild(1).text).to.be.equal("EQUALS");
    expect(classCondition.figurativeConstant()?.text).to.be.equal("SPACES");
  });
});
