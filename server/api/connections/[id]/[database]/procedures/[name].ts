import { defineEventHandler, getQuery } from 'h3'
import { getCachedProcedure } from '~/server/utils/cache'
import { getLoadingState } from '~/server/utils/loading-states'
import { loadProcedure } from '~/server/utils/procedure-loader'
import type { ProcedureResponse, ProcedureState } from '~/types/procedure'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  const database = event.context.params?.database
  const name = event.context.params?.name
  const query = getQuery(event)
  const invalidate = query.invalidate === 'true'

  if (!id || !database || !name) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameters'
    })
  }

  // Split name into schema.procedureName
  const [schema, procedureName] = name.split('.')
  if (!schema || !procedureName) {
    throw createError({
      statusCode: 400,
      message: 'Invalid procedure name format. Expected: schema.name'
    })
  }

  // If invalidating, force reload
  if (invalidate) {
    try {
      await loadProcedure(id, database, schema, procedureName)
    } catch (error: any) {
      throw createError({
        statusCode: error.statusCode || 500,
        message: `Failed to get procedure details: ${error.message}`
      })
    }
  }

  // Check for cached data
  const cachedProcedure = await getCachedProcedure(id, database, schema, procedureName)
  
  if (cachedProcedure) {
    // We have cached data
    let state: ProcedureState = 'loaded'
    let error: string | undefined = undefined
    
    if (cachedProcedure.failedToLoad) {
      state = 'partial'
      error = cachedProcedure.failureReason || 'Failed to load complete procedure details'
    }
    
    // Map the cached parameters to the expected format
    const mappedParameters = (cachedProcedure.parameters || []).map((param: any) => ({
      name: param.name,
      type: param.dataType || param.type || 'unknown',
      mode: param.direction || param.mode || 'IN',
      defaultValue: param.defaultValue
    }))

    // Map the cached result sets to the expected format
    const mappedResultSets = (cachedProcedure.resultSets || []).map((resultSet: any) => ({
      columns: (resultSet.columns || []).map((column: any) => ({
        name: column.name,
        type: column.dataType || column.type || 'unknown',
        nullable: column.isNullable !== false
      }))
    }))
    
    return {
      state,
      error,
      definition: cachedProcedure.definition,
      definitionReadError: (cachedProcedure as any).definitionReadError || 
        (cachedProcedure.failedToLoad && !cachedProcedure.definition ? 
          (cachedProcedure.failureReason || 'Failed to read procedure definition') : undefined),
      parameters: mappedParameters,
      parametersReadError: (cachedProcedure as any).parametersReadError,
      resultSets: mappedResultSets,
      resultSetsReadError: (cachedProcedure as any).resultSetsReadError,
      lastCached: cachedProcedure.updatedAt
    } satisfies ProcedureResponse
  }
  
  // Check current loading state
  const currentState = getLoadingState(id, database, schema, procedureName)
  
  if (currentState?.state === 'loading') {
    return {
      state: 'loading' as ProcedureState,
      error: currentState.error,
      definition: null,
      parameters: [],
      resultSets: [],
      lastCached: null
    } satisfies ProcedureResponse
  }

  if (currentState?.state === 'failed') {
    return {
      state: 'failed' as ProcedureState,
      error: currentState.error,
      definition: null,
      parameters: [],
      resultSets: [],
      lastCached: null
    } satisfies ProcedureResponse
  }
  
  // Not cached and not loading - trigger load in background
  loadProcedure(id, database, schema, procedureName).catch(error => {
    console.error(`Background loading failed for ${schema}.${procedureName}:`, error)
  })
  
  return {
    state: 'loading' as ProcedureState,
    definition: null,
    parameters: [],
    resultSets: [],
    lastCached: null
  } satisfies ProcedureResponse
})