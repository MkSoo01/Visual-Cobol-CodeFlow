/*
* Copyright (C) 2017, Ulrich Wolffgang <ulrich.wolffgang@proleap.io>
* All rights reserved.
*
* This software may be modified and distributed under the terms
* of the MIT license. See the LICENSE file for details.
*/

/*
* Visual COBOL Grammar for ANTLR4
*
* This is a Visual COBOL grammar, derived from the COBOL parser at
* https://github.com/uwol/cobol85parser.
*
*/

// $antlr-format alignTrailingComments true, columnLimit 150, minEmptyLines 1, maxEmptyLinesToKeep 1, reflowComments false, useTab false
// $antlr-format allowShortRulesOnASingleLine false, allowShortBlocksOnASingleLine true, alignSemicolons hanging, alignColons hanging

grammar VisualCobol;

startRule
    : compilationUnit EOF
    ;

compilationUnit
    : programUnit+
    ;

programUnit
    : identificationDivision environmentDivision? dataDivision? procedureDivision? programUnit*
    ;

identificationDivision
    : (IDENTIFICATION | ID) DIVISION DOT_FS genericText*
    ;

genericText
    : GENERIC_WORD+ DOT_FS?
    | execSqlStatement DOT_FS?
    | integerLiteral DOT_FS?
    | cobolWord DOT_FS?
    | NUMERICLITERAL DOT_FS?
    | NONNUMERICLITERAL DOT_FS?
    ;

execSqlStatement
    : EXECSQLLINE+
    ;

environmentDivision
    : ENVIRONMENT DIVISION DOT_FS genericText*
    ;

dataDivision
    : DATA DIVISION DOT_FS genericText*
    ;

procedureDivision
    : PROCEDURE DIVISION procedureDivisionUsingClause? procedureDivisionGivingClause? DOT_FS procedureDeclaratives? procedureDivisionBody
    ;

procedureDivisionUsingClause
    : (USING | CHAINING) procedureDivisionUsingParameter+
    ;

procedureDivisionGivingClause
    : (GIVING | RETURNING) (cobolWord | GENERIC_WORD)
    ;

procedureDivisionUsingParameter
    : procedureDivisionByReferencePhrase
    | procedureDivisionByValuePhrase
    ;

procedureDivisionByReferencePhrase
    : (BY? REFERENCE)? procedureDivisionByReference+
    ;

procedureDivisionByReference
    : (OPTIONAL? (identifier | GENERIC_WORD | cobolWord))
    | ANY
    ;

procedureDivisionByValuePhrase
    : BY? VALUE procedureDivisionByValue+
    ;

procedureDivisionByValue
    : identifier
    | integerLiteral
    | NUMERICLITERAL
    | NONNUMERICLITERAL
    | ANY
    | GENERIC_WORD
    ;

procedureDeclaratives
    : DECLARATIVES DOT_FS procedureDeclarative+ END DECLARATIVES DOT_FS
    ;

procedureDeclarative
    : procedureSectionHeader DOT_FS useStatement DOT_FS paragraphs
    ;

useStatement
    : USE (GENERIC_WORD | cobolWord)+
    ;

procedureSectionHeader
    : sectionName SECTION integerLiteral?
    ;

procedureDivisionBody
    : paragraphs
    ;

paragraphs
    : sentence* paragraph*
    ;

paragraph
    : paragraphName DOT_FS sentence* paragraphExit? lastParagraph?
    ;

paragraphName
    : IDENTIFIER
    ;

paragraphExit
    : paragraphName DOT_FS
    ;

lastParagraph
    : genericText*
    ;

sentence
    : statement* DOT_FS
    ;

statement
    : execSqlStatement
    | ifStatement
    | performStatement
    | genericStatement
    ;

ifStatement
    : IF condition ifThen ifElse? END_IF?
    ;

condition
    : combinableCondition andOrCondition*
    ;

andOrCondition
    : (AND | OR) (combinableCondition | abbreviation+)
    ;

combinableCondition
    : NOT? simpleCondition
    ;

simpleCondition
    : LPARENCHAR condition RPARENCHAR
    | relationCondition
    | classCondition
    | conditionNameReference
    ;

classCondition
    : identifier IS? NOT? EQUALS? (GENERIC_WORD | ZERO)?
    ;

identifier
    : qualifiedDataName
    | tableCall
    | functionCall
    | specialRegister
    ;

tableCall
    : qualifiedDataName (GENERIC_WORD | cobolWord)+
    ;

qualifiedDataName
    : qualifiedDataNameFormat1
    | qualifiedDataNameFormat2
    | qualifiedDataNameFormat3
    | qualifiedDataNameFormat4
    ;

