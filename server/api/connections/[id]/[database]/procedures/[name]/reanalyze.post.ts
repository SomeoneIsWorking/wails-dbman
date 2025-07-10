import { defineEventHandler } from 'h3'
import { getCachedProcedure, storeProcedureDefinition } from '~/server/utils/cache'
import { analyzeResultSets } from '~/server/utils/procedure-analysis'
import { reanalyzeLogger } from '~/server/utils/logger'
import { validateRouteParams, validateSchemaName, wrapApiError, PARAM_PATTERNS } from '~/server/utils/api-helpers'

export default defineEventHandler(async (event) => {
  return wrapApiError(async () => {
    // Validate parameters
    const { id, database, name } = validateRouteParams(event, PARAM_PATTERNS.CONNECTION_DATABASE_OBJECT)
    const { schema, objectName: procedureName } = validateSchemaName(name, 'procedure')

    // Get cached procedure to access the definition
    const cachedProcedure = await getCachedProcedure(id, database, schema, procedureName)
    
    if (!cachedProcedure) {
      throw createError({
        statusCode: 404,
        message: 'Procedure not found in cache. Please load the procedure first.'
      })
    }

    if (!cachedProcedure.definition) {
      throw createError({
        statusCode: 400,
        message: 'Procedure definition not available. Cannot reanalyze result sets.'
      })
    }

    // Analyze result sets using the cached definition
    const analysisResult = await analyzeResultSets(
      id,
      database,
      schema,
      procedureName,
      cachedProcedure.definition,
      { context: 'ReanalyzeAPI' }
    )

    // Update the cached procedure with new result sets
    await storeProcedureDefinition(
      id,
      database,
      schema,
      procedureName,
      cachedProcedure.definition,
      cachedProcedure.parameters,
      analysisResult.resultSets
    )

    return {
      success: true,
      message: 'Result sets reanalyzed successfully',
      resultSets: analysisResult.resultSets,
      confidence: analysisResult.totalConfidence,
      warnings: analysisResult.warnings
    }
  }, 'reanalyze result sets')
}) 