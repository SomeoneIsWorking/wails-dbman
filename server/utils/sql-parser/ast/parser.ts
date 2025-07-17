import { CstParser } from 'chevrotain';
import { 
  allTokens,
  SELECT, FROM, WHERE, INSERT, INTO, VALUES, UPDATE, SET, DELETE, MERGE,
  JOIN, INNER, LEFT, RIGHT, FULL, CROSS, ON,
  WITH, AS,
  IF, ELSE, WHILE, BEGIN, END, TRY, CATCH, RETURN,
  DECLARE, EXEC, EXECUTE, CREATE, PROCEDURE, ALTER, DROP,
  EXISTS, NOT, AND, OR, IN, LIKE, BETWEEN, IS, NULL,
  CASE, WHEN, THEN,
  GROUP, BY, HAVING, ORDER, ASC, DESC, DISTINCT, ALL,
  UNION, INTERSECT, EXCEPT,
  USING, MATCHED,
  INT, BIGINT, SMALLINT, TINYINT, DECIMAL, NUMERIC, FLOAT, REAL,
  CHAR, VARCHAR, NCHAR, NVARCHAR, TEXT, NTEXT,
  DATETIME, DATE, TIME, TIMESTAMP, BIT, BINARY, VARBINARY,
  UNIQUEIDENTIFIER, XML, TABLE, PROC,
  TRANSACTION, ISOLATION, LEVEL, READ, UNCOMMITTED, COMMITTED,
  REPEATABLE, SERIALIZABLE, NOCOUNT, ANSI_NULLS, QUOTED_IDENTIFIER,
  IDENTIFIER, BRACKETED_IDENTIFIER, STRING_LITERAL, NUMBER_LITERAL, PARAMETER,
  EQUALS, NOT_EQUALS, LESS_THAN, GREATER_THAN, LESS_EQUAL, GREATER_EQUAL,
  PLUS, MINUS, MULTIPLY, DIVIDE, MODULO,
  COMMA, SEMICOLON, DOT, LEFT_PAREN, RIGHT_PAREN, LEFT_BRACKET, RIGHT_BRACKET,
  ISNULL, CAST, CONVERT
} from './tokens';

/**
 * Chevrotain SQL Parser - Grammar Rules
 */
export class ChevrotainSqlParser extends CstParser {
  constructor() {
    super(allTokens);
    this.performSelfAnalysis();
  }

  /**
   * Entry point for parsing SQL statements
   */
  public statements = this.RULE('statements', () => {
    this.MANY(() => {
      this.SUBRULE(this.statement);
      this.OPTION(() => {
        this.CONSUME(SEMICOLON);
      });
    });
  });

