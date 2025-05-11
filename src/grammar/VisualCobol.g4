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
    : (GIVING | RETURNING) dataName
    ;

procedureDivisionUsingParameter
    : procedureDivisionByReferencePhrase
    | procedureDivisionByValuePhrase
    ;

procedureDivisionByReferencePhrase
    : (BY? REFERENCE)? procedureDivisionByReference+
    ;

procedureDivisionByReference
    : (OPTIONAL? (identifier | fileName))
    | ANY
    ;

procedureDivisionByValuePhrase
    : BY? VALUE procedureDivisionByValue+
    ;

procedureDivisionByValue
    : identifier
    | literal
    | ANY
    ;

procedureDeclaratives
    : DECLARATIVES DOT_FS (procedureDeclarative | genericDeclarative)* END DECLARATIVES DOT_FS
    ;

procedureDeclarative
    : procedureSectionHeader DOT_FS useStatement? DOT_FS? paragraphs
    ;

genericDeclarative
    : sectionName DOT_FS paragraphs
    ;

procedureSectionHeader
    : sectionName SECTION integerLiteral?
    ;

procedureDivisionBody
    : paragraphs
    ;

// -- procedure section ----------------------------------


paragraphs
    : sentence* paragraph*
    ;

paragraph
    : paragraphName DOT_FS (alteredGoTo | sentence*) paragraphExit? lastParagraph?
    ;

paragraphExit
    : paragraphName DOT_FS?
    ;

lastParagraph
    : genericText*
    ;

sentence
    : statement* DOT_FS
    ;

statement
    : execSqlStatement
    | performStatement
    | alterStatement
    | goToStatement
    | mergeStatement
    | sortStatement
    | genericStatement
    ;

alteredGoTo
    : GO TO? DOT_FS
    ;

// alter statement

alterStatement
    : ALTER alterProceedTo+
    ;

alterProceedTo
    : procedureName TO (PROCEED TO)? procedureName
    ;

execSqlStatement
    : EXECSQLLINE+
    ;

// goto statement

goToStatement
    : GO TO? (goToStatementSimple | goToDependingOnStatement)
    ;

goToStatementSimple
    : procedureName
    ;

goToDependingOnStatement
    : MORE_LABELS
    | procedureName+ (DEPENDING ON? identifier)?
    ;

// merge statement

mergeStatement
    : MERGE fileName mergeOnKeyClause+ mergeCollatingSequencePhrase? mergeUsing* mergeOutputProcedurePhrase? mergeGivingPhrase*
    ;

mergeOnKeyClause
    : ON? (ASCENDING | DESCENDING) KEY? qualifiedDataName+
    ;

mergeCollatingSequencePhrase
    : COLLATING? SEQUENCE IS? alphabetName+ mergeCollatingAlphanumeric? mergeCollatingNational?
    ;

mergeCollatingAlphanumeric
    : FOR? ALPHANUMERIC IS alphabetName
    ;

mergeCollatingNational
    : FOR? NATIONAL IS? alphabetName
    ;

mergeUsing
    : USING fileName+
    ;

mergeOutputProcedurePhrase
    : OUTPUT PROCEDURE IS? procedureName mergeOutputThrough?
    ;

mergeOutputThrough
    : (THROUGH | THRU) procedureName
    ;

mergeGivingPhrase
    : GIVING mergeGiving+
    ;

mergeGiving
    : fileName (LOCK | SAVE | NO REWIND | CRUNCH | RELEASE | WITH REMOVE CRUNCH)?
    ;

// perform statement

performStatement
    : PERFORM (performInlineStatement | performProcedureStatement)
    ;

performInlineStatement
    : performType statement* END_PERFORM
    ;

performProcedureStatement
    : procedureName ((THROUGH | THRU) procedureName)? performType?
    ;

performType
    : performTimes
    | performUntil
    | performVarying
    ;

performTimes
    : (identifier | integerLiteral) TIMES
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
    : (identifier | literal) performFrom performBy performUntil
    ;

performAfter
    : AFTER performVaryingPhrase
    ;

performFrom
    : FROM (identifier | literal | arithmeticExpression)
    ;

performBy
    : BY (identifier | literal | arithmeticExpression)
    ;

performTestClause
    : WITH? TEST (BEFORE | AFTER)
    ;

// sort statement

sortStatement
    : SORT fileName sortOnKeyClause+ sortDuplicatesPhrase? sortCollatingSequencePhrase? sortInputProcedurePhrase? sortUsing* sortOutputProcedurePhrase
        ? sortGivingPhrase*
    ;

