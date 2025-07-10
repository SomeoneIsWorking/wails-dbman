import { defineEventHandler, readBody } from 'h3'
import { SqlAnalyzer } from '~/server/utils/sql-parser/analyzer/SqlAnalyzer'
import type { ProcedureAnalysisResult } from '~/server/utils/sql-parser/types/parser'
import type { ValidationError, ValidationResult } from '~/types/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { sql, connectionId, database } = body

  if (!sql || typeof sql !== 'string') {
    return {
      isValid: false,
      errors: [{ message: 'No SQL content provided', severity: 'error' as const }]
    }
  }

  try {
    const sqlAnalyzer = new SqlAnalyzer()
    
    // First, try to parse the SQL with our lexer/parser
    const parseResult = sqlAnalyzer.parseStatements(sql)
    
    if (!parseResult.success) {
      // Convert parse errors to ValidationError format
      const errors: ValidationError[] = parseResult.errors.map(error => ({
        message: error.message,
        line: error.line,
        column: error.column,
        severity: error.severity
      }))

      return {
        isValid: false,
        errors,
        warnings: parseResult.warnings
      }
    }

    // If parsing succeeded, try procedure analysis for more detailed validation
    try {
      const analysisResult: ProcedureAnalysisResult = sqlAnalyzer.analyzeProcedure(sql)
      
      if (analysisResult.success) {
        return {
          isValid: true,
          errors: [],
          warnings: analysisResult.warnings || []
        }
      } else {
        // Analysis failed but parsing succeeded - return warnings
        return {
          isValid: true,
          errors: [],
          warnings: analysisResult.warnings || ['SQL syntax appears valid but analysis encountered issues']
        }
      }
    } catch (analysisError) {
      // Analysis failed but parsing succeeded
      console.warn('SQL analysis failed but parsing succeeded:', analysisError)
      return {
        isValid: true,
        errors: [],
        warnings: ['SQL syntax appears valid but detailed analysis failed']
      }
    }

  } catch (error) {
    console.error('SQL validation error:', error)
    
    // Try to extract meaningful error information
    let errorMessage = 'Unknown SQL validation error'
    let line: number | undefined
    let column: number | undefined

    if (error instanceof Error) {
      errorMessage = error.message
      
      // Try to extract line/column info from error message if available
      const lineMatch = error.message.match(/line (\d+)/i)
      const columnMatch = error.message.match(/column (\d+)/i)
      
      if (lineMatch) line = parseInt(lineMatch[1])
      if (columnMatch) column = parseInt(columnMatch[1])
    }

    return {
      isValid: false,
      errors: [{
        message: errorMessage,
        line,
        column,
        severity: 'error' as const
      }],
      warnings: []
    }
  }
}) 