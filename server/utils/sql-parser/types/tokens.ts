/**
 * SQL Token types for lexical analysis
 */
export enum TokenType {
  // Keywords - DML
  SELECT = 'SELECT',
  FROM = 'FROM',
  WHERE = 'WHERE',
  INSERT = 'INSERT',
  INTO = 'INTO',
  VALUES = 'VALUES',
  UPDATE = 'UPDATE',
  SET = 'SET',
  DELETE = 'DELETE',
  MERGE = 'MERGE',
  
  // Keywords - Joins
  JOIN = 'JOIN',
  INNER = 'INNER',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  FULL = 'FULL',
  CROSS = 'CROSS',
  ON = 'ON',
  
  // Keywords - Common Table Expressions
  WITH = 'WITH',
  AS = 'AS',
  
  // Keywords - Control Flow
  IF = 'IF',
  ELSE = 'ELSE',
  WHILE = 'WHILE',
  BEGIN = 'BEGIN',
  END = 'END',
  TRY = 'TRY',
  CATCH = 'CATCH',
  RETURN = 'RETURN',
  
  // Keywords - Variables and Execution
  DECLARE = 'DECLARE',
  EXEC = 'EXEC',
  EXECUTE = 'EXECUTE',
  
  // Keywords - Logical
  EXISTS = 'EXISTS',
  NOT = 'NOT',
  AND = 'AND',
  OR = 'OR',
  IN = 'IN',
  LIKE = 'LIKE',
  BETWEEN = 'BETWEEN',
  IS = 'IS',
  NULL = 'NULL',
  
  // Keywords - Conditional
  CASE = 'CASE',
  WHEN = 'WHEN',
  THEN = 'THEN',
  
  // Keywords - Aggregation and Grouping
  GROUP = 'GROUP',
  BY = 'BY',
  HAVING = 'HAVING',
  ORDER = 'ORDER',
  ASC = 'ASC',
  DESC = 'DESC',
  DISTINCT = 'DISTINCT',
  ALL = 'ALL',
  
  // Keywords - Set Operations
  UNION = 'UNION',
  INTERSECT = 'INTERSECT',
  EXCEPT = 'EXCEPT',
  
  // Keywords - MERGE specific
  USING = 'USING',
  MATCHED = 'MATCHED',
  
  // Literals and identifiers
  IDENTIFIER = 'IDENTIFIER',
  BRACKETED_IDENTIFIER = 'BRACKETED_IDENTIFIER',
  STRING_LITERAL = 'STRING_LITERAL',
  NUMBER_LITERAL = 'NUMBER_LITERAL',
  PARAMETER = 'PARAMETER',
  
  // Operators - Comparison
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN = 'GREATER_THAN',
  LESS_EQUAL = 'LESS_EQUAL',
  GREATER_EQUAL = 'GREATER_EQUAL',
  
  // Operators - Arithmetic
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  MODULO = 'MODULO',
  
  // Punctuation
  COMMA = 'COMMA',
  SEMICOLON = 'SEMICOLON',
  DOT = 'DOT',
  LEFT_PAREN = 'LEFT_PAREN',
  RIGHT_PAREN = 'RIGHT_PAREN',
  LEFT_BRACKET = 'LEFT_BRACKET',
  RIGHT_BRACKET = 'RIGHT_BRACKET',
  
  // Special
  WHITESPACE = 'WHITESPACE',
  COMMENT = 'COMMENT',
  EOF = 'EOF',
  UNKNOWN = 'UNKNOWN'
}

/**
 * SQL Token with position information
 */
export interface SqlToken {
  type: TokenType;
  value: string;
  startPosition: number;
  endPosition: number;
  line: number;
  column: number;
}

/**
 * Token position information
 */
export interface TokenPosition {
  line: number;
  column: number;
  position: number;
}

/**
 * Lexer options
 */
export interface LexerOptions {
  includeWhitespace?: boolean;
  includeComments?: boolean;
  caseSensitive?: boolean;
} 