import { ProcedureDefinitionAnalyzer, type DefinitionAnalysisResult } from './ProcedureDefinitionAnalyzer'
import { PrismaTableAccessor } from './prisma-table-accessor'
import { procedureLogger } from './logger'

export interface AnalysisOptions {
  context?: string
}

export async function analyzeResultSets(
  connectionId: string,
  database: string,
  schema: string,
  procedureName: string,
  definition: string,
  options: AnalysisOptions = {}
): Promise<DefinitionAnalysisResult> {
  const context = options.context || 'analysis'
  const logger = procedureLogger.child({ context, procedure: `${schema}.${procedureName}` })
  
  logger.info('Starting procedure result set analysis')
  
  const tableAccessor = new PrismaTableAccessor(connectionId, database)
  const definitionAnalyzer = new ProcedureDefinitionAnalyzer(tableAccessor)
  
  try {
    const analysisResult = await definitionAnalyzer.analyzeProcedure(schema, procedureName, database, definition)
    
    logger.info('Analysis completed', { 
      resultSetsCount: analysisResult.resultSets.length, 
      confidence: analysisResult.totalConfidence 
    })
    
    if (analysisResult.warnings.length > 0) {
      logger.warn('Analysis warnings detected', { warnings: analysisResult.warnings })
    }
    
    return analysisResult
  } finally {
    await tableAccessor.disconnect()
  }
} 