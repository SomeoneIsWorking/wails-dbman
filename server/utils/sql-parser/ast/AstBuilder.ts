import type { SqlToken } from '../types/tokens';
import { TokenType } from '../types/tokens';
import type {
  AstNode,
  SqlStatementNode
} from '../types/ast';
import { StatementContext } from '../types/ast';
import { sqlParserLogger } from '../../logger';

/**
 * Proper AST Builder that builds a tree structure representing SQL
 */
export class AstBuilder {
  private tokens: SqlToken[];
  private position: number = 0;

  constructor(tokens: SqlToken[]) {
    this.tokens = tokens;
  }

  /**
   * Build the complete AST tree
   */
  public buildAst(): AstNode[] {
    const logger = sqlParserLogger;
    logger.debug('Starting AST building', { totalTokens: this.tokens.length });
    
    // Build all statements at root level
    const statements: AstNode[] = [];
    let statementCount = 0;
    const maxIterations = this.tokens.length * 2; // Safety limit
    let iterations = 0;
    
    while (!this.isAtEnd()) {
      iterations++;
      
      // Safety check for infinite loops
      if (iterations > maxIterations) {
        logger.error('Maximum iterations exceeded in buildAst()', {
          iterations,
          maxIterations,
          position: this.position,
          totalTokens: this.tokens.length
        });
        break;
      }
      
      this.skipWhitespace();
      
      if (this.isAtEnd()) break;
      
      statementCount++;
      logger.debug(`Building statement ${statementCount} (iteration ${iterations})`, { 
        position: this.position, 
        currentToken: this.currentToken()?.type 
      });
      
      const stmt = this.buildStatement();
      if (stmt) {
        statements.push(stmt);
        logger.debug(`Completed statement ${statementCount}`, { nodeType: stmt.nodeType });
      } else {
        logger.warn(`Failed to build statement ${statementCount}`);
        // If we can't build a statement, advance to avoid infinite loop
        this.advance();
      }
    }
    
    logger.debug('Completed AST building', { statementCount: statements.length });
    return statements;
  }

  /**
   * Build root node for SQL statements
   */
  private buildStatementsRoot(): AstNode {
    const statements: AstNode[] = [];
    
    const rootNode = {
      nodeType: 'root',
      parent: undefined,
      children: statements
    };
    
    while (!this.isAtEnd()) {
      this.skipWhitespace();
      
      if (this.isAtEnd()) break;
      
      const stmt = this.buildStatement();
      if (stmt) {
        stmt.parent = rootNode;
        statements.push(stmt);
      }
    }
    
    return rootNode;
  }

  /**
   * Build the root procedure node
   */
  private buildProcedureNode(): AstNode {
    // Skip CREATE PROCEDURE tokens
    this.skipToToken(TokenType.IDENTIFIER); // procedure name
    
    // Build parameter list
    const parameters = this.buildParameterList();
    
    // Skip AS keyword
    this.skipToToken(TokenType.AS);
    this.advance();
    
    // Build procedure body
    const body = this.buildBlockStatement();
    
    return {
      nodeType: 'procedure',
      parent: undefined,
      children: [parameters, body]
    };
  }

  /**
   * Build parameter list node
   */
  private buildParameterList(): AstNode {
    const parameters: AstNode[] = [];
    
    if (this.currentTokenIs(TokenType.LEFT_PAREN)) {
      this.advance(); // consume (
      
      while (!this.currentTokenIs(TokenType.RIGHT_PAREN) && !this.isAtEnd()) {
        const param = this.buildParameterNode();
        parameters.push(param);
        
        if (this.currentTokenIs(TokenType.COMMA)) {
          this.advance();
        }
      }
      
      if (this.currentTokenIs(TokenType.RIGHT_PAREN)) {
        this.advance(); // consume )
      }
    }
    
    return {
      nodeType: 'parameter_list',
      parent: undefined,
      children: parameters
    };
  }

  /**
   * Build individual parameter node
   */
  private buildParameterNode(): AstNode {
    let name = '';
    let dataType = '';
    
    // Parameter name (starts with @)
    if (this.currentTokenIs(TokenType.PARAMETER)) {
      name = this.currentToken().value;
      this.advance();
    }
    
    // Data type
    if (this.currentTokenIs(TokenType.IDENTIFIER)) {
      dataType = this.currentToken().value;
      this.advance();
      
      // Handle data type parameters like CHAR(1), BIGINT, etc.
      if (this.currentTokenIs(TokenType.LEFT_PAREN)) {
        this.advance(); // consume (
        while (!this.currentTokenIs(TokenType.RIGHT_PAREN) && !this.isAtEnd()) {
          dataType += this.currentToken().value;
          this.advance();
        }
        if (this.currentTokenIs(TokenType.RIGHT_PAREN)) {
          dataType += ')';
          this.advance();
        }
      }
    }
    
    return {
      nodeType: 'parameter',
      parent: undefined,
      children: [],
      metadata: { name, dataType }
    };
  }