sortOnKeyClause
    : ON? (ASCENDING | DESCENDING) KEY? qualifiedDataName+
    ;

sortDuplicatesPhrase
    : WITH? DUPLICATES IN? ORDER?
    ;

sortCollatingSequencePhrase
    : COLLATING? SEQUENCE IS? alphabetName+ sortCollatingAlphanumeric? sortCollatingNational?
    ;

sortCollatingAlphanumeric
    : FOR? ALPHANUMERIC IS alphabetName
    ;

sortCollatingNational
    : FOR? NATIONAL IS? alphabetName
    ;

sortInputProcedurePhrase
    : INPUT PROCEDURE IS? procedureName sortInputThrough?
    ;

sortInputThrough
    : (THROUGH | THRU) procedureName
    ;

sortUsing
    : USING fileName+
    ;

sortOutputProcedurePhrase
    : OUTPUT PROCEDURE IS? procedureName sortOutputThrough?
    ;

sortOutputThrough
    : (THROUGH | THRU) procedureName
    ;

sortGivingPhrase
    : GIVING sortGiving+
    ;

sortGiving
    : fileName (LOCK | SAVE | NO REWIND | CRUNCH | RELEASE | WITH REMOVE CRUNCH)?
    ;

// use statement

useStatement
    : USE (useAfterClause | useDebugClause)
    ;

useAfterClause
    : GLOBAL? AFTER STANDARD? (EXCEPTION | ERROR) PROCEDURE ON? GENERIC_WORD? useAfterOn
    ;

useAfterOn
    : INPUT
    | OUTPUT
    | I_O
    | EXTEND
    | fileName+
    ;

useDebugClause
    : FOR? DEBUGGING ON? useDebugOn+
    ;

useDebugOn
    : ALL PROCEDURES
    | ALL REFERENCES? OF? identifier
    | procedureName
    | fileName
    ;

// generic statement

genericStatement
    : genericStatementText+
    ;

genericStatementText
    : reservedWord
    | execSqlStatement
    | cobolWord
    | literal
    | GENERIC_WORD
    ;

// arithmetic expression ----------------------------------

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
    | identifier
    | literal
    ;

// condition ----------------------------------

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
    : identifier IS? NOT? EQUALS? (
        NUMERIC
        | ALPHABETIC
        | ALPHABETIC_LOWER
        | ALPHABETIC_UPPER
        | DBCS
        | KANJI
        | className
        | figurativeConstant
    )
    ;

conditionNameReference
    : conditionName (inData* inFile? conditionNameSubscriptReference* | inMnemonic*)
    ;

conditionNameSubscriptReference
    : LPARENCHAR subscript_ (COMMACHAR? subscript_)* RPARENCHAR
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

// identifier ----------------------------------

identifier
    : qualifiedDataName
    | tableCall
    | functionCall
    | specialRegister
    | cobolWord WS_SUBSCRIPT
    ;

tableCall
    : qualifiedDataName (LPARENCHAR subscript_ (COMMACHAR? subscript_)* RPARENCHAR)* referenceModifier?
    ;

functionCall
    : FUNCTION functionName (LPARENCHAR argument (COMMACHAR? argument)* RPARENCHAR)* referenceModifier?
    ;

referenceModifier
    : LPARENCHAR characterPosition COLONCHAR length? RPARENCHAR
    ;

characterPosition
    : arithmeticExpression
    ;

length
    : arithmeticExpression
    ;

subscript_
    : ALL
    | integerLiteral
    | qualifiedDataName integerLiteral?
    | indexName integerLiteral?
    | arithmeticExpression
    ;

argument
    : literal
    | identifier
    | qualifiedDataName integerLiteral?
    | indexName integerLiteral?
    | arithmeticExpression
    ;

// qualified data name ----------------------------------

qualifiedDataName
    : qualifiedDataNameFormat1
    | qualifiedDataNameFormat2
    | qualifiedDataNameFormat3
    | qualifiedDataNameFormat4
    ;

qualifiedDataNameFormat1
    : (dataName | conditionName) (qualifiedInData+ inFile? | inFile)?
    ;

qualifiedDataNameFormat2
    : paragraphName inSection
    ;

qualifiedDataNameFormat3
    : textName inLibrary
    ;

qualifiedDataNameFormat4
    : LINAGE_COUNTER inFile
    ;

qualifiedInData
    : inData
    | inTable
    ;

// in ----------------------------------

inData
    : (IN | OF) dataName
    ;

