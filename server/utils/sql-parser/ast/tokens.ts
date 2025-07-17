import { createToken, Lexer, TokenType as ChevrotainTokenType } from 'chevrotain';

/**
 * SQL Token Definitions for Chevrotain Parser
 */

// Keywords
export const SELECT = createToken({ name: 'SELECT', pattern: /SELECT/i });
export const FROM = createToken({ name: 'FROM', pattern: /FROM/i });
export const WHERE = createToken({ name: 'WHERE', pattern: /WHERE/i });
export const INSERT = createToken({ name: 'INSERT', pattern: /INSERT/i });
export const INTO = createToken({ name: 'INTO', pattern: /INTO/i });
export const VALUES = createToken({ name: 'VALUES', pattern: /VALUES/i });
export const UPDATE = createToken({ name: 'UPDATE', pattern: /UPDATE/i });
export const SET = createToken({ name: 'SET', pattern: /SET/i });
export const DELETE = createToken({ name: 'DELETE', pattern: /DELETE/i });
export const MERGE = createToken({ name: 'MERGE', pattern: /MERGE/i });

// Joins
export const JOIN = createToken({ name: 'JOIN', pattern: /JOIN/i });
export const INNER = createToken({ name: 'INNER', pattern: /INNER/i });
export const LEFT = createToken({ name: 'LEFT', pattern: /LEFT/i });
export const RIGHT = createToken({ name: 'RIGHT', pattern: /RIGHT/i });
export const FULL = createToken({ name: 'FULL', pattern: /FULL/i });
export const CROSS = createToken({ name: 'CROSS', pattern: /CROSS/i });
export const ON = createToken({ name: 'ON', pattern: /ON/i });

// Common Table Expressions
export const WITH = createToken({ name: 'WITH', pattern: /WITH/i });
export const AS = createToken({ name: 'AS', pattern: /AS/i });

// Control Flow
export const IF = createToken({ name: 'IF', pattern: /IF/i });
export const ELSE = createToken({ name: 'ELSE', pattern: /ELSE/i });
export const WHILE = createToken({ name: 'WHILE', pattern: /WHILE/i });
export const BEGIN = createToken({ name: 'BEGIN', pattern: /BEGIN/i });
export const END = createToken({ name: 'END', pattern: /END/i });
export const TRY = createToken({ name: 'TRY', pattern: /TRY/i });
export const CATCH = createToken({ name: 'CATCH', pattern: /CATCH/i });
export const RETURN = createToken({ name: 'RETURN', pattern: /RETURN/i });

// Variables and Execution
export const DECLARE = createToken({ name: 'DECLARE', pattern: /DECLARE/i });
export const EXEC = createToken({ name: 'EXEC', pattern: /EXEC/i });
export const EXECUTE = createToken({ name: 'EXECUTE', pattern: /EXECUTE/i });
export const CREATE = createToken({ name: 'CREATE', pattern: /CREATE/i });
export const PROCEDURE = createToken({ name: 'PROCEDURE', pattern: /PROCEDURE/i });
export const ALTER = createToken({ name: 'ALTER', pattern: /ALTER/i });
export const DROP = createToken({ name: 'DROP', pattern: /DROP/i });

// Logical
export const EXISTS = createToken({ name: 'EXISTS', pattern: /EXISTS/i });
export const NOT = createToken({ name: 'NOT', pattern: /NOT/i });
export const AND = createToken({ name: 'AND', pattern: /\bAND\b/i });
export const OR = createToken({ name: 'OR', pattern: /\bOR\b/i });
export const IN = createToken({ name: 'IN', pattern: /\bIN\b/i });
export const LIKE = createToken({ name: 'LIKE', pattern: /\bLIKE\b/i });
export const BETWEEN = createToken({ name: 'BETWEEN', pattern: /\bBETWEEN\b/i });
export const IS = createToken({ name: 'IS', pattern: /\bIS\b/i });
export const NULL = createToken({ name: 'NULL', pattern: /\bNULL\b/i });
export const ISNULL = createToken({ name: 'ISNULL', pattern: /\bISNULL\b/i });
export const CAST = createToken({ name: 'CAST', pattern: /\bCAST\b/i });
export const CONVERT = createToken({ name: 'CONVERT', pattern: /\bCONVERT\b/i });

