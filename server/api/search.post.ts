import { defineEventHandler, readBody } from 'h3'
import { getConnections, getCachedSchema } from '../utils/cache'
import * as fuzzball from 'fuzzball'

interface SearchResult {
  id: string
  name: string
  path: string
  type: 'table' | 'procedure'
  connectionId: string
  database: string
  schema?: string
  objectName?: string
}

// Fuzzy search function using fuzzball
export function fuzzyMatch(target: string, query: string): boolean {
  // Convert both strings to lowercase for case-insensitive comparison
  const targetLower = target.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Only match if the query is a substring of the target
  return targetLower.includes(queryLower);
}

function searchInSchema(
  connection: { id: string; name: string },
  database: string,
  schema: any,
  query: string,
  results: SearchResult[]
) {
  // Search tables
  for (const table of schema.tables) {
    const tablePath = `${connection.name}/${database}.${table.schema}.${table.name}`
    const tableFullName = `${table.schema}.${table.name}`
    
    // Check if table name matches using fuzzy search
    if (fuzzyMatch(table.name, query) || 
        fuzzyMatch(tableFullName, query) ||
        fuzzyMatch(tablePath, query)) {
      results.push({
        id: `table-${tablePath}`,
        name: table.name,
        path: tablePath,
        type: 'table',
        connectionId: connection.id,
        database,
        schema: table.schema,
        objectName: table.name
      })
    }


  }

  // Search stored procedures
  for (const proc of schema.storedProcedures) {
    const procPath = `${connection.name}/${database}.${proc.schema}.${proc.name}`
    const procFullName = `${proc.schema}.${proc.name}`
    
    if (fuzzyMatch(proc.name, query) || 
        fuzzyMatch(procFullName, query) ||
        fuzzyMatch(procPath, query)) {
      results.push({
        id: `proc-${procPath}`,
        name: proc.name,
        path: procPath,
        type: 'procedure',
        connectionId: connection.id,
        database,
        schema: proc.schema,
        objectName: proc.name
      })
    }
  }
}

export default defineEventHandler(async (event) => {
  const { query, connectionId, database } = await readBody(event)
  const connections = await getConnections()
  const results: SearchResult[] = []

  // If connectionId and database are provided, only search in that specific database
  if (connectionId && database) {
    const connection = connections.find(c => c.id === connectionId)
    if (!connection) return results

    const schema = await getCachedSchema(connectionId, database)
    if (!schema) return results
    
    searchInSchema(connection, database, schema, query, results)
  } else {
    // Search across all connections
    for (const connection of connections) {
      const databases = await $fetch(`/api/connections/${connection.id}/databases`)
      
      for (const database of databases) {
        const schema = await getCachedSchema(connection.id, database)
        if (!schema) continue
        
        searchInSchema(connection, database, schema, query, results)
      }
    }
  }

  // Sort results by relevance using fuzzball ratio
  results.sort((a, b) => {
    const aRatio = Math.max(
      fuzzball.ratio(a.path.toLowerCase(), query.toLowerCase()),
      fuzzball.ratio(a.name.toLowerCase(), query.toLowerCase())
    )
    const bRatio = Math.max(
      fuzzball.ratio(b.path.toLowerCase(), query.toLowerCase()),
      fuzzball.ratio(b.name.toLowerCase(), query.toLowerCase())
    )
    return bRatio - aRatio
  })

  return results
}) 