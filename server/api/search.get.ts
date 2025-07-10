import { defineEventHandler, getQuery } from 'h3'
import { getCachedSchema } from '~/server/utils/cache'
import type { StoredProcedureParameter, StoredProcedureResultSet, ColumnInfo } from '~/types/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const searchTerm = query.q as string

  if (!searchTerm) {
    return []
  }

  const results = []
  const connections = await $fetch('/api/connections')
  
  for (const connection of connections) {
    const databases = await $fetch(`/api/connections/${connection.id}/databases`)
    
    for (const database of databases) {
      const schema = await getCachedSchema(connection.id, database)
      if (!schema) continue

      // Search only within stored procedure definitions
      if (schema.storedProcedures) {
        for (const proc of schema.storedProcedures) {
          if (!proc.definition) continue
          
          const definition = proc.definition.toLowerCase()
          const searchTermLower = searchTerm.toLowerCase()

          if (definition.includes(searchTermLower)) {
            // Find the context around the match for display
            const matchIndex = definition.indexOf(searchTermLower)
            const contextStart = Math.max(0, matchIndex - 50)
            const contextEnd = Math.min(definition.length, matchIndex + searchTermLower.length + 50)
            const matchedText = proc.definition.substring(contextStart, contextEnd)

            results.push({
              type: 'procedure',
              connectionId: connection.id,
              connectionName: connection.name,
              database,
              schema: proc.schema,
              name: `${proc.schema}.${proc.name}`,
              definition: proc.definition,
              matchedText: matchedText
            })
          }
        }
      }
    }
  }

  return results
}) 