// Conditional
export const CASE = createToken({ name: 'CASE', pattern: /CASE/i });
export const WHEN = createToken({ name: 'WHEN', pattern: /WHEN/i });
export const THEN = createToken({ name: 'THEN', pattern: /THEN/i });

// Aggregation and Grouping
export const GROUP = createToken({ name: 'GROUP', pattern: /GROUP/i });
export const BY = createToken({ name: 'BY', pattern: /BY/i });
export const HAVING = createToken({ name: 'HAVING', pattern: /HAVING/i });
export const ORDER = createToken({ name: 'ORDER', pattern: /ORDER/i });
export const ASC = createToken({ name: 'ASC', pattern: /ASC/i });
export const DESC = createToken({ name: 'DESC', pattern: /DESC/i });
export const DISTINCT = createToken({ name: 'DISTINCT', pattern: /DISTINCT/i });
export const ALL = createToken({ name: 'ALL', pattern: /ALL/i });

// Set Operations
export const UNION = createToken({ name: 'UNION', pattern: /UNION/i });
export const INTERSECT = createToken({ name: 'INTERSECT', pattern: /INTERSECT/i });
export const EXCEPT = createToken({ name: 'EXCEPT', pattern: /EXCEPT/i });

// MERGE specific
export const USING = createToken({ name: 'USING', pattern: /USING/i });
export const MATCHED = createToken({ name: 'MATCHED', pattern: /MATCHED/i });

// Data Types
export const INT = createToken({ name: 'INT', pattern: /INT/i });
export const BIGINT = createToken({ name: 'BIGINT', pattern: /BIGINT/i });
export const SMALLINT = createToken({ name: 'SMALLINT', pattern: /SMALLINT/i });
export const TINYINT = createToken({ name: 'TINYINT', pattern: /TINYINT/i });
export const DECIMAL = createToken({ name: 'DECIMAL', pattern: /DECIMAL/i });
export const NUMERIC = createToken({ name: 'NUMERIC', pattern: /NUMERIC/i });
export const FLOAT = createToken({ name: 'FLOAT', pattern: /FLOAT/i });
export const REAL = createToken({ name: 'REAL', pattern: /REAL/i });
export const CHAR = createToken({ name: 'CHAR', pattern: /CHAR/i });
export const VARCHAR = createToken({ name: 'VARCHAR', pattern: /VARCHAR/i });
export const NCHAR = createToken({ name: 'NCHAR', pattern: /NCHAR/i });
export const NVARCHAR = createToken({ name: 'NVARCHAR', pattern: /NVARCHAR/i });
export const TEXT = createToken({ name: 'TEXT', pattern: /TEXT/i });
export const NTEXT = createToken({ name: 'NTEXT', pattern: /NTEXT/i });
export const DATETIME = createToken({ name: 'DATETIME', pattern: /DATETIME/i });
export const DATE = createToken({ name: 'DATE', pattern: /DATE/i });
export const TIME = createToken({ name: 'TIME', pattern: /TIME/i });
export const TIMESTAMP = createToken({ name: 'TIMESTAMP', pattern: /TIMESTAMP/i });
export const BIT = createToken({ name: 'BIT', pattern: /BIT/i });
export const BINARY = createToken({ name: 'BINARY', pattern: /BINARY/i });
export const VARBINARY = createToken({ name: 'VARBINARY', pattern: /VARBINARY/i });
export const UNIQUEIDENTIFIER = createToken({ name: 'UNIQUEIDENTIFIER', pattern: /UNIQUEIDENTIFIER/i });
export const XML = createToken({ name: 'XML', pattern: /XML/i });
export const TABLE = createToken({ name: 'TABLE', pattern: /TABLE/i });

// Procedure-specific tokens
export const PROC = createToken({ name: 'PROC', pattern: /PROC/i });

