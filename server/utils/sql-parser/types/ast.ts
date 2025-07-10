/**
 * Base AST Node interface
 */
export interface AstNode {
  nodeType: string;
  parent?: AstNode;
  children: AstNode[];
  metadata?: Record<string, any>;
}

/**
 * SQL Statement context types
 */
export enum StatementContext {
  STANDALONE = 'standalone',
  SUBQUERY = 'subquery',
  EXISTS_CLAUSE = 'exists_clause',
  IN_CLAUSE = 'in_clause',
  COMPARISON_SUBQUERY = 'comparison_subquery',
  CTE = 'cte',
  DERIVED_TABLE = 'derived_table',
  INSERT_SELECT = 'insert_select',
  UPDATE_SET = 'update_set',
  MERGE_SOURCE = 'merge_source'
}

/**
 * SQL Statement AST Node
 */
export interface SqlStatementNode extends AstNode {
  nodeType: 'statement';
  statementType: 'select' | 'insert' | 'update' | 'delete' | 'merge' | 'with' | 'if' | 'while' | 'begin' | 'end' | 'declare' | 'set' | 'exec' | 'return' | 'create' | 'create_procedure' | 'unknown';
  context: StatementContext;
  content: string;
  level: number;
  isResultProducing: boolean;
  isSubquery: boolean;
  metadata?: {
    isConditional?: boolean;
    isInLoop?: boolean;
    isInTransaction?: boolean;
    parentStructure?: string;
  };
}

/**
 * SELECT Statement AST Node
 */
export interface SelectStatementNode extends SqlStatementNode {
  statementType: 'select';
  selectClause: SelectClauseNode;
  fromClause?: FromClauseNode;
  whereClause?: WhereClauseNode;
  groupByClause?: GroupByClauseNode;
  havingClause?: HavingClauseNode;
  orderByClause?: OrderByClauseNode;
  cteClause?: CteClauseNode;
}

/**
 * SELECT Clause AST Node
 */
export interface SelectClauseNode extends AstNode {
  nodeType: 'select_clause';
  columns: ColumnReferenceNode[];
  isDistinct: boolean;
  isWildcard: boolean;
}

/**
 * Column Reference AST Node
 */
export interface ColumnReferenceNode extends AstNode {
  nodeType: 'column_reference';
  columnName: string;
  tableName?: string;
  schemaName?: string;
  alias?: string;
  expression?: ExpressionNode;
  isWildcard: boolean;
  isFunction: boolean;
  functionName?: string;
  dataType?: string;
}

/**
 * FROM Clause AST Node
 */
export interface FromClauseNode extends AstNode {
  nodeType: 'from_clause';
  tables: TableReferenceNode[];
  joins: JoinNode[];
}

/**
 * Table Reference AST Node
 */
export interface TableReferenceNode extends AstNode {
  nodeType: 'table_reference';
  tableName: string;
  schemaName?: string;
  databaseName?: string;
  alias?: string;
  isSubquery: boolean;
  subquery?: SelectStatementNode;
  isTableVariable: boolean;
}

/**
 * JOIN AST Node
 */
export interface JoinNode extends AstNode {
  nodeType: 'join';
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  table: TableReferenceNode;
  condition?: ExpressionNode;
}

/**
 * WHERE Clause AST Node
 */
export interface WhereClauseNode extends AstNode {
  nodeType: 'where_clause';
  condition: ExpressionNode;
}

/**
 * Expression AST Node
 */
export interface ExpressionNode extends AstNode {
  nodeType: 'expression';
  expressionType: 'binary' | 'unary' | 'function' | 'literal' | 'column' | 'subquery' | 'case' | 'exists';
  operator?: string;
  leftOperand?: ExpressionNode;
  rightOperand?: ExpressionNode;
  functionName?: string;
  arguments?: ExpressionNode[];
  subquery?: SelectStatementNode;
  literal?: string | number | boolean;
  columnRef?: ColumnReferenceNode;
}

/**
 * EXISTS Expression AST Node
 */
export interface ExistsExpressionNode extends ExpressionNode {
  expressionType: 'exists';
  isNegated: boolean;
  subquery: SelectStatementNode;
}