inFile
    : (IN | OF) fileName
    ;

inMnemonic
    : (IN | OF) mnemonicName
    ;

inSection
    : (IN | OF) sectionName
    ;

inLibrary
    : (IN | OF) libraryName
    ;

inTable
    : (IN | OF) tableCall
    ;

// names ----------------------------------

alphabetName
    : cobolWord
    ;

className
    : cobolWord
    ;

conditionName
    : cobolWord
    | GENERIC_WORD
    ;

dataName
    : cobolWord
    | GENERIC_WORD
    ;

fileName
    : cobolWord
    ;

functionName
    : INTEGER
    | LENGTH
    | RANDOM
    | SUM
    | WHEN_COMPILED
    | cobolWord
    ;

indexName
    : cobolWord
    ;

libraryName
    : cobolWord
    ;

mnemonicName
    : cobolWord
    ;

paragraphName
    : NAME_IDENTIFIER
    ;

procedureName
    : paragraphName inSection?
    | sectionName
    ;

programName
    : NONNUMERICLITERAL
    | cobolWord
    ;

sectionName
    : NAME_IDENTIFIER
    | cobolWord
    | integerLiteral
    ;

textName
    : cobolWord
    ;

// literal ----------------------------------

genericText
    : reservedWord DOT_FS?
    | execSqlStatement DOT_FS?
    | cobolWord DOT_FS?
    | literal DOT_FS?
    | GENERIC_WORD DOT_FS?
    ;

cobolWord
    : IDENTIFIER
    | COBOL
    | PROGRAM
    | ABORT
    | AS
    | ASCII
    | ASSOCIATED_DATA
    | ASSOCIATED_DATA_LENGTH
    | ATTRIBUTE
    | AUTO
    | AUTO_SKIP
    | BACKGROUND_COLOR
    | BACKGROUND_COLOUR
    | BEEP
    | BELL
    | BINARY
    | BIT
    | BLINK
    | BOUNDS
    | CAPABLE
    | CCSVERSION
    | CHANGED
    | CHANNEL
    | CLOSE_DISPOSITION
    | COMMITMENT
    | CONTROL_POINT
    | CONVENTION
    | CRUNCH
    | CURSOR
    | DEFAULT
    | DEFAULT_DISPLAY
    | DEFINITION
    | DFHRESP
    | DFHVALUE
    | DISK
    | DONTCARE
    | DOUBLE
    | EBCDIC
    | EMPTY_CHECK
    | ENTER
    | ENTRY_PROCEDURE
    | EOL
    | EOS
    | ERASE
    | ESCAPE
    | EVENT
    | EXCLUSIVE
    | EXPORT
    | EXTENDED
    | FOREGROUND_COLOR
    | FOREGROUND_COLOUR
    | FULL
    | FUNCTIONNAME
    | FUNCTION_POINTER
    | GRID
    | HIGHLIGHT
    | IMPLICIT
    | IMPORT
    | INTEGER
    | KEPT
    | KEYBOARD
    | LANGUAGE
    | LB
    | LD
    | LEFTLINE
    | LENGTH_CHECK
    | LIBACCESS
    | LIBPARAMETER
    | LIBRARY
    | LIST
    | LOCAL
    | LONG_DATE
    | LONG_TIME
    | LOWER
    | LOWLIGHT
    | MMDDYYYY
    | NAMED
    | NATIONAL
    | NATIONAL_EDITED
    | NETWORK
    | NO_ECHO
    | NUMERIC_DATE
    | NUMERIC_TIME
    | ODT
    | ORDERLY
    | OVERLINE
    | OWN
    | PASSWORD
    | PORT
    | PRINTER
    | PRIVATE
    | PROCESS
    | PROMPT
    | READER
    | REAL
    | RECEIVED
    | RECURSIVE
    | REF
    | REMOTE
    | REMOVE
    | REQUIRED
    | REVERSE_VIDEO
    | SAVE
    | SECURE
    | SHARED
    | SHAREDBYALL
    | SHAREDBYRUNUNIT
    | SHARING
    | SHORT_DATE
    | SYMBOL
    | TASK
    | THREAD
    | THREAD_LOCAL
    | TIMER
    | TODAYS_DATE
    | TODAYS_NAME
    | TRUNCATED
    | TYPEDEF
    | UNDERLINE
    | VIRTUAL
    | WAIT
    | YEAR
    | YYYYMMDD
    | YYYYDDD
    | ZERO_FILL
    ;