// SET statement tokens
export const TRANSACTION = createToken({ name: 'TRANSACTION', pattern: /TRANSACTION/i });
export const ISOLATION = createToken({ name: 'ISOLATION', pattern: /ISOLATION/i });
export const LEVEL = createToken({ name: 'LEVEL', pattern: /LEVEL/i });
export const READ = createToken({ name: 'READ', pattern: /READ/i });
export const UNCOMMITTED = createToken({ name: 'UNCOMMITTED', pattern: /UNCOMMITTED/i });
export const COMMITTED = createToken({ name: 'COMMITTED', pattern: /COMMITTED/i });
export const REPEATABLE = createToken({ name: 'REPEATABLE', pattern: /REPEATABLE/i });
export const SERIALIZABLE = createToken({ name: 'SERIALIZABLE', pattern: /SERIALIZABLE/i });
export const NOCOUNT = createToken({ name: 'NOCOUNT', pattern: /NOCOUNT/i });
export const ANSI_NULLS = createToken({ name: 'ANSI_NULLS', pattern: /ANSI_NULLS/i });
export const QUOTED_IDENTIFIER = createToken({ name: 'QUOTED_IDENTIFIER', pattern: /QUOTED_IDENTIFIER/i });

// Literals and identifiers
export const IDENTIFIER = createToken({ name: 'IDENTIFIER', pattern: /[a-zA-Z_][a-zA-Z0-9_]*/ });
export const BRACKETED_IDENTIFIER = createToken({ name: 'BRACKETED_IDENTIFIER', pattern: /\[[^\]]+\]/ });
export const STRING_LITERAL = createToken({ name: 'STRING_LITERAL', pattern: /'([^'\\]|\\.)*'/ });
export const NUMBER_LITERAL = createToken({ name: 'NUMBER_LITERAL', pattern: /\d+(\.\d+)?/ });
export const PARAMETER = createToken({ name: 'PARAMETER', pattern: /@[a-zA-Z_][a-zA-Z0-9_]*/ });