  /**
   * Build block statement (BEGIN...END)
   */
  private buildBlockStatement(): AstNode {
    const statements: AstNode[] = [];
    
    if (this.currentTokenIs(TokenType.BEGIN)) {
      this.advance(); // consume BEGIN
    }
    
    while (!this.currentTokenIs(TokenType.END) && !this.isAtEnd()) {
      const stmt = this.buildStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }
    
    if (this.currentTokenIs(TokenType.END)) {
      this.advance(); // consume END
    }
    
    return {
      nodeType: 'block_statement',
      parent: undefined,
      children: statements
    };
  }

  /**
   * Build individual statement based on type
   */
  private buildStatement(): AstNode | null {
    const logger = sqlParserLogger;
    this.skipWhitespace();
    
    if (this.isAtEnd()) return null;
    
    const token = this.currentToken();
    logger.debug('Building statement for token', { tokenType: token.type, tokenValue: token.value });
    
    switch (token.type) {
      case TokenType.DECLARE:
        return this.buildDeclareStatement();
      case TokenType.IF:
        return this.buildIfStatement();
      case TokenType.SELECT:
        return this.buildSelectStatement();
      case TokenType.INSERT:
        return this.buildInsertStatement();
      case TokenType.MERGE:
        return this.buildMergeStatement();
      case TokenType.BEGIN:
        return this.buildBlockStatement();
      case TokenType.SET:
        return this.buildSetStatement();
      case TokenType.UPDATE:
        return this.buildUpdateStatement();
      case TokenType.EXEC:
      case TokenType.EXECUTE:
        return this.buildExecStatement();
      case TokenType.SEMICOLON:
        // Skip semicolons
        this.advance();
        return null;
      case TokenType.COMMENT:
        // Skip comments
        this.advance();
        return null;
      case TokenType.IDENTIFIER:
        // Handle CREATE PROCEDURE and other identifier-based statements
        if (token.value.toUpperCase() === 'CREATE') {
          return this.buildCreateStatement();
        }
        // Skip unknown identifiers
        this.advance();
        return null;
      default:
        // Skip unknown tokens but continue trying to parse
        this.advance();
        return null;
    }
  }

  /**
   * Build DECLARE statement
   */
  private buildDeclareStatement(): AstNode {
    const logger = sqlParserLogger;
    logger.debug('Building DECLARE statement');
    
    this.advance(); // consume DECLARE
    
    const variables: AstNode[] = [];
    let iterations = 0;
    const maxIterations = 100;
    
    while (!this.isStatementEnd() && !this.isAtEnd()) {
      iterations++;
      
      if (iterations > maxIterations) {
        logger.error('Maximum iterations exceeded in buildDeclareStatement', {
          iterations,
          position: this.position,
          currentToken: this.currentToken()?.type
        });
        break;
      }
      
      logger.debug(`Building variable declaration ${iterations}`, {
        position: this.position,
        currentToken: this.currentToken()?.type,
        currentValue: this.currentToken()?.value
      });
      
      const variable = this.buildVariableDeclaration();
      if (variable) {
        variables.push(variable);
        logger.debug(`Added variable ${variables.length}`, { variableName: variable.metadata?.name });
      } else {
        logger.warn('Failed to build variable declaration, advancing');
        this.advance(); // Prevent infinite loop
      }
    }
    
    logger.debug('Completed DECLARE statement', { variableCount: variables.length });
    
    return {
      nodeType: 'declare_statement',
      parent: undefined,
      children: variables
    };
  }

  /**
   * Build variable declaration
   */
  private buildVariableDeclaration(): AstNode | null {
    const logger = sqlParserLogger;
    
    if (!this.currentTokenIs(TokenType.PARAMETER)) {
      logger.debug('Not a parameter token, skipping variable declaration', {
        currentToken: this.currentToken()?.type,
        currentValue: this.currentToken()?.value
      });
      return null;
    }
    
    const name = this.currentToken().value;
    logger.debug('Building variable declaration', { name });
    this.advance();
    
    let type = '';
    if (this.currentTokenIs(TokenType.IDENTIFIER)) {
      type = this.currentToken().value;
      logger.debug('Found variable type', { type });
      this.advance();
      
      // Handle data type parameters like BIGINT, VARCHAR(12), etc.
      if (this.currentTokenIs(TokenType.LEFT_PAREN)) {
        type += '(';
        this.advance(); // consume (
        while (!this.currentTokenIs(TokenType.RIGHT_PAREN) && !this.isAtEnd()) {
          type += this.currentToken().value;
          this.advance();
        }
        if (this.currentTokenIs(TokenType.RIGHT_PAREN)) {
          type += ')';
          this.advance(); // consume )
        }
      }
    }
    
    // Skip default value if present (= NULL, = 0, etc.)
    if (this.currentTokenIs(TokenType.EQUALS)) {
      this.advance(); // consume =
      // Skip the default value
      while (!this.currentTokenIs(TokenType.COMMA) && !this.isStatementEnd() && !this.isAtEnd()) {
        this.advance();
      }
    }
    
    // Skip comma if present
    if (this.currentTokenIs(TokenType.COMMA)) {
      this.advance();
    }
    
    // Handle TABLE type
    if (type.toUpperCase() === 'TABLE') {
      const tableDefinition = this.buildTableDefinition();
      return {
        nodeType: 'variable_declaration',
        parent: undefined,
        children: [tableDefinition],
        metadata: { name, type }
      };
    }
    
    logger.debug('Completed variable declaration', { name, type });
    
    return {
      nodeType: 'variable_declaration',
      parent: undefined,
      children: [],
      metadata: { name, type }
    };
  }

