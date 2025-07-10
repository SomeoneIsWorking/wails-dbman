import { AdapterFactory } from '../../../../../adapters/AdapterFactory'
import { getCachedSchema, cacheSchema } from '~/server/utils/cache'
import { validateRouteParams, validateSchemaName, createConnectionConfig, wrapApiError, PARAM_PATTERNS } from '~/server/utils/api-helpers'

export default defineEventHandler(async (event) => {
  return wrapApiError(async () => {
    // Validate parameters
    const { id, database, name } = validateRouteParams(event, PARAM_PATTERNS.CONNECTION_DATABASE_OBJECT)
    const { schema, objectName: tableName } = validateSchemaName(name, 'table')

    // Get query parameters
    const query = getQuery(event)
    const refresh = query.refresh === 'true'

    // Check cache first if not refreshing
    if (!refresh) {
      const cachedSchema = await getCachedSchema(id, database)
      if (cachedSchema) {
        console.log('[TableSchemaAPI] Found cached schema')
        const tableInfo = cachedSchema.tables.find((t: any) => t.schema === schema && t.name === tableName)
        if (tableInfo) {
          console.log('[TableSchemaAPI] Found table in cache with columns:', tableInfo.columns.length)
          return tableInfo
        }
      }
    }

    // Create connection config
    const { connection, config } = await createConnectionConfig(id)
    console.log('[TableSchemaAPI] Found connection:', connection ? { ...connection, password: '***' } : null)

    console.log('[TableSchemaAPI] Creating adapter for type:', connection.type)
    const adapter = AdapterFactory.createAdapter(connection.type, config)
    const schemaInfo = await adapter.getSchema(database)
    
    // Cache the schema
    await cacheSchema(id, database, schemaInfo)
    
    // Find the specific table
    const tableInfo = schemaInfo.tables.find((t: any) => t.schema === schema && t.name === tableName)
    
    if (!tableInfo) {
      throw createError({
        statusCode: 404,
        message: `Table ${schema}.${tableName} not found in database ${database}`
      })
    }
    
    console.log('[TableSchemaAPI] Found table with columns:', tableInfo.columns.length)
    return tableInfo
  }, 'fetch table schema')
}) 