reservedWord
    : ADD
    | ADDRESS
    | ALL
    | ALPHABETIC
    | ALPHABETIC_LOWER
    | ALPHABETIC_UPPER
    | ALPHANUMERIC
    | AND
    | ANY
    | AFTER
    | ARE
    | ASCENDING
    | ASTERISKCHAR
    | BEFORE
    | BY
    | CALL
    | CHAINING
    | COLLATING
    | COLONCHAR
    | COMMENTTAG
    | COMMACHAR
    | COMPUTE
    | DATA
    | DATE
    | DAY
    | DAY_OF_WEEK
    | DBCS
    | DEBUG_CONTENTS
    | DEBUG_ITEM
    | DEBUG_LINE
    | DEBUG_NAME
    | DEBUG_SUB_1
    | DEBUG_SUB_2
    | DEBUG_SUB_3
    | DEBUGGING
    | DEPENDING
    | DESCENDING
    | DISPLAY
    | DIVIDE
    | DOUBLEASTERISKCHAR
    | DOT
    | DUPLICATES
    | EQUALS
    | END
    | EVALUATE
    | ERROR
    | EQUALCHAR
    | EQUAL
    | EXCEPTION
    | EXTEND
    | FOR
    | FROM
    | FUNCTION
    | GIVING
    | GLOBAL
    | GREATER
    | IN
    | INPUT
    | INITIALIZE
    | IS
    | I_O
    | KANJI
    | KEY
    | LENGTH
    | LESS
    | LESSTHANCHAR
    | LESSTHANOREQUAL
    | LINAGE_COUNTER
    | LINE_COUNTER
    | LOCK
    | LPARENCHAR
    | MINUSCHAR
    | MORE_LABELS
    | MORETHANCHAR
    | MORETHANOREQUAL
    | MOVE
    | MULTIPLY
    | NEGATIVE
    | NO
    | NOT
    | NOTEQUALCHAR
    | NUMERIC
    | OF
    | ON
    | OPTIONAL
    | OR
    | ORDER
    | OUTPUT
    | PAGE_COUNTER
    | PLUSCHAR
    | POSITIVE
    | PROCEDURE
    | PROCEDURES
    | PROCEED
    | RANDOM
    | REFERENCE
    | REFERENCES
    | RELEASE
    | RETURNING
    | RETURN_CODE
    | REWIND
    | RPARENCHAR
    | SECTION
    | SEQUENCE
    | SET
    | SHIFT_IN
    | SHIFT_OUT
    | SLASHCHAR
    | SORT_CONTROL
    | SORT_CORE_SIZE
    | SORT_FILE_SIZE
    | SORT_MESSAGE
    | SORT_MODE_SIZE
    | SORT_RETURN
    | STANDARD
    | STRING
    | SUBTRACT
    | SUM
    | TALLY
    | TALLYING
    | TEST
    | THAN
    | THROUGH
    | THRU
    | TIME
    | TIMES
    | TO
    | USE
    | UNSTRING
    | UNTIL
    | USING
    | VALUE
    | VARYING
    | WHEN_COMPILED
    | WITH
    | WRITE
    | WS_SUBSCRIPT
    ;

literal
    : NONNUMERICLITERAL
    | figurativeConstant
    | numericLiteral
    | booleanLiteral
    | cicsDfhRespLiteral
    | cicsDfhValueLiteral
    ;

booleanLiteral
    : TRUE
    | FALSE
    ;

numericLiteral
    : NUMERICLITERAL
    | ZERO
    | integerLiteral
    ;

integerLiteral
    : INTEGERLITERAL
    | LEVEL_NUMBER_66
    | LEVEL_NUMBER_77
    | LEVEL_NUMBER_88
    ;

cicsDfhRespLiteral
    : DFHRESP LPARENCHAR (cobolWord | literal) RPARENCHAR
    ;

cicsDfhValueLiteral
    : DFHVALUE LPARENCHAR (cobolWord | literal) RPARENCHAR
    ;

// keywords ----------------------------------

figurativeConstant
    : ALL literal
    | HIGH_VALUE
    | HIGH_VALUES
    | LOW_VALUE
    | LOW_VALUES
    | NULL_
    | NULLS
    | QUOTE
    | QUOTES
    | SPACE
    | SPACES
    | ZERO
    | ZEROS
    | ZEROES
    ;