  /**
   * Parse a single SQL statement
   */
  public statement = this.RULE('statement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.createProcedureStatement) },
      { ALT: () => this.SUBRULE(this.selectStatement) },
      { ALT: () => this.SUBRULE(this.insertStatement) },
      { ALT: () => this.SUBRULE(this.updateStatement) },
      { ALT: () => this.SUBRULE(this.deleteStatement) },
      { ALT: () => this.SUBRULE(this.mergeStatement) },
      { ALT: () => this.SUBRULE(this.declareStatement) },
      { ALT: () => this.SUBRULE(this.ifStatement) },
      { ALT: () => this.SUBRULE(this.whileStatement) },
      { ALT: () => this.SUBRULE(this.blockStatement) },
      { ALT: () => this.SUBRULE(this.setStatement) },
      { ALT: () => this.SUBRULE(this.execStatement) }
    ]);
  });

  /**
   * Parse SELECT statement
   */
  public selectStatement = this.RULE('selectStatement', () => {
    this.OPTION(() => {
      this.SUBRULE(this.withClause);
    });
    
    this.CONSUME(SELECT);
    
    this.OPTION2(() => {
      this.CONSUME(DISTINCT);
    });
    
    this.SUBRULE(this.selectList);
    
    this.OPTION3(() => {
      this.CONSUME(FROM);
      this.SUBRULE(this.fromClause);
    });
    
    this.OPTION4(() => {
      this.CONSUME(WHERE);
      this.SUBRULE(this.whereClause);
    });
    
    this.OPTION5(() => {
      this.CONSUME(GROUP);
      this.CONSUME(BY);
      this.SUBRULE(this.groupByClause);
    });
    
    this.OPTION6(() => {
      this.CONSUME(HAVING);
      this.SUBRULE(this.havingClause);
    });
    
    this.OPTION7(() => {
      this.CONSUME(ORDER);
      this.CONSUME2(BY);
      this.SUBRULE(this.orderByClause);
    });
  });

  /**
   * Parse WITH clause (CTE)
   */
  public withClause = this.RULE('withClause', () => {
    this.CONSUME(WITH);
    this.SUBRULE(this.cteDefinition);
    this.MANY(() => {
      this.CONSUME(COMMA);
      this.SUBRULE2(this.cteDefinition);
    });
  });

  /**
   * Parse CTE definition
   */
  public cteDefinition = this.RULE('cteDefinition', () => {
    this.SUBRULE(this.identifier);
    this.OPTION(() => {
      this.CONSUME(LEFT_PAREN);
      this.SUBRULE(this.columnList);
      this.CONSUME(RIGHT_PAREN);
    });
    this.CONSUME(AS);
    this.CONSUME2(LEFT_PAREN);
    this.SUBRULE(this.selectStatement);
    this.CONSUME2(RIGHT_PAREN);
  });

  /**
   * Parse SELECT list
   */
  public selectList = this.RULE('selectList', () => {
    this.SUBRULE(this.selectItem);
    this.MANY(() => {
      this.CONSUME(COMMA);
      this.SUBRULE2(this.selectItem);
    });
  });

  /**
   * Parse SELECT item
   */
  public selectItem = this.RULE('selectItem', () => {
    this.SUBRULE(this.expression);
    this.OPTION(() => {
      this.OPTION2(() => {
        this.CONSUME(AS);
      });
      this.SUBRULE(this.identifier);
    });
  });

  /**
   * Parse FROM clause
   */
  public fromClause = this.RULE('fromClause', () => {
    this.SUBRULE(this.tableReference);
    this.MANY(() => {
      this.SUBRULE(this.joinClause);
    });
  });

  /**
   * Parse table reference
   */
  public tableReference = this.RULE('tableReference', () => {
    this.OR([
      {
        ALT: () => {
          this.SUBRULE(this.tableName);
          this.OPTION(() => {
            this.OPTION2(() => {
              this.CONSUME(AS);
            });
            this.SUBRULE(this.identifier);
          });
        }
      },
      {
        ALT: () => {
          this.CONSUME(LEFT_PAREN);
          this.SUBRULE(this.selectStatement);
          this.CONSUME(RIGHT_PAREN);
          this.OPTION3(() => {
            this.CONSUME2(AS);
          });
          this.SUBRULE2(this.identifier);
        }
      }
    ]);
  });

  /**
   * Parse table name
   */
  public tableName = this.RULE('tableName', () => {
    this.OR([
      // Table variable: @VariableName
      { ALT: () => this.CONSUME(PARAMETER) },
      // Regular table name: [schema].[table] or table
      { ALT: () => {
        this.SUBRULE(this.identifier);
        this.OPTION(() => {
          this.CONSUME(DOT);
          this.SUBRULE2(this.identifier);
          this.OPTION2(() => {
            this.CONSUME2(DOT);
            this.SUBRULE3(this.identifier);
          });
        });
      }}
    ]);
  });

  /**
   * Parse JOIN clause
   */
  public joinClause = this.RULE('joinClause', () => {
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(INNER) },
        { ALT: () => this.CONSUME(LEFT) },
        { ALT: () => this.CONSUME(RIGHT) },
        { ALT: () => this.CONSUME(FULL) },
        { ALT: () => this.CONSUME(CROSS) }
      ]);
    });
    
    this.CONSUME(JOIN);
    this.SUBRULE(this.tableReference);
    
    this.OPTION2(() => {
      this.CONSUME(ON);
      this.SUBRULE(this.expression);
    });
  });

  /**
   * Parse WHERE clause
   */
  public whereClause = this.RULE('whereClause', () => {
    this.SUBRULE(this.expression);
  });

  /**
   * Parse GROUP BY clause
   */
  public groupByClause = this.RULE('groupByClause', () => {
    this.SUBRULE(this.expression);
    this.MANY(() => {
      this.CONSUME(COMMA);
      this.SUBRULE2(this.expression);
    });
  });

  /**
   * Parse HAVING clause
   */
  public havingClause = this.RULE('havingClause', () => {
    this.SUBRULE(this.expression);
  });

  /**
   * Parse ORDER BY clause
   */
  public orderByClause = this.RULE('orderByClause', () => {
    this.SUBRULE(this.orderByItem);
    this.MANY(() => {
      this.CONSUME(COMMA);
      this.SUBRULE2(this.orderByItem);
    });
  });

  /**
   * Parse ORDER BY item
   */
  public orderByItem = this.RULE('orderByItem', () => {
    this.SUBRULE(this.expression);
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(ASC) },
        { ALT: () => this.CONSUME(DESC) }
      ]);
    });
  });

  /**
   * Parse INSERT statement
   */
  public insertStatement = this.RULE('insertStatement', () => {
    this.CONSUME(INSERT);
    this.CONSUME(INTO);
    this.SUBRULE(this.tableName);
    
    this.OPTION(() => {
      this.CONSUME(LEFT_PAREN);
      this.SUBRULE(this.columnList);
      this.CONSUME(RIGHT_PAREN);
    });
    
    this.OR([
      {
        ALT: () => {
          this.CONSUME(VALUES);
          this.SUBRULE(this.valuesList);
        }
      },
      {
        ALT: () => {
          this.SUBRULE(this.selectStatement);
        }
      }
    ]);
  });

  /**
   * Parse VALUES list
   */
  public valuesList = this.RULE('valuesList', () => {
    this.SUBRULE(this.valuesRow);
    this.MANY(() => {
      this.CONSUME(COMMA);
      this.SUBRULE2(this.valuesRow);
    });
  });

  /**
   * Parse VALUES row
   */
  public valuesRow = this.RULE('valuesRow', () => {
    this.CONSUME(LEFT_PAREN);
    this.SUBRULE(this.expression);
    this.MANY(() => {
      this.CONSUME(COMMA);
      this.SUBRULE2(this.expression);
    });
    this.CONSUME(RIGHT_PAREN);
  });

  /**
   * Parse UPDATE statement
   */
  public updateStatement = this.RULE('updateStatement', () => {
    this.CONSUME(UPDATE);
    this.SUBRULE(this.tableName);
    this.CONSUME(SET);
    this.SUBRULE(this.setClause);
    
    this.OPTION(() => {
      this.CONSUME(WHERE);
      this.SUBRULE(this.whereClause);
    });
  });

  /**
   * Parse SET clause
   */
  public setClause = this.RULE('setClause', () => {
    this.SUBRULE(this.assignment);
    this.MANY(() => {
      this.CONSUME(COMMA);
      this.SUBRULE2(this.assignment);
    });
  });

  /**
   * Parse assignment
   */
  public assignment = this.RULE('assignment', () => {
    this.SUBRULE(this.identifier);
    this.CONSUME(EQUALS);
    this.SUBRULE(this.expression);
  });

  /**
   * Parse DELETE statement
   */
  public deleteStatement = this.RULE('deleteStatement', () => {
    this.CONSUME(DELETE);
    this.CONSUME(FROM);
    this.SUBRULE(this.tableName);
    
    this.OPTION(() => {
      this.CONSUME(WHERE);
      this.SUBRULE(this.whereClause);
    });
  });

  /**
   * Parse MERGE statement
   */
  public mergeStatement = this.RULE('mergeStatement', () => {
    this.CONSUME(MERGE);
    this.SUBRULE(this.tableName);
    this.CONSUME(USING);
    this.SUBRULE(this.tableReference);
    this.CONSUME(ON);
    this.SUBRULE(this.expression);
    
    this.MANY(() => {
      this.SUBRULE(this.whenClause);
    });
  });

  /**
   * Parse WHEN clause (for MERGE)
   */
  public whenClause = this.RULE('whenClause', () => {
    this.CONSUME(WHEN);
    this.OPTION(() => {
      this.CONSUME(NOT);
    });
    this.CONSUME(MATCHED);
    
    this.OPTION2(() => {
      this.CONSUME(AND);
      this.SUBRULE(this.expression);
    });
    
    this.CONSUME(THEN);
    
    this.OR([
      { ALT: () => this.SUBRULE(this.insertStatement) },
      { ALT: () => this.SUBRULE(this.updateStatement) },
      { ALT: () => this.SUBRULE(this.deleteStatement) }
    ]);
  });

  /**
   * Parse DECLARE statement
   */
  public declareStatement = this.RULE('declareStatement', () => {
    this.CONSUME(DECLARE);
    this.SUBRULE(this.variableDeclaration);
    this.MANY(() => {
      this.CONSUME(COMMA);
      this.SUBRULE2(this.variableDeclaration);
    });
  });

  /**
   * Parse variable declaration
   */
  public variableDeclaration = this.RULE('variableDeclaration', () => {
    this.CONSUME(PARAMETER);
    
    this.OR([
      // Table variable: @Variable TABLE (columns...)
      { ALT: () => {
        this.CONSUME(TABLE);
        this.CONSUME(LEFT_PAREN);
        this.SUBRULE(this.tableColumnDefinition);
        this.MANY(() => {
          this.CONSUME(COMMA);
          this.SUBRULE2(this.tableColumnDefinition);
        });
        this.CONSUME(RIGHT_PAREN);
      }},
      // Regular variable: @Variable DataType [= DefaultValue]
      { ALT: () => {
        this.SUBRULE(this.dataType);
        this.OPTION(() => {
          this.CONSUME(EQUALS);
          this.SUBRULE(this.expression);
        });
      }}
    ]);
  });

  /**
   * Parse table column definition for table variables
   */
  public tableColumnDefinition = this.RULE('tableColumnDefinition', () => {
    this.SUBRULE(this.identifier); // column name
    this.SUBRULE(this.dataType); // column type
    
    // Optional column constraints (NULL, NOT NULL, etc.)
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(NULL) },
        { ALT: () => {
          this.CONSUME(NOT);
          this.CONSUME2(NULL);
        }}
      ]);
    });
  });

  /**
   * Parse IF statement
   */
  public ifStatement = this.RULE('ifStatement', () => {
    this.CONSUME(IF);
    this.SUBRULE(this.expression);
    this.SUBRULE(this.statement);
    
    this.OPTION(() => {
      this.CONSUME(ELSE);
      this.SUBRULE2(this.statement);
    });
  });

  /**
   * Parse WHILE statement
   */
  public whileStatement = this.RULE('whileStatement', () => {
    this.CONSUME(WHILE);
    this.SUBRULE(this.expression);
    this.SUBRULE(this.statement);
  });

  /**
   * Parse block statement (BEGIN...END)
   */
  public blockStatement = this.RULE('blockStatement', () => {
    this.CONSUME(BEGIN);
    this.MANY(() => {
      this.SUBRULE(this.statement);
      this.OPTION(() => {
        this.CONSUME(SEMICOLON);
      });
    });
    this.CONSUME(END);
  });

  /**
   * Parse SET statement
   */
  public setStatement = this.RULE('setStatement', () => {
    this.CONSUME(SET);
    this.OR([
      // SET TRANSACTION ISOLATION LEVEL
      { ALT: () => {
        this.CONSUME(TRANSACTION);
        this.CONSUME(ISOLATION);
        this.CONSUME(LEVEL);
        this.OR2([
          { ALT: () => {
            this.CONSUME(READ);
            this.CONSUME(UNCOMMITTED);
          }},
          { ALT: () => {
            this.CONSUME2(READ);
            this.CONSUME(COMMITTED);
          }},
          { ALT: () => {
            this.CONSUME(REPEATABLE);
            this.CONSUME3(READ);
          }},
          { ALT: () => this.CONSUME(SERIALIZABLE) }
        ]);
      }},
      // SET NOCOUNT ON/OFF
      { ALT: () => {
        this.CONSUME(NOCOUNT);
        this.OR3([
          { ALT: () => this.CONSUME(ON) },
          { ALT: () => this.CONSUME(NOT) }
        ]);
      }},
      // SET ANSI_NULLS ON/OFF
      { ALT: () => {
        this.CONSUME(ANSI_NULLS);
        this.OR4([
          { ALT: () => this.CONSUME2(ON) },
          { ALT: () => this.CONSUME2(NOT) }
        ]);
      }},
      // SET QUOTED_IDENTIFIER ON/OFF
      { ALT: () => {
        this.CONSUME(QUOTED_IDENTIFIER);
        this.OR5([
          { ALT: () => this.CONSUME3(ON) },
          { ALT: () => this.CONSUME3(NOT) }
        ]);
      }},
      // Generic SET assignment
      { ALT: () => this.SUBRULE(this.assignment) }
    ]);
  });

  /**
   * Parse EXEC statement
   */
  public execStatement = this.RULE('execStatement', () => {
    this.OR([
      { ALT: () => this.CONSUME(EXEC) },
      { ALT: () => this.CONSUME(EXECUTE) }
    ]);
    
    this.SUBRULE(this.identifier);
    
    this.MANY(() => {
      this.SUBRULE(this.expression);
      this.OPTION(() => {
        this.CONSUME(COMMA);
      });
    });
  });

  /**
   * Parse CREATE PROCEDURE statement
   */
  public createProcedureStatement = this.RULE('createProcedureStatement', () => {
    this.CONSUME(CREATE);
    this.CONSUME(PROCEDURE);
    
    // Procedure name (can be schema.procedure or [schema].[procedure])
    this.SUBRULE(this.identifier);
    this.OPTION(() => {
      this.CONSUME(DOT);
      this.SUBRULE2(this.identifier);
    });
    
    // Parameters
    this.OPTION2(() => {
      this.SUBRULE(this.parameterList);
    });
    
    // AS keyword
    this.CONSUME(AS);
    
    // For now, we'll treat the procedure body as a collection of statements
    // This is simplified - in a real implementation, we'd need more sophisticated parsing
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.setStatement) },
        { ALT: () => this.SUBRULE(this.declareStatement) },
        { ALT: () => this.SUBRULE(this.ifStatement) },
        { ALT: () => this.SUBRULE(this.whileStatement) },
        { ALT: () => this.SUBRULE(this.blockStatement) },
        { ALT: () => this.SUBRULE(this.selectStatement) },
        { ALT: () => this.SUBRULE(this.insertStatement) },
        { ALT: () => this.SUBRULE(this.updateStatement) },
        { ALT: () => this.SUBRULE(this.deleteStatement) },
        { ALT: () => this.SUBRULE(this.mergeStatement) },
        { ALT: () => this.SUBRULE(this.execStatement) }
      ]);
      this.OPTION3(() => {
        this.CONSUME(SEMICOLON);
      });
    });
  });

  /**
   * Parse parameter list for procedures
   */
  public parameterList = this.RULE('parameterList', () => {
    this.SUBRULE(this.parameterDeclaration);
    this.MANY(() => {
      this.CONSUME(COMMA);
      this.SUBRULE2(this.parameterDeclaration);
    });
  });

  /**
   * Parse parameter declaration
   */
  public parameterDeclaration = this.RULE('parameterDeclaration', () => {
    this.CONSUME(PARAMETER);
    this.SUBRULE(this.dataType);
    
    // Default value
    this.OPTION(() => {
      this.CONSUME(EQUALS);
      this.SUBRULE(this.expression);
    });
  });

  public dataType = this.RULE('dataType', () => {
    this.OR([
      { ALT: () => this.CONSUME(INT) },
      { ALT: () => this.CONSUME(BIGINT) },
      { ALT: () => this.CONSUME(SMALLINT) },
      { ALT: () => this.CONSUME(TINYINT) },
      { ALT: () => this.CONSUME(DECIMAL) },
      { ALT: () => this.CONSUME(NUMERIC) },
      { ALT: () => this.CONSUME(FLOAT) },
      { ALT: () => this.CONSUME(REAL) },
      { ALT: () => this.CONSUME(CHAR) },
      { ALT: () => this.CONSUME(VARCHAR) },
      { ALT: () => this.CONSUME(NCHAR) },
      { ALT: () => this.CONSUME(NVARCHAR) },
      { ALT: () => this.CONSUME(TEXT) },
      { ALT: () => this.CONSUME(NTEXT) },
      { ALT: () => this.CONSUME(DATETIME) },
      { ALT: () => this.CONSUME(DATE) },
      { ALT: () => this.CONSUME(TIME) },
      { ALT: () => this.CONSUME(TIMESTAMP) },
      { ALT: () => this.CONSUME(BIT) },
      { ALT: () => this.CONSUME(BINARY) },
      { ALT: () => this.CONSUME(VARBINARY) },
      { ALT: () => this.CONSUME(UNIQUEIDENTIFIER) },
      { ALT: () => this.CONSUME(XML) },
      // Note: TABLE is handled separately in variableDeclaration
      { ALT: () => this.SUBRULE(this.identifier) } // Custom types
    ]);
    
    // Handle type parameters like VARCHAR(50) or DECIMAL(10,2)
    this.OPTION(() => {
      this.CONSUME(LEFT_PAREN);
      this.CONSUME(NUMBER_LITERAL);
      this.OPTION2(() => {
        this.CONSUME(COMMA);
        this.CONSUME2(NUMBER_LITERAL);
      });
      this.CONSUME(RIGHT_PAREN);
    });
  });

  /**
   * Parse expression
   */
  public expression = this.RULE('expression', () => {
    this.SUBRULE(this.orExpression);
  });

  /**
   * Parse OR expression
   */
  public orExpression = this.RULE('orExpression', () => {
    this.SUBRULE(this.andExpression);
    this.MANY(() => {
      this.CONSUME(OR);
      this.SUBRULE2(this.andExpression);
    });
  });

  /**
   * Parse AND expression
   */
  public andExpression = this.RULE('andExpression', () => {
    this.SUBRULE(this.comparisonExpression);
    this.MANY(() => {
      this.CONSUME(AND);
      this.SUBRULE2(this.comparisonExpression);
    });
  });

    /**
   * Parse comparison expression
   */
  public comparisonExpression = this.RULE('comparisonExpression', () => {
    this.SUBRULE(this.additiveExpression);
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(EQUALS) },
        { ALT: () => this.CONSUME(NOT_EQUALS) },
        { ALT: () => this.CONSUME(LESS_THAN) },
        { ALT: () => this.CONSUME(GREATER_THAN) },
        { ALT: () => this.CONSUME(LESS_EQUAL) },
        { ALT: () => this.CONSUME(GREATER_EQUAL) },
        { ALT: () => this.CONSUME(LIKE) },
        { ALT: () => {
          this.CONSUME(NOT);
          this.CONSUME2(LIKE);
        }},
        { ALT: () => this.CONSUME(IN) },
        { ALT: () => {
          this.CONSUME2(NOT);
          this.CONSUME2(IN);
        }},
        { ALT: () => this.CONSUME(IS) },
        { ALT: () => {
          this.CONSUME3(NOT);
          this.CONSUME(NULL);
        }}
      ]);
      this.SUBRULE2(this.additiveExpression);
    });
  });

  /**
   * Parse additive expression
   */
  public additiveExpression = this.RULE('additiveExpression', () => {
    this.SUBRULE(this.multiplicativeExpression);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(PLUS) },
        { ALT: () => this.CONSUME(MINUS) }
      ]);
      this.SUBRULE2(this.multiplicativeExpression);
    });
  });

  /**
   * Parse multiplicative expression
   */
  public multiplicativeExpression = this.RULE('multiplicativeExpression', () => {
    this.SUBRULE(this.primaryExpression);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(MULTIPLY) },
        { ALT: () => this.CONSUME(DIVIDE) },
        { ALT: () => this.CONSUME(MODULO) }
      ]);
      this.SUBRULE2(this.primaryExpression);
    });
  });

  /**
   * Parse primary expression
   */
  public primaryExpression = this.RULE('primaryExpression', () => {
    this.OR([
      { ALT: () => this.CONSUME(NUMBER_LITERAL) },
      { ALT: () => this.CONSUME(STRING_LITERAL) },
      { ALT: () => this.CONSUME(PARAMETER) },
      { ALT: () => this.CONSUME(NULL) },
      { ALT: () => this.CONSUME(MULTIPLY) }, // Handle wildcard *
      { ALT: () => this.SUBRULE(this.functionCall) },
      { ALT: () => this.SUBRULE(this.columnReference) },
      { ALT: () => this.SUBRULE(this.existsExpression) },
      {
        ALT: () => {
          this.CONSUME(LEFT_PAREN);
          this.OR2([
            { ALT: () => this.SUBRULE(this.expression) },
            { ALT: () => this.SUBRULE(this.selectStatement) }
          ]);
          this.CONSUME(RIGHT_PAREN);
        }
      }
    ]);
  });

  /**
   * Parse function call
   */
  public functionCall = this.RULE('functionCall', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.castFunction) },
      { ALT: () => this.SUBRULE(this.convertFunction) },
      { ALT: () => this.SUBRULE(this.regularFunction) }
    ]);
  });

  /**
   * Parse CAST function: CAST(expression AS datatype)
   */
  public castFunction = this.RULE('castFunction', () => {
    this.CONSUME(CAST);
    this.CONSUME(LEFT_PAREN);
    this.SUBRULE(this.expression);
    this.CONSUME(AS);
    this.SUBRULE(this.dataType);
    this.CONSUME(RIGHT_PAREN);
  });

  /**
   * Parse CONVERT function: CONVERT(datatype, expression)
   */
  public convertFunction = this.RULE('convertFunction', () => {
    this.CONSUME(CONVERT);
    this.CONSUME(LEFT_PAREN);
    this.SUBRULE(this.dataType);
    this.CONSUME(COMMA);
    this.SUBRULE(this.expression);
    this.CONSUME(RIGHT_PAREN);
  });

  /**
   * Parse regular function call
   */
  public regularFunction = this.RULE('regularFunction', () => {
    this.SUBRULE(this.identifier);
    this.CONSUME(LEFT_PAREN);
    
    this.OPTION(() => {
      this.SUBRULE(this.expression);
      this.MANY(() => {
        this.CONSUME(COMMA);
        this.SUBRULE2(this.expression);
      });
    });
    
    this.CONSUME(RIGHT_PAREN);
  });

  /**
   * Parse column reference
   */
  public columnReference = this.RULE('columnReference', () => {
    this.SUBRULE(this.identifier);
    this.OPTION(() => {
      this.CONSUME(DOT);
      this.SUBRULE2(this.identifier);
      this.OPTION2(() => {
        this.CONSUME2(DOT);
        this.SUBRULE3(this.identifier);
      });
    });
  });

  /**
   * Parse EXISTS expression
   */
  public existsExpression = this.RULE('existsExpression', () => {
    this.OPTION(() => {
      this.CONSUME(NOT);
    });
    this.CONSUME(EXISTS);
    this.CONSUME(LEFT_PAREN);
    this.SUBRULE(this.selectStatement);
    this.CONSUME(RIGHT_PAREN);
  });

  /**
   * Parse column list
   */
  public columnList = this.RULE('columnList', () => {
    this.SUBRULE(this.identifier);
    this.MANY(() => {
      this.CONSUME(COMMA);
      this.SUBRULE2(this.identifier);
    });
  });

  /**
   * Parse identifier
   */
  public identifier = this.RULE('identifier', () => {
    this.OR([
      { ALT: () => this.CONSUME(IDENTIFIER) },
      { ALT: () => this.CONSUME(BRACKETED_IDENTIFIER) },
      { ALT: () => this.CONSUME(ISNULL) }
    ]);
  });
}
