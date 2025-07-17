import type { 
  AstNode, 
  SqlStatementNode, 
  SelectStatementNode 
} from '../types/ast';
import { StatementContext } from '../types/ast';
import { ChevrotainSqlParser } from './parser';

/**
 * SQL AST Visitor that converts CST to AST
 */
export class SqlAstVisitor {
  private parser: ChevrotainSqlParser;

  constructor(parser: ChevrotainSqlParser) {
    this.parser = parser;
  }

  /**
   * Visit statements and convert to AST
   */
  public visitStatements(cst: any): AstNode[] {
    const statements: AstNode[] = [];
    
    if (cst && cst.children && cst.children.statement) {
      for (const stmt of cst.children.statement) {
        const astNode = this.visitStatement(stmt);
        if (astNode) {
          statements.push(astNode);
        }
      }
    }
    
    return statements;
  }

  /**
   * Visit statement by type
   */
  public visitStatementByType(stmtType: string, cst: any): AstNode | null {
    switch (stmtType) {
      case 'setStatement':
        return this.visitSetStatement(cst);
      case 'declareStatement':
        return this.visitDeclareStatement(cst);
      case 'selectStatement':
        return this.visitSelectStatement(cst);
      case 'insertStatement':
        return this.visitInsertStatement(cst);
      case 'updateStatement':
        return this.visitUpdateStatement(cst);
      case 'deleteStatement':
        return this.visitDeleteStatement(cst);
      case 'ifStatement':
        return this.visitIfStatement(cst);
      case 'whileStatement':
        return this.visitWhileStatement(cst);
      case 'blockStatement':
        return this.visitBlockStatement(cst);
      case 'mergeStatement':
        return this.visitMergeStatement(cst);
      case 'execStatement':
        return this.visitExecStatement(cst);
      default:
        return null;
    }
  }

  /**
   * Visit statement and convert to AST
   */
  public visitStatement(cst: any): AstNode | null {
    if (cst.children.createProcedureStatement) {
      return this.visitCreateProcedureStatement(cst.children.createProcedureStatement[0]);
    }
    if (cst.children.selectStatement) {
      return this.visitSelectStatement(cst.children.selectStatement[0]);
    }
    if (cst.children.insertStatement) {
      return this.visitInsertStatement(cst.children.insertStatement[0]);
    }
    if (cst.children.updateStatement) {
      return this.visitUpdateStatement(cst.children.updateStatement[0]);
    }
    if (cst.children.deleteStatement) {
      return this.visitDeleteStatement(cst.children.deleteStatement[0]);
    }
    if (cst.children.mergeStatement) {
      return this.visitMergeStatement(cst.children.mergeStatement[0]);
    }
    if (cst.children.declareStatement) {
      return this.visitDeclareStatement(cst.children.declareStatement[0]);
    }
    if (cst.children.ifStatement) {
      return this.visitIfStatement(cst.children.ifStatement[0]);
    }
    if (cst.children.whileStatement) {
      return this.visitWhileStatement(cst.children.whileStatement[0]);
    }
    if (cst.children.blockStatement) {
      return this.visitBlockStatement(cst.children.blockStatement[0]);
    }
    if (cst.children.setStatement) {
      return this.visitSetStatement(cst.children.setStatement[0]);
    }
    if (cst.children.execStatement) {
      return this.visitExecStatement(cst.children.execStatement[0]);
    }
    
    return null;
  }

