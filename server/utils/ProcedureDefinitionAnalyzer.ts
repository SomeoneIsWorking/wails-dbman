import { SqlAnalyzer } from './sql-parser/analyzer/SqlAnalyzer'
import type { TableInfoAccessor, ColumnInfo, TableIdentifier } from '~/types/schema'

export interface DefinitionAnalysisResult {
  resultSets: ResultSet[]
  totalConfidence: number
  warnings: string[]
}

export interface ResultSet {
  columns: Column[]
}

export interface Column {
  name: string
  dataType: string
  isNullable: boolean
  maxLength?: number
  precision?: number
  scale?: number
}

export class ProcedureDefinitionAnalyzer {
  private tableAccessor: TableInfoAccessor
  private sqlAnalyzer: SqlAnalyzer

  constructor(tableAccessor: TableInfoAccessor) {
    this.tableAccessor = tableAccessor
    this.sqlAnalyzer = new SqlAnalyzer()
  }

  async analyzeProcedure(schema: string, procedureName: string, database: string, procedureDefinition?: string): Promise<DefinitionAnalysisResult> {
    try {
      // Use provided definition
      const definition = procedureDefinition
      
      if (!definition) {
        return {
          resultSets: [],
          totalConfidence: 0,
          warnings: ['Procedure definition not found']
        }
      }

      // Use SqlAnalyzer to parse the procedure
      const analysisResult = this.sqlAnalyzer.analyzeProcedure(definition)
      
      if (!analysisResult.success) {
        return {
          resultSets: [],
          totalConfidence: 0,
          warnings: analysisResult.warnings
        }
      }

      // Collect all table references from all SELECT statements first
      const allTableReferences = new Set<string>()
      const allTableAliasMap = new Map<string, string>()
      
      for (const selectStmt of analysisResult.selectStatements) {
        const tableAliasMap = this.buildTableAliasMap(selectStmt)
        
        // Merge alias maps and collect actual table names
        for (const [alias, actualTable] of tableAliasMap) {
          allTableAliasMap.set(alias, actualTable)
          allTableReferences.add(actualTable)
        }
        
        // Also collect direct table references (without aliases)
        this.collectDirectTableReferences(selectStmt, allTableReferences)
      }

      // Fetch all table column information in bulk
      const bulkTableInfo = await this.fetchTableColumnsBulk(Array.from(allTableReferences))

      // Extract result sets from the SELECT statements using cached table info
      const resultSets: ResultSet[] = []
      const warnings: string[] = [...analysisResult.warnings]

      for (const selectStmt of analysisResult.selectStatements) {
        try {
          const columns = await this.extractColumnsFromSelectStatement(selectStmt, allTableAliasMap, bulkTableInfo)
          resultSets.push({ columns })
        } catch (error) {
          warnings.push(`Failed to analyze SELECT statement: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        resultSets,
        totalConfidence: resultSets.length > 0 ? 0.9 : 0.1, // High confidence if we found result sets
        warnings
      }
    } catch (error) {
      return {
        resultSets: [],
        totalConfidence: 0,
        warnings: [`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }



  private async extractColumnsFromSelectStatement(
    selectStmt: any, 
    tableAliasMap: Map<string, string>, 
    bulkTableInfo: Map<string, ColumnInfo[]>
  ): Promise<Column[]> {
    // Find the select_clause node in the AST
    const selectClause = selectStmt.children?.find((child: any) => child.nodeType === 'select_clause')
    
    if (!selectClause || !selectClause.children) {
      return []
    }

    const columns: Column[] = []

    for (const columnNode of selectClause.children) {
      if (columnNode.nodeType === 'column_reference' && columnNode.metadata) {
        const column = await this.analyzeColumnReference(columnNode.metadata, selectStmt, tableAliasMap, bulkTableInfo)
        columns.push(column)
      }
    }

    return columns
  }

  private async analyzeColumnReference(
    metadata: any, 
    selectStmt: any, 
    tableAliasMap: Map<string, string> = new Map(), 
    bulkTableInfo?: Map<string, ColumnInfo[]>
  ): Promise<Column> {
    const {
      columnName,
      tableName,
      schemaName,
      alias,
      isFunction,
      functionName,
      expression
    } = metadata

    // Use alias if available, otherwise use column name
    const finalColumnName = alias || columnName || 'unknown'

    // Determine data type
    let dataType = 'varchar' // Default fallback
    let isNullable = true
    let maxLength: number | undefined
    let precision: number | undefined
    let scale: number | undefined

    if (isFunction) {
      // Analyze function return type
      const functionResult = this.analyzeFunctionReturnType(functionName, expression)
      dataType = functionResult.dataType
      isNullable = functionResult.isNullable
      maxLength = functionResult.maxLength
      precision = functionResult.precision
      scale = functionResult.scale
    } else if (tableName) {
      // Resolve table alias to actual table name
      const actualTableName = tableAliasMap.get(tableName) || tableName
      
      // Look up column information from bulk table metadata
      if (bulkTableInfo) {
        const tableColumnInfo = this.getTableColumnInfoFromBulk(actualTableName, columnName, bulkTableInfo)
        
        if (tableColumnInfo) {
          dataType = tableColumnInfo.dataType
          isNullable = tableColumnInfo.isNullable
          maxLength = tableColumnInfo.maxLength
          precision = tableColumnInfo.precision
          scale = tableColumnInfo.scale
        } else {
          // Fallback: try to infer type from column name and context
          const inferredType = this.inferDataTypeFromColumnName(finalColumnName)
          dataType = inferredType.dataType
          isNullable = inferredType.isNullable
          maxLength = inferredType.maxLength
          precision = inferredType.precision
          scale = inferredType.scale
        }
      } else {
        // No table info available, try to infer from column name
        const inferredType = this.inferDataTypeFromColumnName(finalColumnName)
        dataType = inferredType.dataType
        isNullable = inferredType.isNullable
        maxLength = inferredType.maxLength
        precision = inferredType.precision
        scale = inferredType.scale
      }
    } else {
      // No table name, try to infer from column name and expression
      const inferredType = this.inferDataTypeFromColumnName(finalColumnName)
      dataType = inferredType.dataType
      isNullable = inferredType.isNullable
      maxLength = inferredType.maxLength
      precision = inferredType.precision
      scale = inferredType.scale
    }

    return {
      name: finalColumnName,
      dataType,
      isNullable,
      maxLength,
      precision,
      scale
    }
  }

  /**
   * Parse CAST expression to determine target type
   */
  private parseCastExpression(expression: string): {
    dataType: string
    isNullable: boolean
    maxLength?: number
    precision?: number
    scale?: number
  } {
    const castMatch = expression.match(/CAST\s*\(.*AS\s+(\w+)(?:\s*\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\))?\s*\)/i)
    if (castMatch) {
      const targetType = castMatch[1].toLowerCase()
      const length = castMatch[2] ? parseInt(castMatch[2]) : undefined
      const scale = castMatch[3] ? parseInt(castMatch[3]) : undefined
      
      switch (targetType) {
        case 'int':
        case 'integer':
          return { dataType: 'int', isNullable: true }
        case 'float':
        case 'real':
          return { dataType: 'decimal', isNullable: true, precision: 18, scale: 2 }
        case 'decimal':
        case 'numeric':
          return { dataType: 'decimal', isNullable: true, precision: length || 18, scale: scale || 2 }
        case 'varchar':
        case 'nvarchar':
          return { dataType: 'varchar', isNullable: true, maxLength: length || 255 }
        case 'char':
        case 'nchar':
          return { dataType: 'char', isNullable: true, maxLength: length || 10 }
        case 'datetime':
        case 'date':
        case 'time':
          return { dataType: 'datetime', isNullable: true }
        case 'bit':
          return { dataType: 'bit', isNullable: true }
        default:
          return { dataType: 'varchar', isNullable: true, maxLength: 255 }
      }
    }
    return { dataType: 'varchar', isNullable: true, maxLength: 255 }
  }

  /**
   * Parse CONVERT expression to determine target type
   */
  private parseConvertExpression(expression: string): {
    dataType: string
    isNullable: boolean
    maxLength?: number
    precision?: number
    scale?: number
  } {
    const convertMatch = expression.match(/CONVERT\s*\(\s*(\w+)(?:\s*\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\))?\s*,/i)
    if (convertMatch) {
      const targetType = convertMatch[1].toLowerCase()
      const length = convertMatch[2] ? parseInt(convertMatch[2]) : undefined
      const scale = convertMatch[3] ? parseInt(convertMatch[3]) : undefined
      
      switch (targetType) {
        case 'int':
        case 'integer':
          return { dataType: 'int', isNullable: true }
        case 'float':
        case 'real':
          return { dataType: 'decimal', isNullable: true, precision: 18, scale: 2 }
        case 'decimal':
        case 'numeric':
          return { dataType: 'decimal', isNullable: true, precision: length || 18, scale: scale || 2 }
        case 'varchar':
        case 'nvarchar':
          return { dataType: 'varchar', isNullable: true, maxLength: length || 255 }
        case 'char':
        case 'nchar':
          return { dataType: 'char', isNullable: true, maxLength: length || 10 }
        case 'datetime':
        case 'date':
        case 'time':
          return { dataType: 'datetime', isNullable: true }
        case 'bit':
          return { dataType: 'bit', isNullable: true }
        default:
          return { dataType: 'varchar', isNullable: true, maxLength: 255 }
      }
    }
    return { dataType: 'varchar', isNullable: true, maxLength: 255 }
  }

  private analyzeFunctionReturnType(functionName: string, expression: string): {
    dataType: string
    isNullable: boolean
    maxLength?: number
    precision?: number
    scale?: number
  } {
    const funcName = functionName?.toUpperCase()
    
    switch (funcName) {
      case 'COUNT':
        return { dataType: 'int', isNullable: false }
      case 'SUM':
      case 'AVG':
        return { dataType: 'decimal', isNullable: true, precision: 38, scale: 2 }
      case 'MIN':
      case 'MAX':
        // These return the same type as their input - would need deeper analysis
        return { dataType: 'varchar', isNullable: true, maxLength: 255 }
      case 'CAST':
        // Parse CAST expression to determine target type
        const castType = this.parseCastExpression(expression)
        return castType
      case 'CONVERT':
        // Similar to CAST
        const convertType = this.parseConvertExpression(expression)
        return convertType
      case 'REPLACE':
      case 'CONCAT':
      case 'SUBSTRING':
      case 'LTRIM':
      case 'RTRIM':
      case 'TRIM':
        return { dataType: 'varchar', isNullable: true, maxLength: 255 }
      case 'ISNULL':
        // ISNULL typically returns the same type as the first non-null argument
        // For bet amounts, it's usually decimal
        if (expression && (expression.includes('Bet') || expression.includes('Amount'))) {
          return { dataType: 'decimal', isNullable: true, precision: 18, scale: 2 }
        }
        return { dataType: 'varchar', isNullable: true, maxLength: 255 }
      case 'LEN':
      case 'CHARINDEX':
        return { dataType: 'int', isNullable: true }
      case 'GETDATE':
      case 'SYSDATETIME':
        return { dataType: 'datetime', isNullable: false }
      default:
        // For unknown functions, try to infer from the expression
        return this.inferTypeFromExpression(expression)
    }
  }

  /**
   * Infer data type from expression content
   */
  private inferTypeFromExpression(expression: string): {
    dataType: string
    isNullable: boolean
    maxLength?: number
    precision?: number
    scale?: number
  } {
    if (!expression) {
      return { dataType: 'varchar', isNullable: true, maxLength: 255 }
    }
    
    const expr = expression.toLowerCase()
    
    // Check for arithmetic operations - usually result in numeric types
    if (expr.includes('/') || expr.includes('*') || expr.includes('+') || expr.includes('-')) {
      // If it involves CAST to FLOAT or contains bet/amount
      if (expr.includes('float') || expr.includes('bet') || expr.includes('amount')) {
        return { dataType: 'decimal', isNullable: true, precision: 18, scale: 2 }
      }
      return { dataType: 'int', isNullable: true }
    }
    
    // Check for string functions
    if (expr.includes('replace') || expr.includes('concat') || expr.includes('substring')) {
      return { dataType: 'varchar', isNullable: true, maxLength: 500 }
    }
    
    // Check for CAST operations
    if (expr.includes('cast')) {
      const castMatch = expr.match(/cast\s*\(.*as\s+(\w+)/i)
      if (castMatch) {
        const targetType = castMatch[1].toLowerCase()
        switch (targetType) {
          case 'int':
          case 'integer':
            return { dataType: 'int', isNullable: true }
          case 'float':
          case 'real':
          case 'decimal':
          case 'numeric':
            return { dataType: 'decimal', isNullable: true, precision: 18, scale: 2 }
          case 'varchar':
          case 'nvarchar':
          case 'char':
          case 'nchar':
            return { dataType: 'varchar', isNullable: true, maxLength: 255 }
          case 'datetime':
          case 'date':
          case 'time':
            return { dataType: 'datetime', isNullable: true }
          case 'bit':
            return { dataType: 'bit', isNullable: true }
        }
      }
    }
    
    return { dataType: 'varchar', isNullable: true, maxLength: 255 }
  }

  /**
   * Infer data type from column name patterns
   */
  private inferDataTypeFromColumnName(columnName: string): {
    dataType: string
    isNullable: boolean
    maxLength?: number
    precision?: number
    scale?: number
  } {
    const name = columnName.toLowerCase()
    
    // ID columns are typically integers
    if (name.includes('id') || name.endsWith('_id') || name.startsWith('id_')) {
      return { dataType: 'int', isNullable: true }
    }
    
    // Bet and amount columns are typically decimals
    if (name.includes('bet') || name.includes('amount') || name.includes('balance') || name.includes('price')) {
      return { dataType: 'decimal', isNullable: true, precision: 18, scale: 2 }
    }
    
    // Boolean-like columns are typically bit
    if (name.includes('active') || name.includes('enabled') || name.includes('visible') || 
        name.includes('flag') || name.includes('is_') || name.startsWith('is') ||
        name.includes('has_') || name.startsWith('has')) {
      return { dataType: 'bit', isNullable: true }
    }
    
    // Date/time columns
    if (name.includes('date') || name.includes('time') || name.includes('created') || 
        name.includes('modified') || name.includes('updated') || name.includes('deleted')) {
      return { dataType: 'datetime', isNullable: true }
    }
    
    // Path/URL columns are typically longer varchars
    if (name.includes('path') || name.includes('url') || name.includes('uri') || name.includes('link')) {
      return { dataType: 'varchar', isNullable: true, maxLength: 255 }
    }
    
    // Name columns are typically shorter varchars
    if (name.includes('name') || name.includes('title') || name.includes('label')) {
      return { dataType: 'varchar', isNullable: true, maxLength: 100 }
    }
    
    // Description columns are typically longer varchars
    if (name.includes('description') || name.includes('comment') || name.includes('notes') || name.includes('text')) {
      return { dataType: 'varchar', isNullable: true, maxLength: 500 }
    }
    
    // Default to varchar with reasonable length
    return { dataType: 'varchar', isNullable: true, maxLength: 255 }
  }



  private extractSchemaFromSelectStatement(selectStmt: any): string | null {
    // Look for FROM clause in the AST
    const fromClause = selectStmt.children?.find((child: any) => child.nodeType === 'from_clause')
    
    if (fromClause && fromClause.children) {
      // Look for table references with schema information
      for (const tableRef of fromClause.children) {
        if (tableRef.nodeType === 'table_reference' && tableRef.metadata?.schemaName) {
          return tableRef.metadata.schemaName
        }
      }
    }
    
    return null
  }

  private buildTableAliasMap(selectStmt: any): Map<string, string> {
    const aliasMap = new Map<string, string>()
    
    // Look for FROM clause in the AST
    const fromClause = selectStmt.children?.find((child: any) => child.nodeType === 'from_clause')
    
    if (fromClause && fromClause.children) {
      // Look for table references with alias information
      for (const tableRef of fromClause.children) {
        if (tableRef.nodeType === 'table_reference' && tableRef.metadata) {
          const tableName = tableRef.metadata.name || tableRef.metadata.fullName
          const alias = tableRef.metadata.alias
          
          if (alias && tableName) {
            // Map alias to actual table name
            aliasMap.set(alias, tableName)
          }
        }
      }
    }
    
    return aliasMap
  }

  private collectDirectTableReferences(selectStmt: any, tableReferences: Set<string>): void {
    // Look for FROM clause in the AST
    const fromClause = selectStmt.children?.find((child: any) => child.nodeType === 'from_clause')
    
    if (fromClause && fromClause.children) {
      // Look for table references
      for (const tableRef of fromClause.children) {
        if (tableRef.nodeType === 'table_reference' && tableRef.metadata) {
          const tableName = tableRef.metadata.name || tableRef.metadata.fullName
          if (tableName) {
            tableReferences.add(tableName)
          }
        }
      }
    }
  }

  private async fetchTableColumnsBulk(tableNames: string[]): Promise<Map<string, ColumnInfo[]>> {
    if (tableNames.length === 0) {
      return new Map()
    }

    // Parse schema.table format and group by schema
    const tableRequests: TableIdentifier[] = []
    
    for (const fullTableName of tableNames) {
      const parts = fullTableName.split('.')
      if (parts.length === 2) {
        tableRequests.push({
          schema: parts[0],
          tableName: parts[1]
        })
      } else {
        // Default to dbo schema if not specified
        tableRequests.push({
          schema: 'dbo',
          tableName: fullTableName
        })
      }
    }

    // Use bulk table accessor method
    const bulkResult = await this.tableAccessor.getMultipleTableColumns(tableRequests)
    
    // Convert keys back to full table names for easier lookup
    const result = new Map<string, ColumnInfo[]>()
    for (const [key, columns] of bulkResult) {
      result.set(key, columns)
    }
    
    return result
  }

  private getTableColumnInfoFromBulk(
    tableName: string, 
    columnName: string, 
    bulkTableInfo: Map<string, ColumnInfo[]>
  ): {
    dataType: string
    isNullable: boolean
    maxLength?: number
    precision?: number
    scale?: number
  } | null {
    // Try both formats: schema.table and just table
    const possibleKeys = [
      tableName,
      `dbo.${tableName}`,
      tableName.includes('.') ? tableName : `dbo.${tableName}`
    ]

    for (const key of possibleKeys) {
      const columns = bulkTableInfo.get(key)
      if (columns) {
        const column = columns.find(col => 
          col.name.toLowerCase() === columnName.toLowerCase()
        )
        
        if (column) {
          return {
            dataType: column.type,
            isNullable: column.nullable,
            maxLength: column.maxLength,
            precision: column.precision,
            scale: column.scale
          }
        }
      }
    }
    
    return null
  }
} 