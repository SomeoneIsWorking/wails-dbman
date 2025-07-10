import type { SqlStatementNode, SelectStatementNode } from './ast';

/**
 * Parser state enumeration
 */
export enum ParserState {
  INITIAL = 'initial',
  SELECT_STATEMENT = 'select_statement',
  SELECT_CLAUSE = 'select_clause',
  FROM_CLAUSE = 'from_clause',
  WHERE_CLAUSE = 'where_clause',
  JOIN_CLAUSE = 'join_clause',
  GROUP_BY_CLAUSE = 'group_by_clause',
  HAVING_CLAUSE = 'having_clause',
  ORDER_BY_CLAUSE = 'order_by_clause',
  INSERT_STATEMENT = 'insert_statement',
  UPDATE_STATEMENT = 'update_statement',
  DELETE_STATEMENT = 'delete_statement',
  MERGE_STATEMENT = 'merge_statement',
  WITH_STATEMENT = 'with_statement',
  IF_STATEMENT = 'if_statement',
  WHILE_STATEMENT = 'while_statement',
  BEGIN_STATEMENT = 'begin_statement',
  DECLARE_STATEMENT = 'declare_statement',
  SET_STATEMENT = 'set_statement',
  EXEC_STATEMENT = 'exec_statement',
  EXPRESSION = 'expression',
  SUBQUERY = 'subquery',
  FUNCTION_CALL = 'function_call',
  PARENTHESES = 'parentheses'
}

/**
 * Parse error information
 */
export interface ParseError {
  message: string;
  position: number;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  code?: string;
}

/**
 * Parse result
 */
export interface SqlParseResult {
  statements: SqlStatementNode[];
  resultProducingStatements: SelectStatementNode[];
  errors: ParseError[];
  warnings: string[];
  success: boolean;
}

/**
 * Parser options
 */
export interface ParserOptions {
  allowPartialParsing?: boolean;
  maxErrors?: number;
  includeComments?: boolean;
  strictMode?: boolean;
}

/**
 * Parser context for state management
 */
export interface ParserContext {
  state: ParserState;
  level: number;
  statementContext: string;
  expectingTokens: string[];
  parentStatements: SqlStatementNode[];
  currentStatement?: SqlStatementNode;
}

/**
 * Token stream position
 */
export interface TokenStreamPosition {
  index: number;
  line: number;
  column: number;
}

/**
 * Statement parsing result
 */
export interface StatementParseResult {
  statement: SqlStatementNode;
  nextPosition: number;
  errors: ParseError[];
  warnings: string[];
}

/**
 * Conditional block information
 */
export interface ConditionalBlock {
  type: 'if' | 'while' | 'try' | 'catch';
  condition?: string;
  statements: SqlStatementNode[];
  elseStatements?: SqlStatementNode[];
  level: number;
}

/**
 * Column reference information
 */
export interface ColumnReference {
  name: string;
  alias?: string;
  table?: string;
  schema?: string;
  expression?: string;
  isWildcard: boolean;
  isFunction: boolean;
  functionName?: string;
  dataType?: string;
}

/**
 * Table reference information
 */
export interface TableReference {
  name: string;
  alias?: string;
  schema?: string;
  database?: string;
  isSubquery: boolean;
  subqueryContent?: string;
}

/**
 * Join reference information
 */
export interface JoinReference {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  table: TableReference;
  condition?: string;
}

/**
 * CTE reference information
 */
export interface CTEReference {
  name: string;
  columns?: string[];
  definition: string;
}

/**
 * Procedure analysis result
 */
export interface ProcedureAnalysisResult {
  statements: SqlStatementNode[];
  selectStatements: SelectStatementNode[];
  conditionalBlocks: ConditionalBlock[];
  warnings: string[];
  success: boolean;
} 