specialRegister
    : ADDRESS OF identifier
    | DATE
    | DAY
    | DAY_OF_WEEK
    | DEBUG_CONTENTS
    | DEBUG_ITEM
    | DEBUG_LINE
    | DEBUG_NAME
    | DEBUG_SUB_1
    | DEBUG_SUB_2
    | DEBUG_SUB_3
    | LENGTH OF? identifier
    | LINAGE_COUNTER
    | LINE_COUNTER
    | PAGE_COUNTER
    | RETURN_CODE
    | SHIFT_IN
    | SHIFT_OUT
    | SORT_CONTROL
    | SORT_CORE_SIZE
    | SORT_FILE_SIZE
    | SORT_MESSAGE
    | SORT_MODE_SIZE
    | SORT_RETURN
    | TALLY
    | TIME
    | WHEN_COMPILED
    ;

// lexer rules --------------------------------------------------------------------------------

// keywords
ABORT
    : A B O R T
    ;

ADD
    : A D D
    ;

ADDRESS
    : A D D R E S S
    ;

AFTER
    : A F T E R
    ;

ALL
    : A L L
    ;

ALPHABETIC
    : A L P H A B E T I C
    ;

ALPHABETIC_LOWER
    : A L P H A B E T I C MINUSCHAR L O W E R
    ;

ALPHABETIC_UPPER
    : A L P H A B E T I C MINUSCHAR U P P E R
    ;

ALPHANUMERIC
    : A L P H A N U M E R I C
    ;

ALTER
    : A L T E R
    ;

AND
    : A N D
    ;

ANY
    : A N Y
    ;

ARE
    : A R E
    ;

AS
    : A S
    ;

ASCENDING
    : A S C E N D I N G
    ;

ASCII
    : A S C I I
    ;

ASSOCIATED_DATA
    : A S S O C I A T E D MINUSCHAR D A T A
    ;

ASSOCIATED_DATA_LENGTH
    : A S S O C I A T E D MINUSCHAR D A T A MINUSCHAR L E N G T H
    ;

ATTRIBUTE
    : A T T R I B U T E
    ;

AUTO
    : A U T O
    ;

AUTO_SKIP
    : A U T O MINUSCHAR S K I P
    ;

BACKGROUND_COLOR
    : B A C K G R O U N D MINUSCHAR C O L O R
    ;

BACKGROUND_COLOUR
    : B A C K G R O U N D MINUSCHAR C O L O U R
    ;

BEEP
    : B E E P
    ;

BEFORE
    : B E F O R E
    ;

BELL
    : B E L L
    ;

BINARY
    : B I N A R Y
    ;

BIT
    : B I T
    ;

BLINK
    : B L I N K
    ;

BOUNDS
    : B O U N D S
    ;

BY
    : B Y
    ;

CALL
    : C A L L
    ;

CAPABLE
    : C A P A B L E
    ;

CCSVERSION
    : C C S V E R S I O N
    ;

CHAINING
    : C H A I N I N G
    ;

CHANGED
    : C H A N G E D
    ;

CHANNEL
    : C H A N N E L
    ;

CLOSE_DISPOSITION
    : C L O S E MINUSCHAR D I S P O S I T I O N
    ;

COBOL
    : C O B O L
    ;

COLLATING
    : C O L L A T I N G
    ;

COMMITMENT
    : C O M M I T M E N T
    ;

COMPUTE
    : C O M P U T E
    ;

CONTROL_POINT
    : C O N T R O L MINUSCHAR P O I N T
    ;

CONVENTION
    : C O N V E N T I O N
    ;

CRUNCH
    : C R U N C H
    ;

CURSOR
    : C U R S O R
    ;

DATA
    : D A T A
    ;

DATE
    : D A T E
    ;

DAY
    : D A Y
    ;

DAY_OF_WEEK
    : D A Y MINUSCHAR O F MINUSCHAR W E E K
    ;

DBCS
    : D B C S
    ;

DEBUG_CONTENTS
    : D E B U G MINUSCHAR C O N T E N T S
    ;

DEBUG_ITEM
    : D E B U G MINUSCHAR I T E M
    ;

DEBUG_LINE
    : D E B U G MINUSCHAR L I N E
    ;

DEBUG_NAME
    : D E B U G MINUSCHAR N A M E
    ;

DEBUG_SUB_1
    : D E B U G MINUSCHAR S U B MINUSCHAR '1'
    ;

DEBUG_SUB_2
    : D E B U G MINUSCHAR S U B MINUSCHAR '2'
    ;

DEBUG_SUB_3
    : D E B U G MINUSCHAR S U B MINUSCHAR '3'
    ;

DEBUGGING
    : D E B U G G I N G
    ;