  /**
   * Build table definition for table variables
   */
  private buildTableDefinition(): AstNode {
    const columns: AstNode[] = [];
    
    if (this.currentTokenIs(TokenType.LEFT_PAREN)) {
      this.advance(); // consume (
      
      while (!this.currentTokenIs(TokenType.RIGHT_PAREN) && !this.isAtEnd()) {
        const column = this.buildColumnDefinition();
        if (column) {
          columns.push(column);
        }
        
        if (this.currentTokenIs(TokenType.COMMA)) {
          this.advance();
        }
      }
      
      if (this.currentTokenIs(TokenType.RIGHT_PAREN)) {
        this.advance(); // consume )
      }
    }
    
    return {
      nodeType: 'table_definition',
      parent: undefined,
      children: columns
    };
  }

  /**
   * Build column definition
   */
  private buildColumnDefinition(): AstNode | null {
    if (!this.currentTokenIs(TokenType.IDENTIFIER) && !this.currentTokenIs(TokenType.BRACKETED_IDENTIFIER)) {
      return null;
    }
    
    const name = this.currentToken().value;
    this.advance();
    
    let dataType = '';
    if (this.currentTokenIs(TokenType.IDENTIFIER)) {
      dataType = this.currentToken().value;
      this.advance();
    }
    
    return {
      nodeType: 'column_definition',
      parent: undefined,
      children: [],
      metadata: { name, dataType }
    };
  }

  /**
   * Build IF statement with proper condition parsing
   */
  private buildIfStatement(): AstNode {
    this.advance(); // consume IF
    
    const ifNode = {
      nodeType: 'if_statement',
      parent: undefined,
      children: [] as AstNode[]
    };
    
    // Build condition - this is where we need to handle EXISTS properly
    const condition = this.buildCondition();
    condition.parent = ifNode;
    
    // Build then block
    const thenBlock = this.buildStatement();
    if (thenBlock) {
      thenBlock.parent = ifNode;
    }
    
    // Check for ELSE
    let elseBlock: AstNode | null = null;
    if (this.currentTokenIs(TokenType.ELSE)) {
      this.advance(); // consume ELSE
      elseBlock = this.buildStatement();
      if (elseBlock) {
        elseBlock.parent = ifNode;
      }
    }
    
    const children = [condition];
    if (thenBlock) children.push(thenBlock);
    if (elseBlock) children.push(elseBlock);
    ifNode.children = children;
    
    return ifNode;
  }

  /**
   * Build condition expression with proper EXISTS handling
   */
  private buildCondition(): AstNode {
    const children: AstNode[] = [];
    
    const conditionNode = {
      nodeType: 'condition',
      parent: undefined,
      children
    };
    
    // Look for EXISTS keyword
    if (this.currentTokenIs(TokenType.EXISTS)) {
      this.advance(); // consume EXISTS
      
      if (this.currentTokenIs(TokenType.LEFT_PAREN)) {
        this.advance(); // consume (
        
        // Build the SELECT statement inside EXISTS
        if (this.currentTokenIs(TokenType.SELECT)) {
          const selectStmt = this.buildSelectStatement();
          selectStmt.parent = conditionNode;
          children.push(selectStmt);
        }
        
        if (this.currentTokenIs(TokenType.RIGHT_PAREN)) {
          this.advance(); // consume )
        }
      }
    } else {
      // Skip other condition tokens until we hit a statement keyword
      while (!this.isStatementEnd() && !this.isAtEnd()) {
        if (this.currentTokenIs(TokenType.BEGIN) || 
            this.currentTokenIs(TokenType.INSERT) ||
            this.currentTokenIs(TokenType.SELECT)) {
          break;
        }
        this.advance();
      }
    }
    
    return conditionNode;
  }

  /**
   * Build SELECT statement
   */
  private buildSelectStatement(): SqlStatementNode {
    const startPos = this.position;
    this.advance(); // consume SELECT
    
    // Build SELECT clause (column list)
    const selectClause = this.buildSelectClause();
    
    // Build FROM clause if present
    let fromClause: AstNode | null = null;
    if (this.currentTokenIs(TokenType.FROM)) {
      fromClause = this.buildFromClause();
    }
    
    // Build WHERE clause if present
    let whereClause: AstNode | null = null;
    if (this.currentTokenIs(TokenType.WHERE)) {
      whereClause = this.buildWhereClause();
    }
    
    // Build ORDER BY clause if present
    let orderByClause: AstNode | null = null;
    if (this.currentTokenIs(TokenType.ORDER)) {
      orderByClause = this.buildOrderByClause();
    }
    
    // Build content string
    const endPos = this.position;
    const content = this.tokens.slice(startPos, endPos).map(t => t.value).join(' ');
    
    const children: AstNode[] = [selectClause];
    if (fromClause) children.push(fromClause);
    if (whereClause) children.push(whereClause);
    if (orderByClause) children.push(orderByClause);
    
    return {
      nodeType: 'statement',
      statementType: 'select',
      context: StatementContext.STANDALONE,
      content,
      level: 0,
      isResultProducing: true,
      isSubquery: false,
      parent: undefined,
      children
    };
  }

