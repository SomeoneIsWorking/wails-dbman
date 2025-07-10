import { AdapterFactory } from '~/server/adapters/AdapterFactory'
import { getConnection, getCachedSchema } from '~/server/utils/cache'
import { startBackgroundLoading } from '~/server/utils/background-loader'
import { defineEventHandler } from 'h3'

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

  try {
    // Get cached schema first
    const cachedSchema = await getCachedSchema(id, database)
    if (!cachedSchema) {
      throw createError({
        statusCode: 404,
        message: 'Schema not found. Fetch schema first.'
      })
    }

    const adapter = AdapterFactory.createAdapter(connection.type, {
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.password
    })

    // Start background loading
    await startBackgroundLoading(id, database, adapter, cachedSchema)

    return { success: true, message: 'Background loading started' }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to start background loading: ${error.message}`
    })
  }
}) 