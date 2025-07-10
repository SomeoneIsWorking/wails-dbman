import { AdapterFactory } from '~/server/adapters/AdapterFactory'
import { getConnections, storeProcedureDefinition } from '~/server/utils/cache'
import { getLoadingState, setLoadingState, setLoadedState, setFailedState } from '~/server/utils/loading-states'
import { analyzeResultSets } from './procedure-analysis'
import { loaderLogger } from './logger'

export async function loadProcedure(
  connectionId: string,
  database: string,
  schema: string,
  procedureName: string
): Promise<void> {
  // Check if already loading to prevent concurrent loads
  const currentState = getLoadingState(connectionId, database, schema, procedureName)
  if (currentState?.state === 'loading') {
    return // Already loading, don't start another load
  }

  try {
    setLoadingState(connectionId, database, schema, procedureName)

    // Get connection details
    const connections = await getConnections()
    const connection = connections.find(c => c.id === connectionId)
    
    if (!connection) {
      setFailedState(connectionId, database, schema, procedureName, 'Connection not found')
      throw new Error('Connection not found')
    }

    // Create adapter and get procedure details
    const adapter = AdapterFactory.createAdapter(connection.type, {
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.password
    })

    const details = await adapter.getProcedureDetails(database, schema, procedureName)

    // Analyze result sets using the procedure definition analyzer
    let resultSets = details.resultSets
    if (details.definition) {
      try {
        const analysisResult = await analyzeResultSets(
          connectionId,
          database,
          schema,
          procedureName,
          details.definition,
          { context: 'ProcedureLoader' }
        )
        // Convert DefinitionAnalysisResult to StoredProcedureResultSet format
        resultSets = analysisResult.resultSets.map(rs => ({
          columns: rs.columns.map(col => ({
            name: col.name,
            type: col.dataType,
            nullable: col.isNullable,
            maxLength: col.maxLength,
            precision: col.precision,
            scale: col.scale
          }))
        }))
      } catch (analysisError: any) {
        loaderLogger.error('Result set analysis failed', { 
          error: analysisError.message,
          schema,
          procedureName
        })
        // Keep the original empty result sets from adapter
      }
    }

    // Store the procedure details in cache
    await storeProcedureDefinition(
      connectionId,
      database,
      schema,
      procedureName,
      details.definition,
      details.parameters,
      resultSets
    )

    // Mark as loaded
    setLoadedState(connectionId, database, schema, procedureName)
  } catch (error: any) {
    loaderLogger.error('Error loading procedure', { 
      error: error.message,
      schema,
      procedureName,
      connectionId,
      database
    })
    setFailedState(connectionId, database, schema, procedureName, error.message)
    throw error
  }
} 