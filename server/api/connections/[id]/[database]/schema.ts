import { AdapterFactory } from '~/server/adapters/AdapterFactory'
import type { ConnectionConfig } from '~/types/schema'
import { getCachedSchema, cacheSchema, getConnection } from '~/server/utils/cache'
import { defineEventHandler } from 'h3'
import { getAllLoadingStates } from '~/server/utils/loading-states'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  const database = event.context.params?.database
  
  if (!id || !database) {
    throw createError({
      statusCode: 400,
      message: 'Connection ID and database are required'
    })
  }

  const connection = await getConnection(id)

  if (!connection) {
    throw createError({
      statusCode: 404,
      message: 'Connection not found'
    })
  }

  // Get parameters from query
  const query = getQuery(event)
  const invalidate = query.invalidate === 'true'
  const retryFailed = query.retryFailed === 'true'

  // Check cache first if not invalidating
  if (!invalidate) {
    const cachedSchema = await getCachedSchema(id, database)
    if (cachedSchema) {
      // Get loading states (will auto-initialize if needed)
      const loadingStates = await getAllLoadingStates(id, database)
      
      return {
        ...cachedSchema,
        loadingStates
      }
    }
  }

  const config: ConnectionConfig = {
    host: connection.host,
    port: connection.port,
    username: connection.username,
    password: connection.password
  }

  try {
    const adapter = AdapterFactory.createAdapter(connection.type, config)
    const schema = await adapter.getSchema(database)
    
    // Cache the schema without procedure definitions
    await cacheSchema(id, database, schema)

    // Get loading states (will auto-initialize if needed)
    const loadingStates = await getAllLoadingStates(id, database)
    
    return {
      ...schema,
      loadingStates
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch schema: ${error.message}`
    })
  }
}) 