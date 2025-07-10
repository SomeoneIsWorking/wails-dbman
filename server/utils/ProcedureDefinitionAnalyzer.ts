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
           }
         }
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
      case 'ISNULL':
      case 'CONCAT':
      case 'SUBSTRING':
      case 'LTRIM':
      case 'RTRIM':
      case 'TRIM':
        return { dataType: 'varchar', isNullable: true, maxLength: 255 }
      case 'LEN':
      case 'CHARINDEX':
        return { dataType: 'int', isNullable: true }
      case 'GETDATE':
      case 'SYSDATETIME':
        return { dataType: 'datetime', isNullable: false }
      default:
        return { dataType: 'varchar', isNullable: true, maxLength: 255 }
    }
  }

  private parseCastExpression(expression: string): {
    dataType: string
    isNullable: boolean
    maxLength?: number
    precision?: number
    scale?: number
  } {
    // This would parse the CAST expression from the AST
    // For now, simple string matching as a fallback
    const expr = expression.toLowerCase()
    if (expr.includes('float')) {
      return { dataType: 'float', isNullable: true }
    } else if (expr.includes('int')) {
      return { dataType: 'int', isNullable: true }
    } else if (expr.includes('varchar')) {
      return { dataType: 'varchar', isNullable: true, maxLength: 255 }
    } else if (expr.includes('decimal')) {
      return { dataType: 'decimal', isNullable: true, precision: 18, scale: 2 }
    }
    return { dataType: 'varchar', isNullable: true, maxLength: 255 }
  }

  private parseConvertExpression(expression: string): {
    dataType: string
    isNullable: boolean
    maxLength?: number
    precision?: number
    scale?: number
  } {
    // Similar to CAST parsing
    return this.parseCastExpression(expression)
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