qualifiedDataNameFormat1
    : (GENERIC_WORD | cobolWord) (qualifiedInData+ inSection? | inSection)?
    ;

qualifiedDataNameFormat2
    : paragraphName inSection
    ;

qualifiedDataNameFormat3
    : (GENERIC_WORD | cobolWord) inSection
    ;

qualifiedDataNameFormat4
    : LINAGE_COUNTER inSection
    ;

qualifiedInData
    : inSection
    ;

functionCall
    : FUNCTION (GENERIC_WORD | cobolWord)+
    ;

specialRegister
    : GENERIC_WORD OF GENERIC_WORD
    | GENERIC_WORD
    | LINAGE_COUNTER
    ;

conditionNameReference
    : conditionName (inSection* conditionNameSubscriptReference*)
    ;

conditionName
    : cobolWord
    | GENERIC_WORD
    ;

conditionNameSubscriptReference
    : LPARENCHAR subscript_ (COMMACHAR? subscript_)* RPARENCHAR
    ;

subscript_
    : GENERIC_WORD
    | integerLiteral
    | arithmeticExpression
    ;


// relation ----------------------------------

relationCondition
    : relationSignCondition
    | relationArithmeticComparison
    | relationCombinedComparison
    ;

relationSignCondition
    : arithmeticExpression IS? NOT? (POSITIVE | NEGATIVE | ZERO)
    ;

relationArithmeticComparison
    : arithmeticExpression relationalOperator arithmeticExpression
    ;

relationCombinedComparison
    : arithmeticExpression relationalOperator LPARENCHAR relationCombinedCondition RPARENCHAR
    ;

relationCombinedCondition
    : arithmeticExpression ((AND | OR) arithmeticExpression)+
    ;

arithmeticExpression
    : multDivs plusMinus*
    ;

plusMinus
    : (PLUSCHAR | MINUSCHAR) multDivs
    ;

multDivs
    : powers multDiv*
    ;

multDiv
    : (ASTERISKCHAR | SLASHCHAR) powers
    ;

powers
    : (PLUSCHAR | MINUSCHAR)? basis power*
    ;

power
    : DOUBLEASTERISKCHAR basis
    ;

basis
    : LPARENCHAR arithmeticExpression RPARENCHAR
    | integerLiteral
    | NUMERICLITERAL
    | NONNUMERICLITERAL
    | identifier
    | GENERIC_WORD
    ;

relationalOperator
    : (IS | ARE)? (
        NOT? (GREATER THAN? | MORETHANCHAR | LESS THAN? | LESSTHANCHAR | EQUAL TO? | EQUALCHAR)
        | NOTEQUALCHAR
        | GREATER THAN? OR EQUAL TO?
        | MORETHANOREQUAL
        | LESS THAN? OR EQUAL TO?
        | LESSTHANOREQUAL
    )
    ;

abbreviation
    : NOT? relationalOperator? (
        arithmeticExpression
        | LPARENCHAR arithmeticExpression abbreviation RPARENCHAR
    )
    ;

ifThen
    : THEN? statement+
    ;

ifElse
    : ELSE statement+
    ;

performStatement
    : PERFORM (performInlineStatement | performProcedureStatement)
    ;

performInlineStatement
    : performType statement* END_PERFORM
    ;

performProcedureStatement
    : procedureName ((THROUGH | THRU) procedureName)? performType?
    ;

procedureName
    : paragraphName inSection?
    | sectionName
    ;

inSection
    : (IN | OF) sectionName
    ;

sectionName
    : GENERIC_WORD
    | INTEGERLITERAL
    | IDENTIFIER
    ;

performType
    : performTimes
    | performUntil
    | performVarying
    ;

performTimes
    : (identifier | integerLiteral) TIMES
    ;

integerLiteral
    : INTEGERLITERAL
    ;

performUntil
    : performTestClause? UNTIL condition
    ;

performVarying
    : performTestClause performVaryingClause
    | performVaryingClause performTestClause?
    ;

performVaryingClause
    : VARYING performVaryingPhrase performAfter*
    ;

performVaryingPhrase
    : GENERIC_WORD performFrom performBy performUntil
    ;

performAfter
    : AFTER performVaryingPhrase
    ;

performFrom
    : FROM (identifier | GENERIC_WORD | NONNUMERICLITERAL | NUMERICLITERAL | arithmeticExpression)
    ;

performBy
    : BY (identifier | GENERIC_WORD | NONNUMERICLITERAL | NUMERICLITERAL | arithmeticExpression)
    ;

performTestClause
    : WITH? TEST (BEFORE | AFTER)
    ;