DECLARATIVES
    : D E C L A R A T I V E S
    ;

DEFAULT
    : D E F A U L T
    ;

DESCENDING
    : D E S C E N D I N G
    ;

DISPLAY
    : D I S P L A Y
    ;

DEFAULT_DISPLAY
    : D E F A U L T MINUSCHAR D I S P L A Y
    ;

DEFINITION
    : D E F I N I T I O N
    ;

DEPENDING
    : D E P E N D I N G
    ;

DFHRESP
    : D F H R E S P
    ;

DFHVALUE
    : D F H V A L U E
    ;

DISK
    : D I S K
    ;

DIVIDE
    : D I V I D E
    ;

DIVISION
    : D I V I S I O N
    ;

DONTCARE
    : D O N T C A R E
    ;

DOUBLE
    : D O U B L E
    ;

DUPLICATES
    : D U P L I C A T E S
    ;

EBCDIC
    : E B C D I C
    ;

EMPTY_CHECK
    : E M P T Y MINUSCHAR C H E C K
    ;

END
    : E N D
    ;

END_PERFORM
    : E N D MINUSCHAR P E R F O R M
    ;

ENTER
    : E N T E R
    ;

ENTRY_PROCEDURE
    : E N T R Y MINUSCHAR P R O C E D U R E
    ;

ENVIRONMENT
    : E N V I R O N M E N T
    ;

EOL
    : E O L
    ;

EOS
    : E O S
    ;

EQUALS
    : E Q U A L S
    ;

ERASE
    : E R A S E
    ;

ESCAPE
    : E S C A P E
    ;

EVENT
    : E V E N T
    ;

EVALUATE
    : E V A L U A T E
    ;

ERROR
    : E R R O R
    ;

EQUAL
    : E Q U A L
    ;

EXCEPTION
    : E X C E P T I O N
    ;

EXCLUSIVE
    : E X C L U S I V E
    ;

EXPORT
    : E X P O R T
    ;

EXTEND
    : E X T E N D
    ;

EXTENDED
    : E X T E N D E D
    ;

FALSE
    : F A L S E
    ;

FOR
    : F O R
    ;

FOREGROUND_COLOR
    : F O R E G R O U N D MINUSCHAR C O L O R
    ;

FOREGROUND_COLOUR
    : F O R E G R O U N D MINUSCHAR C O L O U R
    ;

FULL
    : F U L L
    ;

FROM
    : F R O M
    ;

FUNCTION
    : F U N C T I O N
    ;

FUNCTIONNAME
    : F U N C T I O N N A M E
    ;

FUNCTION_POINTER
    : F U N C T I O N MINUSCHAR P O I N T E R
    ;

GIVING
    : G I V I N G
    ;

GLOBAL
    : G L O B A L
    ;

GO
    : G O
    ;

GREATER
    : G R E A T E R
    ;

GRID
    : G R I D
    ;

HIGHLIGHT
    : H I G H L I G H T
    ;

HIGH_VALUE
    : H I G H MINUSCHAR V A L U E
    ;

HIGH_VALUES
    : H I G H MINUSCHAR V A L U E S
    ;

ID
    : I D
    ;

IDENTIFICATION
    : I D E N T I F I C A T I O N
    ;

IMPLICIT
    : I M P L I C I T
    ;

IMPORT
    : I M P O R T
    ;

IN
    : I N
    ;

INPUT
    : I N P U T
    ;

INITIALIZE
    : I N I T I A L I Z E
    ;

INTEGER
    : I N T E G E R
    ;

IS
    : I S
    ;

I_O
    : I MINUSCHAR O
    ;

KANJI
    : K A N J I
    ;

KEPT
    : K E P T
    ;

KEY
    : K E Y
    ;

KEYBOARD
    : K E Y B O A R D
    ;

LANGUAGE
    : L A N G U A G E
    ;

LB
    : L B
    ;

LD
    : L D
    ;

LEFTLINE
    : L E F T L I N E
    ;

LENGTH
    : L E N G T H
    ;

LENGTH_CHECK
    : L E N G T H MINUSCHAR C H E C K
    ;

LESS
    : L E S S
    ;

LIBACCESS
    : L I B A C C E S S
    ;

LIBPARAMETER
    : L I B P A R A M E T E R
    ;

LIBRARY
    : L I B R A R Y
    ;

LINAGE_COUNTER
    : L I N A G E MINUSCHAR C O U N T E R
    ;

LINE_COUNTER
    : L I N E MINUSCHAR C O U N T E R
    ;

