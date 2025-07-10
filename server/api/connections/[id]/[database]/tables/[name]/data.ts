import { AdapterFactory } from '../../../../../../adapters/AdapterFactory'
import { validateRouteParams, validateSchemaName, createConnectionConfig, wrapApiError, PARAM_PATTERNS } from '~/server/utils/api-helpers'

export default defineEventHandler(async (event) => {
  return wrapApiError(async () => {
    // Validate parameters
    const { id, database, name } = validateRouteParams(event, PARAM_PATTERNS.CONNECTION_DATABASE_OBJECT)
    const { schema, objectName: tableName } = validateSchemaName(name, 'table')
    
    // Get query parameters
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 50

    // Create connection config
    const { connection, config } = await createConnectionConfig(id)
    
    // Create adapter and get table data
    const adapter = AdapterFactory.createAdapter(connection.type, config)
    return await adapter.getTableData(database, schema, tableName, { page, limit })
  }, 'get table data')
}) 