  /**
   * Build SELECT clause with detailed column information
   */
  private buildSelectClause(): AstNode {
    const columns: AstNode[] = [];
    let isDistinct = false;
    let isWildcard = false;
    
    // Check for DISTINCT
    if (this.currentTokenIs(TokenType.DISTINCT)) {
      isDistinct = true;
      this.advance();
    }
    
    // Parse column expressions
    while (!this.currentTokenIs(TokenType.FROM) && !this.isStatementEnd() && !this.isAtEnd()) {
      const column = this.buildColumnReference();
      if (column) {
        columns.push(column);
      }
      
      if (this.currentTokenIs(TokenType.COMMA)) {
        this.advance(); // consume comma
      } else if (!this.currentTokenIs(TokenType.FROM) && !this.isStatementEnd()) {
        // Continue parsing if not at FROM or statement end
        this.advance();
      } else {
        break;
      }
    }
    
    // Check if we have a wildcard
    if (columns.some(col => col.metadata?.isWildcard)) {
      isWildcard = true;
    }
    
    return {
      nodeType: 'select_clause',
      parent: undefined,
      children: columns,
      metadata: { isDistinct, isWildcard }
    };
  }

  /**
   * Build column reference with expression parsing
   */
  private buildColumnReference(): AstNode | null {
    if (this.isAtEnd()) return null;
    
    let columnName = '';
    let tableName = '';
    let schemaName = '';
    let alias = '';
    let isWildcard = false;
    let isFunction = false;
    let functionName = '';
    let expression = '';
    let isVariableAssignment = false;
    
    const startPos = this.position;
    
    // Handle wildcard
    if (this.currentTokenIs(TokenType.MULTIPLY)) {
      isWildcard = true;
      columnName = '*';
      this.advance();
    } else {
      // Parse column expression until comma or FROM
      let parenDepth = 0;
      const expressionTokens: SqlToken[] = [];
      
      while (!this.isAtEnd() && 
             !(this.currentTokenIs(TokenType.COMMA) && parenDepth === 0) && 
             !(this.currentTokenIs(TokenType.FROM) && parenDepth === 0)) {
        
        const token = this.currentToken();
        expressionTokens.push(token);
        
        if (token.type === TokenType.LEFT_PAREN) {
          parenDepth++;
        } else if (token.type === TokenType.RIGHT_PAREN) {
          parenDepth--;
        }
        
        this.advance();
      }
      
      // Build expression string
      expression = expressionTokens.map(t => t.value).join(' ');
      
      // Parse the expression to extract column info
      const columnInfo = this.parseColumnExpression(expressionTokens);
      columnName = columnInfo.columnName;
      tableName = columnInfo.tableName;
      schemaName = columnInfo.schemaName;
      alias = columnInfo.alias;
      isFunction = columnInfo.isFunction;
      functionName = columnInfo.functionName;
      
      // Update the metadata with the parsed information
      isVariableAssignment = columnInfo.isVariableAssignment || false;
    }
    
    return {
      nodeType: 'column_reference',
      parent: undefined,
      children: [],
      metadata: {
        columnName,
        tableName,
        schemaName,
        alias,
        expression,
        isWildcard,
        isFunction,
        functionName,
        isVariableAssignment: isVariableAssignment || false
      }
    };
  }

