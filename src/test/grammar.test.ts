const chai = require("chai");
import { VisualCobolLexer } from "../generated/VisualCobolLexer";
import {
  GenericTextContext,
  VisualCobolParser,
} from "../generated/VisualCobolParser";
import {
  CharStreams,
  CommonTokenStream,
  Token,
  BailErrorStrategy,
} from "antlr4ts";

const expect = chai.expect;

function parseInput(input: string): VisualCobolParser {
  const inputStream = CharStreams.fromString(input);
  const lexer = new VisualCobolLexer(inputStream);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new VisualCobolParser(tokenStream);
  parser.errorHandler = new BailErrorStrategy();
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

    expect(tokens.length).to.be.greaterThan(0);
  });

  test("SKIP_COPY_DIRECTIVE should skip the COPY directive correctly and tokenize the next line correctly", () => {
    const tokens = tokenize(
      "COPY TEST              REPLACING ==(PREFIX)== BY ==TEST==.\r\nNEXT"
    );

    expect(tokens.length).to.be.greaterThan(0);
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

    expect(tokens.length).to.be.greaterThan(0);
  });

  test("SKIP_MULTIPLY should skip the COMPUTE statement with '*' (no space befor and after *) in single line", () => {
    const tokens = tokenize("COMPUTE A = B*5.");

    expect(tokens.length).to.be.greaterThan(0);
  });

  test("SKIP_MULTIPLY should skip the COMPUTE statement with '*' in multiple lines", () => {
    const tokens = tokenize("COMPUTE A = B + C + \r\n D * 5.");

    expect(tokens.length).to.be.greaterThan(0);
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

  test("SKIP_DOLLAR_SIGN should not skip the text with '$'", () => {
    const tokens = tokenize("$if var defined");

    expect(tokens.length).to.be.greaterThan(0);
  });

  test("EXECSQLLINE in single line tokenized correctly", () => {
    const tokens = tokenize("EXEC SQL INCLUDE SQLCA END-EXEC.");

    expect(tokens[0].type).to.equal(VisualCobolLexer.EXECSQLLINE);
    expect(tokens[1].type).to.equal(VisualCobolLexer.DOT_FS);
  });

  test("EXECSQLLINE in multiple lines tokenized correctly", () => {
    const tokens = tokenize(
      "EXEC SQL DECLARE SELECT CURSOR FOR\r\nLINE 2\r\nLINE 3\r\nEND-EXEC."
    );

    expect(tokens[0].type).to.equal(VisualCobolLexer.EXECSQLLINE);
    expect(tokens[1].type).to.equal(VisualCobolLexer.DOT_FS);
  });
});

suite("Visual COBOL Grammar Tests for parser", () => {
  test("IDENTIFICATION DIVISION", () => {
    const input =
      "IDENTIFICATION DIVISION.\r\n PROGRAM-ID. test-only.\r\n AUTHOR.";
    const identificationDivisionCtx =
      parseInput(input).identificationDivision();

    expect(
      identificationDivisionCtx.genericText(0).getChild(0).text
    ).to.be.equal("PROGRAM-ID");
    expect(
      identificationDivisionCtx.genericText(1).getChild(0).text
    ).to.be.equal("test-only");
    expect(identificationDivisionCtx.genericText(2).text).to.be.equal(
      "AUTHOR."
    );
  });

  test("ENVIRONMENT DIVISION", () => {
    const input =
      "ENVIRONMENT DIVISION.\r\n CONFIGURATION SECTION.\r\n SPECIAL-NAMES.";
    const environmentDivisionCtx = parseInput(input).environmentDivision();

    expect(environmentDivisionCtx.genericText(0).getChild(0).text).to.be.equal(
      "CONFIGURATION"
    );
    expect(environmentDivisionCtx.genericText(1).getChild(0).text).to.be.equal(
      "SECTION"
    );
    expect(environmentDivisionCtx.genericText(2).text).to.be.equal(
      "SPECIAL-NAMES."
    );
  });

  test("DATA DIVISION", () => {
    const input =
      "DATA DIVISION.\r\n FILE  SECTION.\r\n WORKING-STORAGE SECTION.";
    const dataDivisionCtx = parseInput(input).dataDivision();

    expect(dataDivisionCtx.genericText(0).getChild(0).text).to.be.equal("FILE");
    expect(dataDivisionCtx.genericText(1).getChild(0).text).to.be.equal(
      "SECTION"
    );
    expect(dataDivisionCtx.genericText(2).getChild(0).text).to.be.equal(
      "WORKING-STORAGE"
    );
    expect(dataDivisionCtx.genericText(3).text).to.be.equal("SECTION.");
  });

  test("PROCEDURE DECLARATIVES", () => {
    const input =
      "PROCEDURE DIVISION.\r\n DECLARATIVES.\r\n 0000-QUEUE-PROC   SECTION." +
      "\r\n USE AFTER ERROR PROCEDURE ON QUEUE-IN, QUEUE-OUT.\r\n END DECLARATIVES.";
    const procedureDeclarativeCtx = parseInput(input)
      .procedureDivision()
      .procedureDeclaratives();

    expect(procedureDeclarativeCtx!.childCount).to.be.equal(6);
    expect(procedureDeclarativeCtx!.getChild(0).text).to.be.equal(
      "DECLARATIVES"
    );
    expect(procedureDeclarativeCtx!.getChild(3).text).to.be.equal("END");
    expect(procedureDeclarativeCtx!.getChild(4).text).to.be.equal(
      "DECLARATIVES"
    );
  });

  test("the paragraphExit", () => {
    const input = "0000-MAIN-ROUTINE.\r\n 0000-EXIT.";
    const paragraph = parseInput(input).paragraph();

    expect(paragraph).to.not.be.null;

    const paragraphName = paragraph.paragraphName().text;
    expect(paragraphName).to.be.equal("0000-MAIN-ROUTINE");

    const paragraphExitName = paragraph.paragraphExit()?.paragraphName().text;
    expect(paragraphExitName).to.be.equal("0000-EXIT");
  });

  test("the paragraphExit followed by the lastParagraph", () => {
    const input =
      "0000-MAIN-ROUTINE.\r\n 0000-EXIT.\r\n EXEC SQL\r\n COMMIT \r\n END-EXEC.\r\n STOP RUN.";
    const paragraph = parseInput(input).paragraph();

    const paragraphExit = paragraph.paragraphExit();
    expect(paragraphExit?.paragraphName().text).to.be.equal("0000-EXIT");
    expect(paragraph.lastParagraph()?.childCount).to.be.equal(2);
    expect(paragraph.lastParagraph()?.genericText(1).text).to.be.equal(
      "STOPRUN."
    );
  });

  test("the classCondition with 'EQUALS ZEROS'", () => {
    const input = "RESULT EQUALS ZEROS";
    const classCondition = parseInput(input).classCondition();

    expect(classCondition).to.not.be.null;
    expect(classCondition.childCount).to.be.greaterThan(0);
  });

  test("the classCondition with 'EQUALS SPACES'", () => {
    const input = "RESULT EQUALS SPACES";
    const classCondition = parseInput(input).classCondition();

    expect(classCondition).to.not.be.null;
    expect(classCondition.childCount).to.be.greaterThan(0);
  });
});