  /**
   * Visit SELECT statement and convert to AST
   */
  public visitSelectStatement(cst: any): SqlStatementNode {
    const children: AstNode[] = [];
    
    // Build SELECT clause
    if (cst.children.selectList) {
      const selectClause = this.visitSelectList(cst.children.selectList[0]);
      children.push(selectClause);
    }
    
    // Build FROM clause
    if (cst.children.fromClause) {
      const fromClause = this.visitFromClause(cst.children.fromClause[0]);
      children.push(fromClause);
    }
    
    // Build WHERE clause
    if (cst.children.whereClause) {
      const whereClause = this.visitWhereClause(cst.children.whereClause[0]);
      children.push(whereClause);
    }
    
    // Build ORDER BY clause
    if (cst.children.orderByClause) {
      const orderByClause = this.visitOrderByClause(cst.children.orderByClause[0]);
      children.push(orderByClause);
    }
    
    // Reconstruct SQL content (simplified)
    const content = this.reconstructSql(cst);
    
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
   * Visit SELECT list and convert to AST
   */
  public visitSelectList(cst: any): AstNode {
    const columns: AstNode[] = [];
    let isDistinct = false;
    let isWildcard = false;
    
    if (cst.children.selectItem) {
      for (const item of cst.children.selectItem) {
        const column = this.visitSelectItem(item);
        if (column) {
          columns.push(column);
          if (column.metadata?.isWildcard) {
            isWildcard = true;
          }
        }
      }
    }
    
    return {
      nodeType: 'select_clause',
      parent: undefined,
      children: columns,
      metadata: { isDistinct, isWildcard }
    };
  }

  /**
   * Visit SELECT item and convert to AST
   */
  public visitSelectItem(cst: any): AstNode | null {
    let columnName = '';
    let alias = '';
    let expression = '';
    let isWildcard = false;
    
    // Extract column information from the CST
    if (cst.children.expression) {
      expression = this.reconstructExpression(cst.children.expression[0]);
      columnName = expression;
      
      // Check if it's a wildcard
      if (expression === '*') {
        isWildcard = true;
      }
    }
    
    // Extract alias if present
    if (cst.children.identifier) {
      alias = this.getTokenValue(cst.children.identifier[0]);
    }
    
    return {
      nodeType: 'column_reference',
      parent: undefined,
      children: [],
      metadata: {
        columnName,
        alias,
        expression,
        isWildcard,
        isFunction: false,
        isVariableAssignment: false
      }
    };
  }

  /**
   * Visit FROM clause and convert to AST
   */
  public visitFromClause(cst: any): AstNode {
    const tables: AstNode[] = [];
    
    if (cst.children.tableReference) {
      const table = this.visitTableReference(cst.children.tableReference[0]);
      if (table) {
        tables.push(table);
      }
    }
    
    return {
      nodeType: 'from_clause',
      parent: undefined,
      children: tables
    };
  }

  /**
   * Visit table reference and convert to AST
   */
  public visitTableReference(cst: any): AstNode | null {
    let tableName = '';
    let alias = '';
    
    if (cst.children.tableName) {
      tableName = this.visitTableName(cst.children.tableName[0]);
    }
    
    if (cst.children.identifier) {
      alias = this.getTokenValue(cst.children.identifier[0]);
    }
    
    return {
      nodeType: 'table_reference',
      parent: undefined,
      children: [],
      metadata: { 
        name: tableName, 
        alias: alias || undefined,
        fullName: tableName
      }
    };
  }

  /**
   * Visit table name and extract full name
   */
  public visitTableName(cst: any): string {
    // Check if it's a table variable (parameter)
    if (cst.children.PARAMETER) {
      return cst.children.PARAMETER[0].image;
    }
    
    // Regular table name
    const parts: string[] = [];
    
    if (cst.children.identifier) {
      for (const id of cst.children.identifier) {
        parts.push(this.getTokenValue(id));
      }
    }
    
    return parts.join('.');
  }

  /**
   * Visit WHERE clause and convert to AST
   */
  public visitWhereClause(cst: any): AstNode {
    return {
      nodeType: 'where_clause',
      parent: undefined,
      children: []
    };
  }

  /**
   * Visit ORDER BY clause and convert to AST
   */
  public visitOrderByClause(cst: any): AstNode {
    const columns: AstNode[] = [];
    
    if (cst.orderByItem) {
      for (const item of cst.orderByItem) {
        const column = this.visitOrderByItem(item);
        if (column) {
          columns.push(column);
        }
      }
    }
    
    return {
      nodeType: 'order_by_clause',
      parent: undefined,
      children: columns
    };
  }

  /**
   * Visit ORDER BY item and convert to AST
   */
  public visitOrderByItem(cst: any): AstNode | null {
    let columnName = '';
    let direction = 'ASC';
    
    if (cst.expression) {
      columnName = this.reconstructExpression(cst.expression[0]);
    }
    
    if (cst.ASC) {
      direction = 'ASC';
    } else if (cst.DESC) {
      direction = 'DESC';
    }
    
    return {
      nodeType: 'order_by_column',
      parent: undefined,
      children: [],
      metadata: { columnName, direction }
    };
  }

  /**
   * Visit other statement types (simplified implementations)
   */
  public visitInsertStatement(cst: any): AstNode {
    return {
      nodeType: 'insert_statement',
      parent: undefined,
      children: []
    };
  }

  public visitUpdateStatement(cst: any): AstNode {
    return {
      nodeType: 'update_statement',
      parent: undefined,
      children: []
    };
  }

  public visitDeleteStatement(cst: any): AstNode {
    return {
      nodeType: 'delete_statement',
      parent: undefined,
      children: []
    };
  }

  public visitMergeStatement(cst: any): AstNode {
    return {
      nodeType: 'merge_statement',
      parent: undefined,
      children: []
    };
  }

  public visitDeclareStatement(cst: any): AstNode {
    const variables: AstNode[] = [];
    
    if (cst.children.variableDeclaration) {
      for (const varDecl of cst.children.variableDeclaration) {
        const variable = this.visitVariableDeclaration(varDecl);
        if (variable) {
          variables.push(variable);
        }
      }
    }
    
    return {
      nodeType: 'declare_statement',
      parent: undefined,
      children: variables
    };
  }

  public visitVariableDeclaration(cst: any): AstNode | null {
    let variableName = '';
    let dataType = '';
    let defaultValue = '';
    let isTableVariable = false;
    const columns: AstNode[] = [];
    
    // Extract variable name
    if (cst.children.PARAMETER) {
      variableName = cst.children.PARAMETER[0].image;
    }
    
    // Check if it's a table variable
    if (cst.children.TABLE) {
      isTableVariable = true;
      dataType = 'TABLE';
      
      // Extract column definitions
      if (cst.children.tableColumnDefinition) {
        for (const colDef of cst.children.tableColumnDefinition) {
          const column = this.visitTableColumnDefinition(colDef);
          if (column) {
            columns.push(column);
          }
        }
      }
    } else if (cst.children.dataType) {
      // Regular variable
      dataType = this.visitDataType(cst.children.dataType[0]);
      
      // Extract default value if present
      if (cst.children.expression) {
        defaultValue = this.reconstructExpression(cst.children.expression[0]);
      }
    }
    
    return {
      nodeType: 'variable_declaration',
      parent: undefined,
      children: columns,
      metadata: {
        name: variableName,
        dataType,
        defaultValue: defaultValue || undefined,
        isTableVariable
      }
    };
  }

  public visitTableColumnDefinition(cst: any): AstNode | null {
    let columnName = '';
    let dataType = '';
    let isNullable = true;
    
    // Extract column name
    if (cst.children.identifier) {
      columnName = this.getTokenValue(cst.children.identifier[0]);
    }
    
    // Extract data type
    if (cst.children.dataType) {
      dataType = this.visitDataType(cst.children.dataType[0]);
    }
    
    // Check for NULL/NOT NULL
    if (cst.children.NOT && cst.children.NULL) {
      isNullable = false;
    }
    
    return {
      nodeType: 'table_column_definition',
      parent: undefined,
      children: [],
      metadata: {
        columnName,
        dataType,
        isNullable
      }
    };
  }

  public visitIfStatement(cst: any): AstNode {
    return {
      nodeType: 'if_statement',
      parent: undefined,
      children: []
    };
  }

  public visitWhileStatement(cst: any): AstNode {
    return {
      nodeType: 'while_statement',
      parent: undefined,
      children: []
    };
  }

  public visitBlockStatement(cst: any): AstNode {
    return {
      nodeType: 'block_statement',
      parent: undefined,
      children: []
    };
  }

  public visitSetStatement(cst: any): AstNode {
    return {
      nodeType: 'set_statement',
      parent: undefined,
      children: []
    };
  }

  public visitExecStatement(cst: any): AstNode {
    return {
      nodeType: 'exec_statement',
      parent: undefined,
      children: []
    };
  }

  public visitCreateProcedureStatement(cst: any): AstNode {
    const children: AstNode[] = [];
    
    // Extract procedure name - handle qualified names like [schema].[procedure]
    let procedureName = '';
    if (cst.children.identifier) {
      if (cst.children.identifier.length === 1) {
        // Simple name
        procedureName = this.getTokenValue(cst.children.identifier[0]);
      } else if (cst.children.identifier.length === 2) {
        // Qualified name like [schema].[procedure]
        const schema = this.getTokenValue(cst.children.identifier[0]);
        const procName = this.getTokenValue(cst.children.identifier[1]);
        procedureName = `${schema}.${procName}`;
      }
    }
    
    // Extract parameters
    let parameters: AstNode[] = [];
    if (cst.children.parameterList) {
      parameters = this.visitParameterList(cst.children.parameterList[0]);
    }
    
    // Extract procedure body statements
    // Check for different statement types that can appear in procedure body
    const statementTypes = [
      'setStatement', 'declareStatement', 'ifStatement', 'whileStatement', 
      'blockStatement', 'selectStatement', 'insertStatement', 'updateStatement', 
      'deleteStatement', 'mergeStatement', 'execStatement'
    ];
    
    for (const stmtType of statementTypes) {
      if (cst.children[stmtType]) {
        for (const stmt of cst.children[stmtType]) {
          const astNode = this.visitStatementByType(stmtType, stmt);
          if (astNode) {
            children.push(astNode);
          }
        }
      }
    }
    
    return {
      nodeType: 'create_procedure_statement',
      parent: undefined,
      children: [...parameters, ...children],
      metadata: {
        procedureName,
        parameterCount: parameters.length
      }
    };
  }

  public visitParameterList(cst: any): AstNode[] {
    const parameters: AstNode[] = [];
    
    if (cst.children.parameterDeclaration) {
      for (const param of cst.children.parameterDeclaration) {
        const parameter = this.visitParameterDeclaration(param);
        if (parameter) {
          parameters.push(parameter);
        }
      }
    }
    
    return parameters;
  }

  public visitParameterDeclaration(cst: any): AstNode | null {
    let parameterName = '';
    let dataType = '';
    let defaultValue = '';
    
    // Extract parameter name
    if (cst.children.PARAMETER) {
      parameterName = cst.children.PARAMETER[0].image;
    }
    
    // Extract data type
    if (cst.children.dataType) {
      dataType = this.visitDataType(cst.children.dataType[0]);
    }
    
    // Extract default value if present
    if (cst.children.expression) {
      defaultValue = this.reconstructExpression(cst.children.expression[0]);
    }
    
    return {
      nodeType: 'parameter_declaration',
      parent: undefined,
      children: [],
      metadata: {
        name: parameterName,
        dataType,
        defaultValue: defaultValue || undefined
      }
    };
  }

  public visitDataType(cst: any): string {
    // Check for data type tokens
    const dataTypeTokens = [
      'INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'REAL',
      'CHAR', 'VARCHAR', 'NCHAR', 'NVARCHAR', 'TEXT', 'NTEXT',
      'DATETIME', 'DATE', 'TIME', 'TIMESTAMP', 'BIT', 'BINARY', 'VARBINARY',
      'UNIQUEIDENTIFIER', 'XML', 'TABLE'
    ];
    
    let dataType = '';
    
    // Find the data type token
    for (const tokenType of dataTypeTokens) {
      if (cst.children[tokenType]) {
        dataType = cst.children[tokenType][0].image;
        break;
      }
    }
    
    // If no built-in type found, check for custom type (identifier)
    if (!dataType && cst.children.identifier) {
      dataType = this.getTokenValue(cst.children.identifier[0]);
    }
    
    // Handle type parameters like VARCHAR(50) or DECIMAL(10,2)
    if (cst.children.LEFT_PAREN) {
      dataType += '(';
      if (cst.children.NUMBER_LITERAL) {
        dataType += cst.children.NUMBER_LITERAL[0].image;
        if (cst.children.NUMBER_LITERAL.length > 1) {
          dataType += ',' + cst.children.NUMBER_LITERAL[1].image;
        }
      }
      dataType += ')';
    }
    
    return dataType;
  }

  /**
   * Helper methods
   */
  private getTokenValue(tokenCst: any): string {
    if (tokenCst.children) {
      if (tokenCst.children.IDENTIFIER) {
        return tokenCst.children.IDENTIFIER[0].image;
      }
      if (tokenCst.children.BRACKETED_IDENTIFIER) {
        return tokenCst.children.BRACKETED_IDENTIFIER[0].image.slice(1, -1); // Remove brackets
      }
    }
    return '';
  }

  private reconstructSql(cst: any): string {
    // This is a simplified implementation
    // In a full implementation, you'd reconstruct the SQL from the CST
    return 'SELECT ...'; // Placeholder
  }

  private reconstructExpression(cst: any): string {
    // Navigate through the expression hierarchy to find the actual token
    if (cst.children) {
      // Navigate down the expression tree
      let current = cst;
      while (current.children) {
        if (current.children.orExpression) {
          current = current.children.orExpression[0];
        } else if (current.children.andExpression) {
          current = current.children.andExpression[0];
        } else if (current.children.comparisonExpression) {
          current = current.children.comparisonExpression[0];
        } else if (current.children.additiveExpression) {
          current = current.children.additiveExpression[0];
        } else if (current.children.multiplicativeExpression) {
          current = current.children.multiplicativeExpression[0];
        } else if (current.children.primaryExpression) {
          current = current.children.primaryExpression[0];
        } else {
          break;
        }
      }
      
      // Check for specific tokens
      if (current.children) {
        if (current.children.MULTIPLY) {
          return '*';
        }
        if (current.children.IDENTIFIER) {
          return current.children.IDENTIFIER[0].image;
        }
        if (current.children.BRACKETED_IDENTIFIER) {
          // Remove brackets and return the identifier
          const bracketedName = current.children.BRACKETED_IDENTIFIER[0].image;
          return bracketedName.replace(/^\[|\]$/g, '');
        }
        if (current.children.STRING_LITERAL) {
          return current.children.STRING_LITERAL[0].image;
        }
        if (current.children.NUMBER_LITERAL) {
          return current.children.NUMBER_LITERAL[0].image;
        }
        if (current.children.PARAMETER) {
          return current.children.PARAMETER[0].image;
        }
        if (current.children.NULL) {
          return 'NULL';
        }
        
        // Handle column references with table prefixes (like r.Type, l.GameLobbyName)
        if (current.children.columnReference) {
          const colRef = current.children.columnReference[0];
          if (colRef.children) {
            // Look for table.column pattern
            if (colRef.children.identifier && colRef.children.identifier.length >= 2) {
              // Return the column name (second identifier)
              const columnIdentifier = colRef.children.identifier[1];
              if (columnIdentifier.children) {
                if (columnIdentifier.children.IDENTIFIER) {
                  return columnIdentifier.children.IDENTIFIER[0].image;
                }
                if (columnIdentifier.children.BRACKETED_IDENTIFIER) {
                  const bracketedName = columnIdentifier.children.BRACKETED_IDENTIFIER[0].image;
                  return bracketedName.replace(/^\[|\]$/g, '');
                }
              }
            }
            // Single column reference
            else if (colRef.children.identifier && colRef.children.identifier.length === 1) {
              const columnIdentifier = colRef.children.identifier[0];
              if (columnIdentifier.children) {
                if (columnIdentifier.children.IDENTIFIER) {
                  return columnIdentifier.children.IDENTIFIER[0].image;
                }
                if (columnIdentifier.children.BRACKETED_IDENTIFIER) {
                  const bracketedName = columnIdentifier.children.BRACKETED_IDENTIFIER[0].image;
                  return bracketedName.replace(/^\[|\]$/g, '');
                }
              }
            }
          }
        }
        
        // Handle function calls
        if (current.children.functionCall) {
          const funcCall = current.children.functionCall[0];
          if (funcCall.children && funcCall.children.identifier) {
            const funcName = funcCall.children.identifier[0];
            if (funcName.children) {
              if (funcName.children.IDENTIFIER) {
                return funcName.children.IDENTIFIER[0].image + '(...)';
              }
              if (funcName.children.ISNULL) {
                return 'ISNULL(...)';
              }
              if (funcName.children.CAST) {
                return 'CAST(...)';
              }
            }
          }
        }
      }
    }
    
    return 'unknown'; // Fallback
  }
}