LIST
    : L I S T
    ;

LOCAL
    : L O C A L
    ;

LOCK
    : L O C K
    ;

LONG_DATE
    : L O N G MINUSCHAR D A T E
    ;

LONG_TIME
    : L O N G MINUSCHAR T I M E
    ;

LOW_VALUE
    : L O W MINUSCHAR V A L U E
    ;

LOW_VALUES
    : L O W MINUSCHAR V A L U E S
    ;

LOWER
    : L O W E R
    ;

LOWLIGHT
    : L O W L I G H T
    ;

MERGE
    : M E R G E
    ;

MMDDYYYY
    : M M D D Y Y Y Y
    ;

MORE_LABELS
    : M O R E MINUSCHAR L A B E L S
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

NAMED
    : N A M E D
    ;

NATIONAL
    : N A T I O N A L
    ;

NATIONAL_EDITED
    : N A T I O N A L MINUSCHAR E D I T E D
    ;

NETWORK
    : N E T W O R K
    ;

NO_ECHO
    : N O MINUSCHAR E C H O
    ;

NO
    : N O
    ;

NOT
    : N O T
    ;

NULL_
    : N U L L
    ;

NULLS
    : N U L L S
    ;

NUMERIC
    : N U M E R I C
    ;

NUMERIC_DATE
    : N U M E R I C MINUSCHAR D A T E
    ;

NUMERIC_TIME
    : N U M E R I C MINUSCHAR T I M E
    ;

OF
    : O F
    ;

ODT
    : O D T
    ;

ON
    : O N
    ;

OPTIONAL
    : O P T I O N A L
    ;

OR
    : O R
    ;

ORDER
    : O R D E R
    ;

ORDERLY
    : O R D E R L Y
    ;

QUOTE
    : Q U O T E
    ;

QUOTES
    : Q U O T E S
    ;

OUTPUT
    : O U T P U T
    ;

OVERLINE
    : O V E R L I N E
    ;

OWN
    : O W N
    ;

PAGE_COUNTER
    : P A G E MINUSCHAR C O U N T E R
    ;

PASSWORD
    : P A S S W O R D
    ;

PORT
    : P O R T
    ;

POSITIVE
    : P O S I T I V E
    ;

PRINTER
    : P R I N T E R
    ;

PRIVATE
    : P R I V A T E
    ;

PROCEDURE
    : P R O C E D U R E
    ;

PROCEDURES
    : P R O C E D U R E S
    ;

PROCEED
    : P R O C E E D
    ;

PROCESS
    : P R O C E S S
    ;

PROGRAM
    : P R O G R A M
    ;

PERFORM
    : P E R F O R M
    ;

PROMPT
    : P R O M P T
    ;

READER
    : R E A D E R
    ;

REAL
    : R E A L
    ;

RANDOM
    : R A N D O M
    ;

RECEIVED
    : R E C E I V E D
    ;

RECURSIVE
    : R E C U R S I V E
    ;

REF
    : R E F
    ;

REFERENCE
    : R E F E R E N C E
    ;

REFERENCES
    : R E F E R E N C E S
    ;

RELEASE
    : R E L E A S E
    ;

REMOTE
    : R E M O T E
    ;

REMOVE
    : R E M O V E
    ;

REQUIRED
    : R E Q U I R E D
    ;

RETURNING
    : R E T U R N I N G
    ;

RETURN_CODE
    : R E T U R N MINUSCHAR C O D E
    ;

REVERSE_VIDEO
    : R E S E R V E MINUSCHAR V I D E O
    ;

REWIND
    : R E W I N D
    ;

SAVE
    : S A V E
    ;

SECURE
    : S E C U R E
    ;

SECTION
    : S E C T I O N
    ;

SEQUENCE
    : S E Q U E N C E
    ;

SET
    : S E T
    ;

SHARED
    : S H A R E D
    ;

SHAREDBYALL
    : S H A R E D B Y A L L
    ;

SHAREDBYRUNUNIT
    : S H A R E D B Y R U N U N I T
    ;

SHARING
    : S H A R I N G
    ;

SHIFT_IN
    : S H I F T MINUSCHAR I N
    ;

SHIFT_OUT
    : S H I F T MINUSCHAR O U T
    ;

SHORT_DATE
    : S H O R T MINUSCHAR D A T E
    ;

SORT
    : S O R T
    ;

SORT_CONTROL
    : S O R T MINUSCHAR C O N T R O L
    ;

SORT_CORE_SIZE
    : S O R T MINUSCHAR C O R E MINUSCHAR S I Z E
    ;

