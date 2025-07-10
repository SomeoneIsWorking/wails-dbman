import { SqlLexer } from '../lexer/SqlLexer';
import { AstBuilder } from '../ast/AstBuilder';
import type { 
  ProcedureAnalysisResult, 
  ConditionalBlock, 
  SqlParseResult 
} from '../types/parser';
import type { 
  SqlStatementNode, 
  SelectStatementNode, 
  AstNode
} from '../types/ast';
import { StatementContext } from '../types/ast';
import { TokenType } from '../types/tokens';
import { sqlParserLogger } from '../../logger';

/**
 * Legacy type exports for backward compatibility
 */
export interface SqlStatement {
  statementType: string;
  content: string;
  level: number;
}

export interface SelectStatement extends SqlStatement {
  statementType: 'select';
}

/**
 * SQL Analyzer that uses SqlLexer and AstBuilder
 */
export class SqlAnalyzer {
  /**
   * Parse SQL statements from text
   */
  public parseStatements(sql: string): SqlParseResult {
    const logger = sqlParserLogger;
    logger.debug('Parsing SQL statements', { sqlLength: sql.length });
    
    try {
      const lexer = new SqlLexer(sql);
      const tokens = lexer.tokenize();
      logger.debug('Tokenization completed', { tokenCount: tokens.length });
      
      const astBuilder = new AstBuilder(tokens);
      const astNodes = astBuilder.buildAst();
      logger.debug('AST building completed', { nodeCount: astNodes.length });
      
      const statements = this.extractStatementsFromNodes(astNodes);
      const resultProducingStatements = statements.filter(
        (stmt): stmt is SelectStatementNode => stmt.statementType === 'select' && stmt.isResultProducing
      );
      
      logger.info('SQL parsing completed successfully', { 
        totalStatements: statements.length,
        resultProducingStatements: resultProducingStatements.length
      });
      
      return {
        statements,
        resultProducingStatements,
        errors: [],
        warnings: [],
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('SQL parsing failed', { error: errorMessage });
      
      return {
        statements: [],
        resultProducingStatements: [],
        errors: [{
          message: errorMessage,
          position: 0,
          line: 1,
          column: 1,
          severity: 'error'
        }],
        warnings: [],
        success: false
      };
    }
  }

  /**
   * Analyze a stored procedure
   */
  public analyzeProcedure(procedureDefinition: string): ProcedureAnalysisResult {
    const logger = sqlParserLogger;
    logger.debug('Analyzing stored procedure', { definitionLength: procedureDefinition.length });
    
    try {
      const parseResult = this.parseStatements(procedureDefinition);
      
      // Filter to only result-producing SELECT statements
      const resultProducingSelects = parseResult.statements.filter(stmt => 
        stmt.statementType === 'select' && stmt.isResultProducing
      ) as SelectStatementNode[];
      
      const conditionalBlocks = this.extractConditionalBlocks(parseResult.statements);
      
      logger.info('Procedure analysis completed', {
        totalStatements: parseResult.statements.length,
        selectStatements: resultProducingSelects.length,
        conditionalBlocks: conditionalBlocks.length,
        success: parseResult.success
      });
      
      return {
        statements: parseResult.statements,
        selectStatements: resultProducingSelects,
        conditionalBlocks,
        warnings: parseResult.warnings,
        success: parseResult.success
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Procedure analysis failed', { error: errorMessage });
      
      return {
        statements: [],
        selectStatements: [],
        conditionalBlocks: [],
        warnings: [errorMessage],
        success: false
      };
    }
  }

  /**
   * Extract SQL statements from AST nodes
   */
  private extractStatementsFromNodes(astNodes: AstNode[]): SqlStatementNode[] {
    const logger = sqlParserLogger;
    logger.debug('Extracting statements from AST nodes', { nodeCount: astNodes.length });
    
    const statements: SqlStatementNode[] = [];
    
    for (let i = 0; i < astNodes.length; i++) {
      const node = astNodes[i];
      logger.debug(`Processing AST node ${i + 1}/${astNodes.length}`, { nodeType: node.nodeType });
      
      this.traverseAst(node, (node) => {
        const sqlStatement = this.convertToSqlStatement(node);
        if (sqlStatement) {
          statements.push(sqlStatement);
        }
      });
      
      logger.debug(`Completed processing AST node ${i + 1}/${astNodes.length}`);
    }
    
    logger.debug('Completed extracting statements', { statementCount: statements.length });
    return statements;
  }

  /**
   * Extract conditional blocks from statements
   */
  private extractConditionalBlocks(statements: SqlStatementNode[]): ConditionalBlock[] {
    const blocks: ConditionalBlock[] = [];
    
    for (const stmt of statements) {
      if (stmt.statementType === 'if') {
        blocks.push({
          type: 'if',
          condition: this.extractConditionText(stmt),
          statements: this.extractNestedStatements(stmt),
          elseStatements: this.extractElseStatements(stmt),
          level: stmt.level
        });
      } else if (stmt.statementType === 'while') {
        blocks.push({
          type: 'while',
          condition: this.extractConditionText(stmt),
          statements: this.extractNestedStatements(stmt),
          level: stmt.level
        });
      }
    }
    
    return blocks;
  }

  /**
   * Traverse AST and call callback for each node
   */
  private traverseAst(node: AstNode, callback: (node: AstNode) => void, depth: number = 0): void {
    const logger = sqlParserLogger;
    
    // Prevent infinite recursion
    if (depth > 100) {
      logger.error('Maximum traversal depth exceeded', { nodeType: node.nodeType, depth });
      return;
    }
    
    logger.debug(`Traversing AST node at depth ${depth}`, { nodeType: node.nodeType });
    
    callback(node);
    
    if (node.children) {
      logger.debug(`Processing ${node.children.length} children at depth ${depth}`);
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        logger.debug(`Processing child ${i + 1}/${node.children.length} at depth ${depth}`, { childType: child.nodeType });
        this.traverseAst(child, callback, depth + 1);
      }
    }
    
    logger.debug(`Completed traversing AST node at depth ${depth}`, { nodeType: node.nodeType });
  }

  /**
   * Convert AstNode to SqlStatementNode if it represents a statement
   */
  private convertToSqlStatement(node: AstNode): SqlStatementNode | null {
    if (node.nodeType === 'statement') {
      // This is already a SqlStatementNode from the AST builder
      const stmt = node as SqlStatementNode;
      
      // For SELECT statements, determine if they're result-producing based on context
      if (stmt.statementType === 'select') {
        const selectContext = this.determineSelectContext(node);
        return {
          ...stmt,
          context: selectContext.context,
          isResultProducing: selectContext.isResultProducing,
          isSubquery: selectContext.context !== StatementContext.STANDALONE
        };
      }
      
      return stmt;
    }
    
    // Convert other node types to SqlStatementNode
    let statementType: SqlStatementNode['statementType'] = 'unknown';
    let isResultProducing = false;
    let context = StatementContext.STANDALONE;
    
    switch (node.nodeType) {
      case 'insert_statement':
        statementType = 'insert';
        break;
      case 'update_statement':
        statementType = 'update';
        break;
      case 'delete_statement':
        statementType = 'delete';
        break;
      case 'merge_statement':
        statementType = 'merge';
        break;
      case 'if_statement':
        statementType = 'if';
        break;
      case 'while_statement':
        statementType = 'while';
        break;
      case 'declare_statement':
        statementType = 'declare';
        break;
      case 'block_statement':
        statementType = 'begin';
        break;
      case 'create_statement':
        statementType = 'create';
        break;
      case 'procedure':
        statementType = 'create_procedure';
        break;
      case 'set_statement':
        statementType = 'set';
        break;
      case 'exec_statement':
        statementType = 'exec';
        break;
      default:
        return null;
    }
    
    return {
      nodeType: 'statement',
      statementType,
      context,
      content: this.extractContentFromNode(node),
      level: 0,
      isResultProducing,
      isSubquery: context !== StatementContext.STANDALONE,
      parent: node.parent,
      children: node.children
    };
  }

  /**
   * Determine the context and result-producing nature of a SELECT statement
   */
  private determineSelectContext(node: AstNode): { context: StatementContext, isResultProducing: boolean } {
    const logger = sqlParserLogger;
    logger.debug('Determining SELECT context', { nodeType: node.nodeType });
    
    // First check if this is a variable assignment SELECT
    if (this.isVariableAssignmentSelect(node)) {
      logger.debug('Determined SELECT as variable assignment (non-result-producing)');
      return { context: StatementContext.STANDALONE, isResultProducing: false };
    }
    
    // Check parent nodes to understand context
    let parent = node.parent;
    let depth = 0;
    
    while (parent) {
      depth++;
      logger.debug(`Checking parent at depth ${depth}`, { parentType: parent.nodeType });
      
      // Prevent infinite loops
      if (depth > 50) {
        logger.error('Maximum parent traversal depth exceeded in determineSelectContext');
        return { context: StatementContext.STANDALONE, isResultProducing: true };
      }
      
      switch (parent.nodeType) {
        case 'condition':
          // SELECT inside EXISTS, IN, or other conditions
          logger.debug('Found SELECT in condition context');
          return { context: StatementContext.EXISTS_CLAUSE, isResultProducing: false };
        
        case 'insert_statement':
          // INSERT ... SELECT
          logger.debug('Found SELECT in INSERT context');
          return { context: StatementContext.INSERT_SELECT, isResultProducing: false };
        
        case 'merge_statement':
          // SELECT in MERGE USING clause
          logger.debug('Found SELECT in MERGE context');
          return { context: StatementContext.MERGE_SOURCE, isResultProducing: false };
        
        case 'expression':
          // SELECT in expression context (subquery)
          logger.debug('Found SELECT in expression context');
          return { context: StatementContext.SUBQUERY, isResultProducing: false };
        
        case 'update_statement':
          // SELECT in UPDATE SET clause
          logger.debug('Found SELECT in UPDATE context');
          return { context: StatementContext.UPDATE_SET, isResultProducing: false };
        
        case 'if_statement':
        case 'while_statement':
        case 'block_statement':
        case 'procedure':
          // Continue checking parent
          logger.debug(`Continuing through ${parent.nodeType} parent`);
          parent = parent.parent;
          break;
        
        default:
          logger.debug(`Continuing through ${parent.nodeType} parent (default case)`);
          parent = parent.parent;
          break;
      }
    }
    
    // If we reach here, it's likely a standalone SELECT that returns results
    logger.debug('Determined SELECT as standalone result-producing');
    return { context: StatementContext.STANDALONE, isResultProducing: true };
  }

  /**
   * Extract content string from AST node
   */
  private extractContentFromNode(node: AstNode): string {
    // This is a simplified implementation
    // In a real implementation, you'd reconstruct the SQL from the AST
    return node.metadata?.content || node.nodeType;
  }

  /**
   * Extract condition text from statement
   */
  private extractConditionText(stmt: SqlStatementNode): string {
    // This is a simplified implementation
    // In a full implementation, you'd traverse the condition AST
    return stmt.content.split(/\s+/).slice(1, 5).join(' ');
  }

  /**
   * Extract nested statements from a statement
   */
  private extractNestedStatements(stmt: SqlStatementNode): SqlStatementNode[] {
    const logger = sqlParserLogger;
    logger.debug('Extracting nested statements', { statementType: stmt.statementType });
    
    const nested: SqlStatementNode[] = [];
    
    this.traverseAst(stmt, (node) => {
      const sqlStatement = this.convertToSqlStatement(node);
      if (sqlStatement && sqlStatement !== stmt) {
        nested.push(sqlStatement);
      }
    });
    
    logger.debug('Completed extracting nested statements', { nestedCount: nested.length });
    return nested;
  }

  /**
   * Extract else statements from if statement
   */
  private extractElseStatements(stmt: SqlStatementNode): SqlStatementNode[] | undefined {
    // This would need to be implemented based on the AST structure
    // For now, return undefined
    return undefined;
  }

  /**
   * Check if a SELECT statement is a variable assignment SELECT (non-result-producing)
   */
  private isVariableAssignmentSelect(node: AstNode): boolean {
    // Look for SELECT clause in the node's children
    const selectClause = node.children?.find(child => child.nodeType === 'select_clause');
    if (!selectClause || !selectClause.children) {
      return false;
    }
    
    // Check if all or most columns are variable assignments
    const columns = selectClause.children;
    let variableAssignmentCount = 0;
    
    for (const column of columns) {
      if (column.metadata?.isVariableAssignment) {
        variableAssignmentCount++;
      }
    }
    
    // If all columns are variable assignments, this is not result-producing
    // If majority are variable assignments, it's likely not result-producing
    return variableAssignmentCount > 0 && variableAssignmentCount === columns.length;
  }
}

/**
 * TSqlAnalyzer alias for backward compatibility
 */
export class TSqlAnalyzer extends SqlAnalyzer {
  // Same implementation as SqlAnalyzer
} 