    /**
   * Parse column expression to extract column information
   */
  private parseColumnExpression(tokens: SqlToken[]): any {
    let columnName = '';
    let tableName = '';
    let schemaName = '';
    let alias = '';
    let isFunction = false;
    let functionName = '';
    let isVariableAssignment = false;
    
    if (tokens.length === 0) {
      return { columnName: 'unknown', tableName, schemaName, alias, isFunction, functionName };
    }
    
    // Check if this is a variable assignment (starts with @parameter = ...)
    if (tokens.length >= 3 && 
        tokens[0].type === TokenType.PARAMETER && 
        tokens[1].type === TokenType.EQUALS) {
      isVariableAssignment = true;
      // For variable assignments, use the variable name as column name
      columnName = tokens[0].value;
      // The rest is the expression being assigned
      const assignmentTokens = tokens.slice(2);
      
      // Check if the assignment expression contains a function
      const funcMatch = assignmentTokens.find((t: SqlToken, index: number) => 
        t.type === TokenType.IDENTIFIER && 
        index < assignmentTokens.length - 1 && 
        assignmentTokens[index + 1]?.type === TokenType.LEFT_PAREN
      );
      
      if (funcMatch) {
        isFunction = true;
        functionName = funcMatch.value;
      }
      
      return { columnName, tableName, schemaName, alias, isFunction, functionName, isVariableAssignment };
    }
    
    // Check if this is a column alias assignment (columnName = expression)
    if (tokens.length >= 3 && 
        tokens[0].type === TokenType.IDENTIFIER && 
        tokens[1].type === TokenType.EQUALS) {
      // This is a column alias like "AmountCancelled = CASE..."
      columnName = tokens[0].value;
      alias = columnName; // The column name becomes the alias
      
      // The rest is the expression
      const expressionTokens = tokens.slice(2);
      
      // Check if the expression contains a function
      const funcMatch = expressionTokens.find((t: SqlToken, index: number) => 
        t.type === TokenType.IDENTIFIER && 
        index < expressionTokens.length - 1 && 
        expressionTokens[index + 1]?.type === TokenType.LEFT_PAREN
      );
      
      if (funcMatch) {
        isFunction = true;
        functionName = funcMatch.value;
      }
      
      return { columnName, tableName, schemaName, alias, isFunction, functionName, isVariableAssignment };
    }
    
    // Parse the expression to find where it ends and where the alias begins
    const { expressionTokens, aliasTokens } = this.splitExpressionAndAlias(tokens);
    
    // Extract alias from alias tokens
    if (aliasTokens.length > 0) {
      // Skip AS keyword if present
      const aliasStartIndex = aliasTokens[0].value.toUpperCase() === 'AS' ? 1 : 0;
      if (aliasStartIndex < aliasTokens.length) {
        alias = aliasTokens[aliasStartIndex].value.replace(/[\[\]]/g, '');
      }
    }
    
    // Look for function patterns in the expression tokens only
    const funcMatch = expressionTokens.find((t: SqlToken) => 
      t.type === TokenType.IDENTIFIER && 
      expressionTokens.indexOf(t) < expressionTokens.length - 1 && 
      expressionTokens[expressionTokens.indexOf(t) + 1]?.type === TokenType.LEFT_PAREN
    );
    
    if (funcMatch) {
      isFunction = true;
      functionName = funcMatch.value;
      columnName = alias || `${functionName}_result`;
    } else {
      // Look for table.column pattern in the expression tokens only
      const identifiers = expressionTokens.filter((t: SqlToken) => 
        t.type === TokenType.IDENTIFIER || t.type === TokenType.BRACKETED_IDENTIFIER
      );
      
      if (identifiers.length >= 2) {
        // Could be schema.table.column or table.column
        if (identifiers.length >= 3) {
          schemaName = identifiers[0].value.replace(/[\[\]]/g, '');
          tableName = identifiers[1].value.replace(/[\[\]]/g, '');
          columnName = identifiers[2].value.replace(/[\[\]]/g, '');
        } else {
          tableName = identifiers[0].value.replace(/[\[\]]/g, '');
          columnName = identifiers[1].value.replace(/[\[\]]/g, '');
        }
      } else if (identifiers.length === 1) {
        columnName = identifiers[0].value.replace(/[\[\]]/g, '');
      }
      
      // Use alias as the final column name if available
      if (alias) {
        columnName = alias;
      }
    }
    
    // Fallback if no column name found
    if (!columnName) {
      columnName = alias || 'unknown';
    }
    
    return { columnName, tableName, schemaName, alias, isFunction, functionName };
  }

  /**
   * Split tokens into expression part and alias part
   */
  private splitExpressionAndAlias(tokens: SqlToken[]): { expressionTokens: SqlToken[], aliasTokens: SqlToken[] } {
    // We need to find where the expression ends and the alias begins
    // This is tricky because we need to track parentheses and identify the end of the expression
    
    let parenDepth = 0;
    let expressionEndIndex = tokens.length;
    
    // Scan from the end to find potential alias
    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      
      if (token.type === TokenType.RIGHT_PAREN) {
        parenDepth++;
      } else if (token.type === TokenType.LEFT_PAREN) {
        parenDepth--;
      } else if (parenDepth === 0) {
        // We're at top level
        if (token.type === TokenType.IDENTIFIER || token.type === TokenType.BRACKETED_IDENTIFIER) {
          // This could be an alias, but we need to check if there's an expression before it
          
          // Look ahead to see if this looks like an alias
          const prevTokens = tokens.slice(0, i);
          if (prevTokens.length > 0) {
            const hasExpression = prevTokens.some(t => 
              t.type === TokenType.PLUS ||
              t.type === TokenType.MINUS ||
              t.type === TokenType.MULTIPLY ||
              t.type === TokenType.DIVIDE ||
              t.type === TokenType.LEFT_PAREN ||
              t.type === TokenType.DOT ||
              (t.type === TokenType.IDENTIFIER && prevTokens[prevTokens.indexOf(t) + 1]?.type === TokenType.LEFT_PAREN)
            );
            
            if (hasExpression) {
              // Check if previous token could mark end of expression
              const prevToken = i > 0 ? tokens[i - 1] : null;
              if (prevToken && (
                prevToken.type === TokenType.RIGHT_PAREN ||
                prevToken.type === TokenType.IDENTIFIER ||
                prevToken.type === TokenType.BRACKETED_IDENTIFIER ||
                prevToken.type === TokenType.NUMBER_LITERAL ||
                prevToken.type === TokenType.STRING_LITERAL
              )) {
                // Check if there's an AS keyword before this identifier
                const asIndex = i - 1;
                if (asIndex >= 0 && tokens[asIndex].value.toUpperCase() === 'AS') {
                  expressionEndIndex = asIndex;
                  break;
                } else {
                  // No AS keyword, but this still looks like an alias
                  expressionEndIndex = i;
                  break;
                }
              }
            }
          }
        } else if (token.value.toUpperCase() === 'AS') {
          // Found AS keyword at top level, expression ends here
          expressionEndIndex = i;
          break;
        }
      }
    }
    