genericStatement
    : genericText+
    ;

cobolWord
    : ADD
    | AND
    | ANY
    | AFTER
    | ARE
    | ASTERISKCHAR
    | BEFORE
    | BY
    | CALL
    | CHAINING
    | COMMACHAR
    | COMPUTE
    | DATA
    | DISPLAY
    | DIVIDE
    | DOUBLEASTERISKCHAR
    | DOT
    | EQUALS
    | EQUALCHAR
    | EQUAL
    | EVALUATE
    | FUNCTION
    | FROM
    | GIVING
    | GREATER
    | ID
    | IDENTIFICATION
    | IN
    | INITIALIZE
    | IS
    | LESS
    | LESSTHANCHAR
    | LESSTHANOREQUAL
    | LINAGE_COUNTER
    | LPARENCHAR
    | MINUSCHAR
    | MORETHANCHAR
    | MORETHANOREQUAL
    | MOVE
    | MULTIPLY
    | NEGATIVE
    | NOT
    | NOTEQUALCHAR
    | OF
    | OPTIONAL
    | OR
    | POSITIVE
    | PLUSCHAR
    | RETURNING
    | PROCEDURE
    | REFERENCE
    | RPARENCHAR
    | SECTION
    | SET
    | SLASHCHAR
    | STRING
    | SUBTRACT
    | SUM
    | TALLY
    | TALLYING
    | THAN
    | TEST
    | THEN
    | THROUGH
    | THRU
    | TIMES
    | TO
    | USE
    | USING
    | UNSTRING
    | UNTIL
    | VALUE
    | VARYING
    | WITH
    | WRITE
    | ZERO
    ;

ADD
    : A D D
    ;

AND
    : A N D
    ;

ANY
    : A N Y
    ;

AFTER
    : A F T E R
    ;

ARE
    : A R E
    ;

ASTERISKCHAR
    : '*'
    ;

BEFORE
    : B E F O R E
    ;

BY
    : B Y
    ;

CALL
    : C A L L
    ;

CHAINING
    : C H A I N I N G
    ;

COMMACHAR
    : ','
    ;

COMPUTE
    : C O M P U T E
    ;

DATA
    : D A T A
    ;

DECLARATIVES
    : D E C L A R A T I V E S
    ;

DISPLAY
    : D I S P L A Y
    ;

DIVIDE
    : D I V I D E
    ;

DIVISION
    : D I V I S I O N
    ;

DOUBLEASTERISKCHAR
    : '**'
    ;

DOT
    : '.'
    ;

// period full stop
DOT_FS
    : '.' ('\r' | '\n' | '\f' | '\t' | ' ')+
    | '.' EOF
    ;

EQUALS
    : E Q U A L S
    ;

EXECSQLLINE
    : 'EXEC SQL' .*? 'END-EXEC'
    ;

ENVIRONMENT
    : E N V I R O N M E N T
    ;

EVALUATE
    : E V A L U A T E
    ;

FROM
    : F R O M
    ;

GREATER
    : G R E A T E R
    ;

ID
    : I D
    ;

IDENTIFICATION
    : I D E N T I F I C A T I O N
    ;

IN
    : I N
    ;

INITIALIZE
    : I N I T I A L I Z E
    ;

IS
    : I S
    ;

END
    : E N D
    ;

END_IF
    : E N D MINUSCHAR I F
    ;

END_PERFORM
    : E N D MINUSCHAR P E R F O R M
    ;

ELSE
    : E L S E
    ;

EQUALCHAR
    : '='
    ;

EQUAL
    : E Q U A L
    ;

FUNCTION
    : F U N C T I O N
    ;

GIVING
    : G I V I N G
    ;

IF
    : I F
    ;

LESS
    : L E S S
    ;

LESSTHANCHAR
    : '<'
    ;

LESSTHANOREQUAL
    : '<='
    ;

LINAGE_COUNTER
    : L I N A G E MINUSCHAR C O U N T E R
    ;

LPARENCHAR
    : '('
    ;

MINUSCHAR
    : '-'
    ;

MORETHANCHAR
    : '>'
    ;

MORETHANOREQUAL
    : '>='
    ;

MOVE
    : M O V E
    ;

MULTIPLY
    : M U L T I P L Y
    ;

NEGATIVE
    : N E G A T I V E
    ;

NOT
    : N O T
    ;

NOTEQUALCHAR
    : '<>'
    ;

OF
    : O F
    ;

OPTIONAL
    : O P T I O N A L
    ;

OR
    : O R
    ;

PLUSCHAR
    : '+'
    ;

POSITIVE
    : P O S I T I V E
    ;

PROCEDURE
    : P R O C E D U R E
    ;