SORT_FILE_SIZE
    : S O R T MINUSCHAR F I L E MINUSCHAR S I Z E
    ;

SORT_MESSAGE
    : S O R T MINUSCHAR M E S S A G E
    ;

SORT_MODE_SIZE
    : S O R T MINUSCHAR M O D E MINUSCHAR S I Z E
    ;

SORT_RETURN
    : S O R T MINUSCHAR R E T U R N
    ;

SPACE
    : S P A C E
    ;

SPACES
    : S P A C E S
    ;

STANDARD
    : S T A N D A R D
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

SYMBOL
    : S Y M B O L
    ;

TALLY
    : T A L L Y
    ;

TALLYING
    : T A L L Y I N G
    ;

TASK
    : T A S K
    ;

TEST
    : T E S T
    ;

THAN
    : T H A N
    ;

THREAD
    : T H R E A D
    ;

THREAD_LOCAL
    : T H R E A D MINUSCHAR L O C A L
    ;

THROUGH
    : T H R O U G H
    ;

THRU
    : T H R U
    ;

TIME
    : T I M E
    ;

TIMER
    : T I M E R
    ;

TIMES
    : T I M E S
    ;

TO
    : T O
    ;

TODAYS_DATE
    : T O D A Y S MINUSCHAR D A T E
    ;

TODAYS_NAME
    : T O D A Y S MINUSCHAR N A M E
    ;

TRUE
    : T R U E
    ;

TRUNCATED
    : T R U N C A T E D
    ;

TYPEDEF
    : T Y P E D E F
    ;

UNDERLINE
    : U N D E R L I N E
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

VIRTUAL
    : V I R T U A L
    ;

WAIT
    : W A I T
    ;

WHEN_COMPILED
    : W H E N MINUSCHAR C O M P I L E D
    ;

WITH
    : W I T H
    ;

WRITE
    : W R I T E
    ;

WS_SUBSCRIPT
    : LPARENCHAR W S MINUSCHAR S U B S C R I P T RPARENCHAR
    ;

YEAR
    : Y E A R
    ;

YYYYMMDD
    : Y Y Y Y M M D D
    ;

YYYYDDD
    : Y Y Y Y D D D
    ;

ZERO
    : Z E R O
    ;

ZERO_FILL
    : Z E R O MINUSCHAR F I L L
    ;

ZEROS
    : Z E R O S
    ;

ZEROES
    : Z E R O E S
    ;

// symbols

ASTERISKCHAR
    : '*'
    ;

COLONCHAR
    : ':'
    ;

COMMENTTAG
    : '*>'
    ;

COMMACHAR
    : ','
    ;

DOUBLEASTERISKCHAR
    : '**'
    ;

// period full stop
DOT_FS
    : '.' ('\r' | '\n' | '\f' | '\t' | ' ')+
    | '.' EOF
    ;

DOT
    : '.'
    ;

EQUALCHAR
    : '='
    ;

LESSTHANCHAR
    : '<'
    ;

LESSTHANOREQUAL
    : '<='
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

NOTEQUALCHAR
    : '<>'
    ;

PLUSCHAR
    : '+'
    ;

RPARENCHAR
    : ')'
    ;

SLASHCHAR
    : '/'
    ;

// literals
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

LEVEL_NUMBER_66
    : '66'
    ;

LEVEL_NUMBER_77
    : '77'
    ;

LEVEL_NUMBER_88
    : '88'
    ;

INTEGERLITERAL
    : (PLUSCHAR | MINUSCHAR)? [0-9]+
    ;

NUMERICLITERAL
    : (PLUSCHAR | MINUSCHAR)? [0-9]* (DOT | COMMACHAR) [0-9]+ (
        ('e' | 'E') (PLUSCHAR | MINUSCHAR)? [0-9]+
    )?
    ;

NAME_IDENTIFIER
    : [0-9][0-9][0-9]+ [a-zA-Z]* ([-_]+ [a-zA-Z0-9]+)*
    ;

IDENTIFIER
    : [a-zA-Z0-9]+ ([-_]+ [a-zA-Z0-9]+)*
    ;

// whitespace, line breaks, comments, ...
NEWLINE
    : '\r'? '\n' -> channel(HIDDEN)
    ;

EXECSQLLINE
    : 'EXEC SQL' .*? 'END-EXEC'
    ;

COMMENTLINE
    : COMMENTTAG WS ~('\n' | '\r')* -> channel(HIDDEN)
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