// Operators
export const EQUALS = createToken({ name: 'EQUALS', pattern: /=/ });
export const NOT_EQUALS = createToken({ name: 'NOT_EQUALS', pattern: /(<>|!=)/ });
export const LESS_THAN = createToken({ name: 'LESS_THAN', pattern: /</ });
export const GREATER_THAN = createToken({ name: 'GREATER_THAN', pattern: />/ });
export const LESS_EQUAL = createToken({ name: 'LESS_EQUAL', pattern: /<=/ });
export const GREATER_EQUAL = createToken({ name: 'GREATER_EQUAL', pattern: />=/ });
export const PLUS = createToken({ name: 'PLUS', pattern: /\+/ });
export const MINUS = createToken({ name: 'MINUS', pattern: /-/ });
export const MULTIPLY = createToken({ name: 'MULTIPLY', pattern: /\*/ });
export const DIVIDE = createToken({ name: 'DIVIDE', pattern: /\// });
export const MODULO = createToken({ name: 'MODULO', pattern: /%/ });

// Punctuation
export const COMMA = createToken({ name: 'COMMA', pattern: /,/ });
export const SEMICOLON = createToken({ name: 'SEMICOLON', pattern: /;/ });
export const DOT = createToken({ name: 'DOT', pattern: /\./ });
export const LEFT_PAREN = createToken({ name: 'LEFT_PAREN', pattern: /\(/ });
export const RIGHT_PAREN = createToken({ name: 'RIGHT_PAREN', pattern: /\)/ });
export const LEFT_BRACKET = createToken({ name: 'LEFT_BRACKET', pattern: /\[/ });
export const RIGHT_BRACKET = createToken({ name: 'RIGHT_BRACKET', pattern: /\]/ });

// Special
export const WHITESPACE = createToken({ 
  name: 'WHITESPACE', 
  pattern: /\s+/,
  group: Lexer.SKIPPED
});

export const COMMENT = createToken({ 
  name: 'COMMENT', 
  pattern: /(--[^\n\r]*|\/\*[\s\S]*?\*\/)/,
  group: Lexer.SKIPPED
});

/**
 * All tokens in order of precedence (longer patterns first for proper matching)
 */
export const allTokens: ChevrotainTokenType[] = [
  // Whitespace and comments (skipped)
  WHITESPACE,
  COMMENT,
  
  // Multi-character operators first
  NOT_EQUALS,
  LESS_EQUAL,
  GREATER_EQUAL,
  
  // Keywords - sorted by length (longer first) to avoid conflicts
  QUOTED_IDENTIFIER, // 17 chars
  UNIQUEIDENTIFIER, // 16 chars
  SERIALIZABLE, // 12 chars
  TRANSACTION, // 11 chars
  UNCOMMITTED, // 11 chars
  ANSI_NULLS, // 10 chars
  REPEATABLE, // 10 chars
  PROCEDURE,  // 9 chars
  INTERSECT,  // 9 chars
  VARBINARY,  // 9 chars
  TIMESTAMP,  // 9 chars
  ISOLATION,  // 9 chars
  COMMITTED,  // 9 chars
  DATETIME,   // 8 chars
  DISTINCT,   // 8 chars
  NVARCHAR,   // 8 chars
  SMALLINT,   // 8 chars
  CONVERT,    // 7 chars
  NOCOUNT,    // 7 chars
  EXECUTE,    // 7 chars
  BETWEEN,    // 7 chars
  MATCHED,    // 7 chars
  DECLARE,    // 7 chars
  VARCHAR,    // 7 chars
  DECIMAL,    // 7 chars
  NUMERIC,    // 7 chars
  TINYINT,    // 7 chars
  BIGINT,     // 6 chars
  CREATE,     // 6 chars
  INSERT,     // 6 chars
  DELETE,     // 6 chars
  UPDATE,     // 6 chars
  SELECT,     // 6 chars
  VALUES,     // 6 chars
  EXCEPT,     // 6 chars
  EXISTS,     // 6 chars
  HAVING,     // 6 chars
  RETURN,     // 6 chars
  BINARY,     // 6 chars
  ISNULL,     // 6 chars
  NCHAR,      // 5 chars
  NTEXT,      // 5 chars
  FLOAT,      // 5 chars
  TABLE,      // 5 chars
  ALTER,      // 5 chars
  WHERE,      // 5 chars
  WHILE,      // 5 chars
  USING,      // 5 chars
  UNION,      // 5 chars
  RIGHT,      // 5 chars
  ORDER,      // 5 chars
  MERGE,      // 5 chars
  INNER,      // 5 chars
  GROUP,      // 5 chars
  CROSS,      // 5 chars
  CATCH,      // 5 chars
  BEGIN,      // 5 chars
  LEVEL,      // 5 chars
  INTO,       // 4 chars
  LIKE,       // 4 chars
  JOIN,       // 4 chars
  FULL,       // 4 chars
  FROM,       // 4 chars
  EXEC,       // 4 chars
  ELSE,       // 4 chars
  DESC,       // 4 chars
  CASE,       // 4 chars
  THEN,       // 4 chars
  WHEN,       // 4 chars
  WITH,       // 4 chars
  NULL,       // 4 chars
  LEFT,       // 4 chars
  DROP,       // 4 chars
  CHAR,       // 4 chars
  TEXT,       // 4 chars
  DATE,       // 4 chars
  TIME,       // 4 chars
  REAL,       // 4 chars
  PROC,       // 4 chars
  READ,       // 4 chars
  CAST,       // 4 chars
  ALL,        // 3 chars
  AND,        // 3 chars
  ASC,        // 3 chars
  TRY,        // 3 chars
  NOT,        // 3 chars
  SET,        // 3 chars
  END,        // 3 chars
  INT,        // 3 chars
  BIT,        // 3 chars
  XML,        // 3 chars
  AS,         // 2 chars
  BY,         // 2 chars
  IF,         // 2 chars
  IN,         // 2 chars
  IS,         // 2 chars
  ON,         // 2 chars
  OR,         // 2 chars
  
  // Literals and identifiers
  BRACKETED_IDENTIFIER,
  STRING_LITERAL,
  NUMBER_LITERAL,
  PARAMETER,
  IDENTIFIER,
  
  // Single-character operators and punctuation
  EQUALS,
  LESS_THAN,
  GREATER_THAN,
  PLUS,
  MINUS,
  MULTIPLY,
  DIVIDE,
  MODULO,
  COMMA,
  SEMICOLON,
  DOT,
  LEFT_PAREN,
  RIGHT_PAREN,
  LEFT_BRACKET,
  RIGHT_BRACKET
];