/**
 * GROUP BY Clause AST Node
 */
export interface GroupByClauseNode extends AstNode {
  nodeType: 'group_by_clause';
  columns: ColumnReferenceNode[];
}

/**
 * HAVING Clause AST Node
 */
export interface HavingClauseNode extends AstNode {
  nodeType: 'having_clause';
  condition: ExpressionNode;
}

/**
 * ORDER BY Clause AST Node
 */
export interface OrderByClauseNode extends AstNode {
  nodeType: 'order_by_clause';
  columns: OrderByColumnNode[];
}

/**
 * ORDER BY Column AST Node
 */
export interface OrderByColumnNode extends AstNode {
  nodeType: 'order_by_column';
  column: ColumnReferenceNode;
  direction: 'ASC' | 'DESC';
}

/**
 * CTE Clause AST Node
 */
export interface CteClauseNode extends AstNode {
  nodeType: 'cte_clause';
  ctes: CteDefinitionNode[];
}

/**
 * CTE Definition AST Node
 */
export interface CteDefinitionNode extends AstNode {
  nodeType: 'cte_definition';
  name: string;
  columns?: string[];
  query: SelectStatementNode;
}

/**
 * INSERT Statement AST Node
 */
export interface InsertStatementNode extends SqlStatementNode {
  statementType: 'insert';
  targetTable: TableReferenceNode;
  columns?: string[];
  valuesClause?: ValuesClauseNode;
  selectClause?: SelectStatementNode;
}

/**
 * VALUES Clause AST Node
 */
export interface ValuesClauseNode extends AstNode {
  nodeType: 'values_clause';
  valueRows: ExpressionNode[][];
}

/**
 * UPDATE Statement AST Node
 */
export interface UpdateStatementNode extends SqlStatementNode {
  statementType: 'update';
  targetTable: TableReferenceNode;
  setClause: SetClauseNode;
  fromClause?: FromClauseNode;
  whereClause?: WhereClauseNode;
}

/**
 * SET Clause AST Node
 */
export interface SetClauseNode extends AstNode {
  nodeType: 'set_clause';
  assignments: AssignmentNode[];
}

/**
 * Assignment AST Node
 */
export interface AssignmentNode extends AstNode {
  nodeType: 'assignment';
  column: ColumnReferenceNode;
  value: ExpressionNode;
}

/**
 * IF Statement AST Node
 */
export interface IfStatementNode extends SqlStatementNode {
  statementType: 'if';
  condition: ExpressionNode;
  thenStatements: SqlStatementNode[];
  elseStatements?: SqlStatementNode[];
}

/**
 * WHILE Statement AST Node
 */
export interface WhileStatementNode extends SqlStatementNode {
  statementType: 'while';
  condition: ExpressionNode;
  bodyStatements: SqlStatementNode[];
}

/**
 * BEGIN/END Block AST Node
 */
export interface BlockStatementNode extends SqlStatementNode {
  statementType: 'begin' | 'end';
  statements: SqlStatementNode[];
}

/**
 * DECLARE Statement AST Node
 */
export interface DeclareStatementNode extends SqlStatementNode {
  statementType: 'declare';
  variables: VariableDeclarationNode[];
}

/**
 * Variable Declaration AST Node
 */
export interface VariableDeclarationNode extends AstNode {
  nodeType: 'variable_declaration';
  name: string;
  dataType: string;
  defaultValue?: ExpressionNode;
}

/**
 * MERGE Statement AST Node
 */
export interface MergeStatementNode extends SqlStatementNode {
  statementType: 'merge';
  targetTable: TableReferenceNode;
  sourceTable: TableReferenceNode;
  mergeCondition: ExpressionNode;
  whenClauses: WhenClauseNode[];
}

/**
 * WHEN Clause AST Node (for MERGE)
 */
export interface WhenClauseNode extends AstNode {
  nodeType: 'when_clause';
  whenType: 'MATCHED' | 'NOT_MATCHED';
  condition?: ExpressionNode;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  actionDetails?: InsertStatementNode | UpdateStatementNode;
} 