PERFORM
    : P E R F O R M
    ;

REFERENCE
    : R E F E R E N C E
    ;

RETURNING
    : R E T U R N I N G
    ;

RPARENCHAR
    : ')'
    ;

SECTION
    : S E C T I O N
    ;

SET
    : S E T
    ;

SLASHCHAR
    : '/'
    ;

STRING
    : S T R I N G
    ;

SUBTRACT
    : S U B T R A C T
    ;

SUM
    : S U M
    ;

TALLY
    : T A L L Y
    ;

TALLYING
    : T A L L Y I N G
    ;

TEST
    : T E S T
    ;

THAN
    : T H A N
    ;

THEN
    : T H E N
    ;

THROUGH
    : T H R O U G H
    ;

THRU
    : T H R U
    ;

TIMES
    : T I M E S
    ;

TO
    : T O
    ;

USE
    : U S E
    ;

UNSTRING
    : U N S T R I N G
    ;

UNTIL
    : U N T I L
    ;

USING
    : U S I N G
    ;

VALUE
    : V A L U E
    ;

VARYING
    : V A R Y I N G
    ;

WITH
    : W I T H
    ;

WRITE
    : W R I T E
    ;

ZERO
    : Z E R O
    ;

// whitespace, line breaks, comments, ...
NEWLINE
    : '\r'? '\n' -> channel(HIDDEN)
    ;

WS
    : [ \t\f;]+ -> channel(HIDDEN)
    ;

SEPARATOR
    : ', ' -> channel(HIDDEN)
    ;

SKIP_COMMENT
    : '*' ~[\r\n]* [\r\n]+ -> skip
    ;

SKIP_ANOMALY
    : '/' ('\r'? '\n') -> skip
    ;

INTEGERLITERAL
    : (PLUSCHAR | MINUSCHAR)? [0-9]+
    ;

IDENTIFIER
    : [0-9][0-9][0-9][0-9] [a-zA-Z]* ([-_]+ [A-Z0-9]+)*
    ;

NUMERICLITERAL
    : (PLUSCHAR | MINUSCHAR)? [0-9]* (DOT | COMMACHAR) [0-9]+ (
        ('e' | 'E') (PLUSCHAR | MINUSCHAR)? [0-9]+
    )?
    ;

NONNUMERICLITERAL
    : STRINGLITERAL
    | DBCSLITERAL
    | HEXNUMBER
    | NULLTERMINATED
    ;

fragment HEXNUMBER
    : X '"' [0-9A-F]+ '"'
    | X '\'' [0-9A-F]+ '\''
    ;

fragment NULLTERMINATED
    : Z '"' (~["\n\r] | '""' | '\'')* '"'
    | Z '\'' (~['\n\r] | '\'\'' | '"')* '\''
    ;

fragment STRINGLITERAL
    : '"' (~["\n\r] | '""' | '\'')* '"'
    | '\'' (~['\n\r] | '\'\'' | '"')* '\''
    ;

fragment DBCSLITERAL
    : [GN] '"' (~["\n\r] | '""' | '\'')* '"'
    | [GN] '\'' (~['\n\r] | '\'\'' | '"')* '\''
    ;

GENERIC_WORD
    : ~[\r\n .]+
    ;

// case insensitive chars
fragment A
    : ('a' | 'A')
    ;

fragment B
    : ('b' | 'B')
    ;

fragment C
    : ('c' | 'C')
    ;

fragment D
    : ('d' | 'D')
    ;

fragment E
    : ('e' | 'E')
    ;

fragment F
    : ('f' | 'F')
    ;

fragment G
    : ('g' | 'G')
    ;

fragment H
    : ('h' | 'H')
    ;

fragment I
    : ('i' | 'I')
    ;

fragment J
    : ('j' | 'J')
    ;

fragment K
    : ('k' | 'K')
    ;

fragment L
    : ('l' | 'L')
    ;

fragment M
    : ('m' | 'M')
    ;

fragment N
    : ('n' | 'N')
    ;

fragment O
    : ('o' | 'O')
    ;

fragment P
    : ('p' | 'P')
    ;

fragment Q
    : ('q' | 'Q')
    ;

fragment R
    : ('r' | 'R')
    ;

fragment S
    : ('s' | 'S')
    ;

fragment T
    : ('t' | 'T')
    ;

fragment U
    : ('u' | 'U')
    ;

fragment V
    : ('v' | 'V')
    ;

fragment W
    : ('w' | 'W')
    ;

fragment X
    : ('x' | 'X')
    ;

fragment Y
    : ('y' | 'Y')
    ;

fragment Z
    : ('z' | 'Z')
    ;