    const expressionTokens = tokens.slice(0, expressionEndIndex);
    const aliasTokens = tokens.slice(expressionEndIndex);
    
    return { expressionTokens, aliasTokens };
  }

  /**
   * Build ORDER BY clause
   */
  private buildOrderByClause(): AstNode {
    this.advance(); // consume ORDER
    
    if (this.currentTokenIs(TokenType.BY)) {
      this.advance(); // consume BY
    }
    
    const columns: AstNode[] = [];
    
    while (!this.isStatementEnd() && !this.isAtEnd()) {
      const column = this.buildOrderByColumn();
      if (column) {
        columns.push(column);
      }
      
      if (this.currentTokenIs(TokenType.COMMA)) {
        this.advance();
      } else {
        break;
      }
    }
    
    return {
      nodeType: 'order_by_clause',
      parent: undefined,
      children: columns
    };
  }

  /**
   * Build ORDER BY column
   */
  private buildOrderByColumn(): AstNode | null {
    if (this.isAtEnd()) return null;
    
    let columnName = '';
    let direction = 'ASC';
    
    if (this.currentTokenIs(TokenType.IDENTIFIER) || this.currentTokenIs(TokenType.BRACKETED_IDENTIFIER)) {
      columnName = this.currentToken().value.replace(/[\[\]]/g, '');
      this.advance();
    }
    
    // Check for ASC/DESC
    if (this.currentTokenIs(TokenType.ASC)) {
      direction = 'ASC';
      this.advance();
    } else if (this.currentTokenIs(TokenType.DESC)) {
      direction = 'DESC';
      this.advance();
    }
    
    return {
      nodeType: 'order_by_column',
      parent: undefined,
      children: [],
      metadata: { columnName, direction }
    };
  }

  /**
   * Build FROM clause with better JOIN and table hint handling
   */
  private buildFromClause(): AstNode {
    this.advance(); // consume FROM
    
    const tables: AstNode[] = [];
    
    while (!this.currentTokenIs(TokenType.WHERE) && 
           !this.currentTokenIs(TokenType.ORDER) &&
           !this.currentTokenIs(TokenType.GROUP) &&
           !this.isStatementEnd() && 
           !this.isAtEnd()) {
      
      // Skip JOIN keywords - they're structural, not table references
      if (this.currentTokenIs(TokenType.INNER) || 
          this.currentTokenIs(TokenType.LEFT) || 
          this.currentTokenIs(TokenType.RIGHT) || 
          this.currentTokenIs(TokenType.FULL) || 
          this.currentTokenIs(TokenType.CROSS) || 
          this.currentTokenIs(TokenType.JOIN)) {
        this.advance();
        continue;
      }
      
      // Skip ON keyword and join conditions
      if (this.currentTokenIs(TokenType.ON)) {
        this.advance(); // consume ON
        // Skip join condition until we hit another table or clause
        while (!this.currentTokenIs(TokenType.INNER) && 
               !this.currentTokenIs(TokenType.LEFT) && 
               !this.currentTokenIs(TokenType.RIGHT) && 
               !this.currentTokenIs(TokenType.FULL) && 
               !this.currentTokenIs(TokenType.CROSS) && 
               !this.currentTokenIs(TokenType.JOIN) && 
               !this.currentTokenIs(TokenType.WHERE) && 
               !this.currentTokenIs(TokenType.ORDER) &&
               !this.currentTokenIs(TokenType.GROUP) &&
               !this.isStatementEnd() && 
               !this.isAtEnd()) {
          this.advance();
        }
        continue;
      }
      
      // Handle table references
      if (this.currentTokenIs(TokenType.IDENTIFIER) || this.currentTokenIs(TokenType.BRACKETED_IDENTIFIER)) {
        const table = this.buildTableReferenceWithAlias();
        if (table) {
          tables.push(table);
        }
      } else {
        this.advance();
      }
    }
    
    return {
      nodeType: 'from_clause',
      parent: undefined,
      children: tables
    };
  }

  /**
   * Build table reference with potential alias and table hints
   */
  private buildTableReferenceWithAlias(): AstNode | null {
    if (!this.currentTokenIs(TokenType.IDENTIFIER) && !this.currentTokenIs(TokenType.BRACKETED_IDENTIFIER)) {
      return null;
    }
    
    let tableName = this.currentToken().value.replace(/[\[\]]/g, '');
    this.advance();
    
    let alias = '';
    let hasTableHint = false;
    
    // Check for AS keyword
    if (this.currentTokenIs(TokenType.AS)) {
      this.advance(); // consume AS
      if (this.currentTokenIs(TokenType.IDENTIFIER)) {
        alias = this.currentToken().value;
        this.advance();
      }
    } else if (this.currentTokenIs(TokenType.IDENTIFIER)) {
      // Check if the next identifier could be an alias (not a keyword)
      const nextToken = this.currentToken();
      const keywords = ['INNER', 'LEFT', 'RIGHT', 'FULL', 'JOIN', 'WHERE', 'ORDER', 'GROUP', 'WITH'];
      if (!keywords.includes(nextToken.value.toUpperCase())) {
        alias = nextToken.value;
        this.advance();
      }
    }
    
    // Handle table hints like "With (NoLock)"
    if (this.currentTokenIs(TokenType.IDENTIFIER) && this.currentToken().value.toUpperCase() === 'WITH') {
      hasTableHint = true;
      this.advance(); // consume WITH
      
      if (this.currentTokenIs(TokenType.LEFT_PAREN)) {
        this.advance(); // consume (
        
        // Skip table hint content
        while (!this.currentTokenIs(TokenType.RIGHT_PAREN) && !this.isAtEnd()) {
          this.advance();
        }
        
        if (this.currentTokenIs(TokenType.RIGHT_PAREN)) {
          this.advance(); // consume )
        }
      }
    }
    
    return {
      nodeType: 'table_reference',
      parent: undefined,
      children: [],
      metadata: { 
        name: tableName, 
        alias: alias || undefined,
        fullName: tableName, // Keep original table name for lookups
        hasTableHint
      }
    };
  }

  /**
   * Build WHERE clause
   */
  private buildWhereClause(): AstNode {
    this.advance(); // consume WHERE
    
    // Skip condition tokens for now
    while (!this.isStatementEnd() && !this.isAtEnd()) {
      this.advance();
    }
    
    return {
      nodeType: 'where_clause',
      parent: undefined,
      children: []
    };
  }

  /**
   * Build INSERT statement
   */
  private buildInsertStatement(): AstNode {
    this.advance(); // consume INSERT
    
    if (this.currentTokenIs(TokenType.INTO)) {
      this.advance(); // consume INTO
    }
    
    const insertNode = {
      nodeType: 'insert_statement',
      parent: undefined,
      children: [] as AstNode[]
    };
    
    // Build target table
    const targetTable = this.buildTableReference();
    targetTable.parent = insertNode;
    
    // Check for SELECT subquery
    let selectClause: AstNode | null = null;
    if (this.currentTokenIs(TokenType.SELECT)) {
      selectClause = this.buildSelectStatement();
      selectClause.parent = insertNode;
    }
    
    const children = [targetTable];
    if (selectClause) children.push(selectClause);
    insertNode.children = children;
    
    return insertNode;
  }

  /**
   * Build table reference
   */
  private buildTableReference(): AstNode {
    let name = '';
    
    if (this.currentTokenIs(TokenType.IDENTIFIER) || this.currentTokenIs(TokenType.PARAMETER)) {
      name = this.currentToken().value;
      this.advance();
    }
    
    return {
      nodeType: 'table_reference',
      parent: undefined,
      children: [],
      metadata: { name }
    };
  }

  /**
   * Build CREATE statement (CREATE PROCEDURE, etc.)
   */
  private buildCreateStatement(): AstNode {
    this.advance(); // consume CREATE
    
    // Check for PROCEDURE keyword
    if (this.currentTokenIs(TokenType.IDENTIFIER) && this.currentToken().value.toUpperCase() === 'PROCEDURE') {
      return this.buildProcedureNode();
    }
    
    // For other CREATE statements, skip to next statement
    while (!this.isStatementEnd() && !this.isAtEnd()) {
      this.advance();
    }
    
    return {
      nodeType: 'create_statement',
      parent: undefined,
      children: []
    };
  }

  /**
   * Build SET statement
   */
  private buildSetStatement(): AstNode {
    this.advance(); // consume SET
    
    // Skip to end of statement
    while (!this.isStatementEnd() && !this.isAtEnd()) {
      this.advance();
    }
    
    return {
      nodeType: 'set_statement',
      parent: undefined,
      children: []
    };
  }

  /**
   * Build UPDATE statement
   */
  private buildUpdateStatement(): AstNode {
    this.advance(); // consume UPDATE
    
    const updateNode = {
      nodeType: 'update_statement',
      parent: undefined,
      children: [] as AstNode[]
    };
    
    // Build target table
    const targetTable = this.buildTableReference();
    targetTable.parent = updateNode;
    updateNode.children.push(targetTable);
    
    // Skip to end of statement for now
    while (!this.isStatementEnd() && !this.isAtEnd()) {
      this.advance();
    }
    
    return updateNode;
  }

  /**
   * Build EXEC/EXECUTE statement
   */
  private buildExecStatement(): AstNode {
    this.advance(); // consume EXEC/EXECUTE
    
    // Skip to end of statement
    while (!this.isStatementEnd() && !this.isAtEnd()) {
      this.advance();
    }
    
    return {
      nodeType: 'exec_statement',
      parent: undefined,
      children: []
    };
  }

  /**
   * Build MERGE statement with proper structure parsing
   */
  private buildMergeStatement(): AstNode {
    this.advance(); // consume MERGE
    
    const children: AstNode[] = [];
    const mergeNode = {
      nodeType: 'merge_statement',
      parent: undefined,
      children
    };
    
    // Parse target table
    const targetTable = this.buildTableReference();
    targetTable.parent = mergeNode;
    children.push(targetTable);
    
    // Look for USING clause
    while (!this.isAtEnd() && this.currentToken().value.toUpperCase() !== 'USING') {
      this.advance();
    }
    
    if (this.currentToken().value.toUpperCase() === 'USING') {
      this.advance(); // consume USING
      
      if (this.currentTokenIs(TokenType.LEFT_PAREN)) {
        this.advance(); // consume (
        
        // Build the SELECT statement inside USING
        if (this.currentTokenIs(TokenType.SELECT)) {
          const selectStmt = this.buildSelectStatement();
          selectStmt.parent = mergeNode;
          children.push(selectStmt);
        }
        
        // Skip to end of USING clause
        while (!this.isAtEnd() && !this.currentTokenIs(TokenType.RIGHT_PAREN)) {
          this.advance();
        }
        
        if (this.currentTokenIs(TokenType.RIGHT_PAREN)) {
          this.advance(); // consume )
        }
      }
    }
    
    // Parse the rest of MERGE statement (ON clause, WHEN clauses, etc.)
    // Skip until we hit a semicolon or statement end
    while (!this.isAtEnd() && !this.currentTokenIs(TokenType.SEMICOLON)) {
      const token = this.currentToken();
      // Stop if we hit a token that definitely starts a new statement
      if (token.type === TokenType.SELECT || 
          token.type === TokenType.INSERT || 
          token.type === TokenType.MERGE ||
          token.type === TokenType.IF ||
          token.type === TokenType.DECLARE) {
        break;
      }
      this.advance();
    }
    
    // Consume semicolon if present
    if (this.currentTokenIs(TokenType.SEMICOLON)) {
      this.advance();
    }
    
    return mergeNode;
  }

  /**
   * Utility methods
   */
  private currentToken(): SqlToken {
    return this.tokens[this.position] || this.tokens[this.tokens.length - 1];
  }

  private previousToken(): SqlToken {
    return this.tokens[Math.max(0, this.position - 1)];
  }

  private currentTokenIs(type: TokenType): boolean {
    return this.currentToken()?.type === type;
  }

  public advance(): void {
    const logger = sqlParserLogger;
    const previousPosition = this.position;
    
    if (this.position < this.tokens.length - 1) {
      this.position++;
    }
    
    // Log every 50 advances to detect potential infinite loops
    if (this.position % 50 === 0) {
      logger.debug(`Advanced to position ${this.position}/${this.tokens.length}`, {
        currentToken: this.currentToken()?.type,
        previousPosition
      });
    }
    
    // Safety check for infinite loops
    if (this.position > this.tokens.length * 2) {
      logger.error('Possible infinite loop detected in advance()', {
        position: this.position,
        tokenLength: this.tokens.length
      });
      throw new Error('Infinite loop detected in AST builder');
    }
  }

  private isAtEnd(): boolean {
    return this.position >= this.tokens.length - 1 || 
           this.currentToken().type === TokenType.EOF;
  }

  private skipWhitespace(): void {
    const logger = sqlParserLogger;
    let skipped = 0;
    const startPosition = this.position;
    
    while (!this.isAtEnd() && this.currentToken().type === TokenType.WHITESPACE) {
      this.advance();
      skipped++;
      
      // Safety check for infinite loops in whitespace skipping
      if (skipped > 100) {
        logger.error('Infinite loop detected in skipWhitespace()', {
          startPosition,
          currentPosition: this.position,
          skipped
        });
        break;
      }
    }
    
    if (skipped > 0) {
      logger.debug(`Skipped ${skipped} whitespace tokens`, {
        startPosition,
        endPosition: this.position
      });
    }
  }

  private skipToToken(type: TokenType): void {
    while (!this.isAtEnd() && !this.currentTokenIs(type)) {
      this.advance();
    }
  }

  private isStatementEnd(): boolean {
    const token = this.currentToken();
    if (!token) return true;
    
    return token.type === TokenType.SEMICOLON ||
           token.type === TokenType.END ||
           token.type === TokenType.ELSE ||
           token.type === TokenType.IF ||
           token.type === TokenType.SELECT ||
           token.type === TokenType.INSERT ||
           token.type === TokenType.MERGE;
  }
} 