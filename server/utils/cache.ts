import { PrismaClient } from '~/generated/prisma'
import { v4 as uuidv4 } from 'uuid'
import type { SchemaInfo } from '~/types/schema'

let prisma: PrismaClient

// Initialize Prisma client (singleton pattern)
function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

// Connection management functions
export async function getConnections(): Promise<any[]> {
  const client = getPrismaClient()
  try {
    const connections = await client.connection.findMany({
      orderBy: { updatedAt: 'desc' }
    })
    return connections
  } catch (error) {
    console.error('Error reading connections:', error)
    return []
  }
}

export async function saveConnections(connections: any[]): Promise<void> {
  // This function is deprecated in the new implementation
  // Individual connection operations should be used instead
  console.warn('saveConnections is deprecated, use individual connection operations')
}

export async function getConnection(id: string): Promise<any | null> {
  const client = getPrismaClient()
  try {
    const connection = await client.connection.findUnique({
      where: { id }
    })
    return connection
  } catch (error) {
    console.error('Error reading connection:', error)
    return null
  }
}

export async function createConnection(data: any): Promise<any> {
  const client = getPrismaClient()
  try {
    const newConnection = await client.connection.create({
      data: {
        ...data,
        id: uuidv4()
      }
    })
    return newConnection
  } catch (error) {
    console.error('Error creating connection:', error)
    throw error
  }
}

export async function updateConnection(id: string, data: any): Promise<any | null> {
  const client = getPrismaClient()
  try {
    const updatedConnection = await client.connection.update({
      where: { id },
      data
    })
    return updatedConnection
  } catch (error) {
    console.error('Error updating connection:', error)
    return null
  }
}

export async function deleteConnection(id: string): Promise<boolean> {
  const client = getPrismaClient()
  try {
    await client.connection.delete({
      where: { id }
    })
    return true
  } catch (error) {
    console.error('Error deleting connection:', error)
    return false
  }
}

// Query history functions
export async function saveQueryHistory(connectionId: string, query: string, result?: any, error?: string): Promise<void> {
  const client = getPrismaClient()
  try {
    await client.queryHistory.create({
      data: {
        id: uuidv4(),
        connectionId,
        query,
        result: result ? JSON.stringify(result) : undefined,
        error
      }
    })

    // Keep only last 100 queries per connection
    const totalCount = await client.queryHistory.count({
      where: { connectionId }
    })

    if (totalCount > 100) {
      const oldQueries = await client.queryHistory.findMany({
        where: { connectionId },
        orderBy: { executedAt: 'asc' },
        take: totalCount - 100
      })

      await client.queryHistory.deleteMany({
        where: {
          id: {
            in: oldQueries.map(q => q.id)
          }
        }
      })
    }
  } catch (error) {
    console.error('Error saving query history:', error)
  }
}

// Cache database list
export async function cacheDatabases(connectionId: string, databases: string[]): Promise<void> {
  const client = getPrismaClient()
  try {
    // Remove existing cached databases for this connection
    await client.cachedDatabase.deleteMany({
      where: { connectionId }
    })

    // Add new databases
    await client.cachedDatabase.createMany({
      data: databases.map(name => ({
        id: uuidv4(),
        connectionId,
        name
      }))
    })
  } catch (error) {
    console.error('Error caching databases:', error)
  }
}

// Get cached databases
export async function getCachedDatabases(connectionId: string): Promise<{ databases: string[], updatedAt: string } | null> {
  const client = getPrismaClient()
  try {
    const cachedDatabases = await client.cachedDatabase.findMany({
      where: { connectionId },
      orderBy: { name: 'asc' }
    })

    if (cachedDatabases.length === 0) {
      return null
    }

    // Get the most recent update time
    const mostRecent = cachedDatabases.reduce((latest, current) => 
      current.updatedAt > latest.updatedAt ? current : latest
    )

    return {
      databases: cachedDatabases.map(db => db.name),
      updatedAt: mostRecent.updatedAt.toISOString()
    }
  } catch (error) {
    console.error('Error reading cached databases:', error)
    return null
  }
}

// Cache schema
export async function cacheSchema(connectionId: string, database: string, schema: SchemaInfo): Promise<void> {
  const client = getPrismaClient()
  try {
    // Upsert the main schema record
    const cachedSchema = await client.cachedSchema.upsert({
      where: {
        connectionId_database: {
          connectionId,
          database
        }
      },
      update: {},
      create: {
        id: uuidv4(),
        connectionId,
        database
      }
    })

    // Clear existing data
    await Promise.all([
      client.cachedTable.deleteMany({
        where: { schemaId: cachedSchema.id }
      }),
      client.cachedView.deleteMany({
        where: { schemaId: cachedSchema.id }
      }),
      client.cachedProcedure.deleteMany({
        where: { schemaId: cachedSchema.id }
      })
    ])

    // Cache tables
    for (const table of schema.tables) {
      const cachedTable = await client.cachedTable.create({
        data: {
          id: uuidv4(),
          schemaId: cachedSchema.id,
          name: table.name,
          schema: table.schema
        }
      })

      // Cache table columns
      if (table.columns.length > 0) {
        await client.cachedTableColumn.createMany({
          data: table.columns.map((col, index) => ({
            id: uuidv4(),
            tableId: cachedTable.id,
            name: col.name,
            dataType: col.type,
            isNullable: col.nullable,
            defaultValue: col.defaultValue,
            isPrimary: col.primary || false,
            isUnique: col.unique || false,
            isForeign: col.foreign || false,
            comment: col.comment,
            ordinalPosition: index + 1
          }))
        })
      }

      // Cache primary keys
      if (table.primaryKey && table.primaryKey.length > 0) {
        await client.cachedTablePrimaryKey.createMany({
          data: table.primaryKey.map((pk, index) => ({
            id: uuidv4(),
            tableId: cachedTable.id,
            columnName: pk,
            ordinalPosition: index + 1
          }))
        })
      }

      // Cache foreign keys
      if (table.foreignKeys && table.foreignKeys.length > 0) {
        await client.cachedTableForeignKey.createMany({
          data: table.foreignKeys.flatMap((fk, fkIndex) => 
            fk.columns.map((col, colIndex) => ({
              id: uuidv4(),
              tableId: cachedTable.id,
              columnName: col,
              referencedTable: fk.referencedTable,
              referencedColumn: fk.referencedColumns[colIndex] || fk.referencedColumns[0],
              ordinalPosition: fkIndex + 1
            }))
          )
        })
      }
    }

    // Cache views
    for (const view of schema.views) {
      const cachedView = await client.cachedView.create({
        data: {
          id: uuidv4(),
          schemaId: cachedSchema.id,
          name: view.name,
          schema: view.schema,
          definition: view.definition
        }
      })

      // Cache view columns
      if (view.columns.length > 0) {
        await client.cachedViewColumn.createMany({
          data: view.columns.map((col, index) => ({
            id: uuidv4(),
            viewId: cachedView.id,
            name: col.name,
            dataType: col.type,
            isNullable: col.nullable,
            defaultValue: col.defaultValue,
            ordinalPosition: index + 1
          }))
        })
      }
    }

    // Cache stored procedures (basic info only, detailed info is cached separately)
    for (const proc of schema.storedProcedures) {
      await client.cachedProcedure.create({
        data: {
          id: uuidv4(),
          schemaId: cachedSchema.id,
          schema: proc.schema,
          procedureName: proc.name,
          parametersCached: false,
          resultSetsCached: false
        }
      })
    }
  } catch (error) {
    console.error('Error caching schema:', error)
  }
}

// Get cached schema
export async function getCachedSchema(connectionId: string, database: string): Promise<(SchemaInfo & { updatedAt: string }) | null> {
  const client = getPrismaClient()
  try {
    const cachedSchema = await client.cachedSchema.findUnique({
      where: {
        connectionId_database: {
          connectionId,
          database
        }
      },
      include: {
        tables: {
          include: {
            columns: {
              orderBy: { ordinalPosition: 'asc' }
            },
            primaryKeys: {
              orderBy: { ordinalPosition: 'asc' }
            },
            foreignKeys: {
              orderBy: { ordinalPosition: 'asc' }
            }
          },
          orderBy: { name: 'asc' }
        },
        views: {
          include: {
            columns: {
              orderBy: { ordinalPosition: 'asc' }
            }
          },
          orderBy: { name: 'asc' }
        },
        procedures: {
          include: {
            parameters: {
              orderBy: { ordinalPosition: 'asc' }
            },
            resultSets: {
              include: {
                columns: {
                  orderBy: { ordinalPosition: 'asc' }
                }
              },
              orderBy: { resultSetIndex: 'asc' }
            }
          },
          orderBy: { procedureName: 'asc' }
        }
      }
    })

    if (!cachedSchema) {
      return null
    }

    // Build tables from cached data
    const tables = cachedSchema.tables.map(table => ({
      name: table.name,
      schema: table.schema,
      columns: table.columns.map(col => ({
        name: col.name,
        type: col.dataType,
        nullable: col.isNullable,
        defaultValue: col.defaultValue || undefined,
        primary: col.isPrimary,
        unique: col.isUnique,
        foreign: col.isForeign,
        comment: col.comment || undefined
      })),
      primaryKey: table.primaryKeys.map(pk => pk.columnName),
      foreignKeys: table.foreignKeys.map(fk => ({
        columns: [fk.columnName],
        referencedTable: fk.referencedTable,
        referencedColumns: [fk.referencedColumn]
      }))
    }))

    // Build views from cached data
    const views = cachedSchema.views.map(view => ({
      name: view.name,
      schema: view.schema,
      columns: view.columns.map(col => ({
        name: col.name,
        type: col.dataType,
        nullable: col.isNullable,
        defaultValue: col.defaultValue || undefined
      })),
      definition: view.definition || undefined
    }))

    // Build stored procedures from cached data
    const storedProcedures = cachedSchema.procedures.map(proc => {
      const baseProcedure = {
        name: proc.procedureName,
        schema: proc.schema,
        parameters: proc.parameters.map(param => ({
          name: param.name,
          type: param.dataType,
          mode: param.direction as 'IN' | 'OUT' | 'INOUT',
          defaultValue: param.defaultValue || undefined
        })),
        resultSets: proc.resultSets.map(resultSet => ({
          columns: resultSet.columns.map(col => ({
            name: col.name,
            type: col.dataType,
            nullable: col.isNullable
          }))
        })),
        definition: proc.definition || undefined,
        cached: proc.parametersCached,
        lastCached: proc.updatedAt.toISOString()
      }

      return baseProcedure
    })

    return {
      tables,
      views,
      storedProcedures,
      updatedAt: cachedSchema.updatedAt.toISOString()
    }
  } catch (error) {
    console.error('Error reading cached schema:', error)
    return null
  }
}

// Store procedure definition with full details
export async function storeProcedureDefinition(
  connectionId: string, 
  database: string, 
  schema: string, 
  procedureName: string, 
  definition?: string,
  parameters?: any[],
  resultSets?: any[]
): Promise<string> {
  const client = getPrismaClient()
  try {
    const fileName = `${database}.${schema}.${procedureName}.sql`
    
    // Get the cached schema first
    const cachedSchema = await client.cachedSchema.findUnique({
      where: {
        connectionId_database: {
          connectionId,
          database
        }
      }
    })

    if (!cachedSchema) {
      throw new Error(`No cached schema found for ${connectionId}/${database}`)
    }

    // First, upsert the cached procedure
    const cachedProcedure = await client.cachedProcedure.upsert({
      where: {
        schemaId_schema_procedureName: {
          schemaId: cachedSchema.id,
          schema,
          procedureName
        }
      },
      update: {
        definition: definition || undefined,
        parametersCached: parameters !== undefined ? true : undefined,
        resultSetsCached: resultSets !== undefined ? true : undefined
      },
      create: {
        id: uuidv4(),
        schemaId: cachedSchema.id,
        schema,
        procedureName,
        definition: definition || undefined,
        parametersCached: parameters !== undefined ? true : false,
        resultSetsCached: resultSets !== undefined ? true : false
      }
    })

    // Store parameters if provided
    if (parameters !== undefined) {
      // Delete existing parameters
      await client.procedureParameter.deleteMany({
        where: { procedureId: cachedProcedure.id }
      })

      // Insert new parameters
      if (parameters.length > 0) {
        await client.procedureParameter.createMany({
          data: parameters.map((param, index) => ({
            id: uuidv4(),
            procedureId: cachedProcedure.id,
            name: param.name || '',
            dataType: param.dataType || param.type || param.data_type || 'unknown',
            direction: param.direction || param.mode || 'IN',
            defaultValue: param.defaultValue,
            isNullable: param.isNullable !== false,
            maxLength: param.maxLength,
            precision: param.precision,
            scale: param.scale,
            ordinalPosition: index + 1
          }))
        })
      }
    }

    // Store result sets if provided
    if (resultSets !== undefined) {
      // Delete existing result sets and their columns
      await client.procedureResultSet.deleteMany({
        where: { procedureId: cachedProcedure.id }
      })

      // Insert new result sets
      for (let i = 0; i < resultSets.length; i++) {
        const resultSet = resultSets[i]
        const createdResultSet = await client.procedureResultSet.create({
          data: {
            id: uuidv4(),
            procedureId: cachedProcedure.id,
            resultSetIndex: i,
            name: resultSet.name
          }
        })

        // Insert columns for this result set
        if (resultSet.columns && resultSet.columns.length > 0) {
          await client.resultSetColumn.createMany({
            data: resultSet.columns.map((column: any, colIndex: number) => ({
              id: uuidv4(),
              resultSetId: createdResultSet.id,
              name: column.name || '',
              dataType: column.dataType || column.type || '',
              isNullable: column.isNullable !== false,
              maxLength: column.maxLength,
              precision: column.precision,
              scale: column.scale,
              ordinalPosition: colIndex + 1
            }))
          })
        }
      }
    }

    return fileName
  } catch (error) {
    console.error('Error storing procedure definition:', error)
    return ''
  }
}

// Get all cached procedures for a connection/database
export async function getAllCachedProcedures(
  connectionId: string,
  database: string
): Promise<Map<string, any>> {
  const client = getPrismaClient()
  try {
    const cachedSchema = await client.cachedSchema.findUnique({
      where: {
        connectionId_database: {
          connectionId,
          database
        }
      }
    })

    if (!cachedSchema) {
      return new Map()
    }

    const cachedProcedures = await client.cachedProcedure.findMany({
      where: {
        schemaId: cachedSchema.id
      },
      select: {
        schema: true,
        procedureName: true,
        parametersCached: true,
        resultSetsCached: true,
        failedToLoad: true,
        failureReason: true,
        updatedAt: true
      }
    })

    // Create a map with schema.procedureName as key
    const procedureMap = new Map<string, any>()
    for (const proc of cachedProcedures) {
      const key = `${proc.schema}.${proc.procedureName}`
      procedureMap.set(key, {
        parametersCached: proc.parametersCached,
        resultSetsCached: proc.resultSetsCached,
        failedToLoad: proc.failedToLoad,
        failureReason: proc.failureReason,
        updatedAt: proc.updatedAt.toISOString()
      })
    }

    return procedureMap
  } catch (error) {
    console.error('Error reading cached procedures:', error)
    return new Map()
  }
}

// Get procedure details directly from database
export async function getCachedProcedure(
  connectionId: string,
  database: string,
  schema: string,
  procedureName: string
): Promise<any | null> {
  const client = getPrismaClient()
  try {
    const cachedSchema = await client.cachedSchema.findUnique({
      where: {
        connectionId_database: {
          connectionId,
          database
        }
      }
    })

    if (!cachedSchema) {
      return null
    }

    const cachedProcedure = await client.cachedProcedure.findUnique({
      where: {
        schemaId_schema_procedureName: {
          schemaId: cachedSchema.id,
          schema,
          procedureName
        }
      },
      include: {
        parameters: {
          orderBy: { ordinalPosition: 'asc' }
        },
        resultSets: {
          include: {
            columns: {
              orderBy: { ordinalPosition: 'asc' }
            }
          },
          orderBy: { resultSetIndex: 'asc' }
        }
      }
    })

    if (!cachedProcedure) {
      return null
    }

    return {
      definition: cachedProcedure.definition,
      parameters: cachedProcedure.parameters,
      resultSets: cachedProcedure.resultSets,
      parametersCached: cachedProcedure.parametersCached,
      resultSetsCached: cachedProcedure.resultSetsCached,
      failedToLoad: cachedProcedure.failedToLoad,
      failureReason: cachedProcedure.failureReason,
      updatedAt: cachedProcedure.updatedAt.toISOString()
    }
  } catch (error) {
    console.error('Error reading cached procedure:', error)
    return null
  }
}

// Mark procedure as failed to load
export async function markProcedureAsFailed(
  connectionId: string,
  database: string,
  schema: string,
  procedureName: string,
  errorMessage: string
): Promise<void> {
  const client = getPrismaClient()
  try {
    const cachedSchema = await client.cachedSchema.findUnique({
      where: {
        connectionId_database: {
          connectionId,
          database
        }
      }
    })

    if (!cachedSchema) {
      throw new Error(`No cached schema found for ${connectionId}/${database}`)
    }

    await client.cachedProcedure.upsert({
      where: {
        schemaId_schema_procedureName: {
          schemaId: cachedSchema.id,
          schema,
          procedureName
        }
      },
      update: {
        failedToLoad: true,
        failureReason: errorMessage
      },
      create: {
        id: uuidv4(),
        schemaId: cachedSchema.id,
        schema,
        procedureName,
        failedToLoad: true,
        failureReason: errorMessage
      }
    })
  } catch (error) {
    console.error('Error marking procedure as failed:', error)
  }
}

// Clear failed state for procedure (for retry)
export async function clearProcedureFailedState(
  connectionId: string,
  database: string,
  schema: string,
  procedureName: string
): Promise<void> {
  const client = getPrismaClient()
  try {
    const cachedSchema = await client.cachedSchema.findUnique({
      where: {
        connectionId_database: {
          connectionId,
          database
        }
      }
    })

    if (!cachedSchema) {
      return
    }

    await client.cachedProcedure.updateMany({
      where: {
        schemaId: cachedSchema.id,
        schema,
        procedureName
      },
      data: {
        failedToLoad: false,
        failureReason: null
      }
    })
  } catch (error) {
    console.error('Error clearing procedure failed state:', error)
  }
}

// Update procedure details in the cached schema (deprecated - use storeProcedureDefinition instead)
export async function updateProcedureInSchema(
  connectionId: string,
  database: string,
  schema: string,
  procedureName: string,
  procedureDetails: any
): Promise<void> {
  // This function is now deprecated - storeProcedureDefinition handles both definition and details
  await storeProcedureDefinition(
    connectionId,
    database,
    schema,
    procedureName,
    procedureDetails.definition,
    procedureDetails.parameters,
    procedureDetails.resultSets
  )
}



// Cleanup function for graceful shutdown
export async function closePrismaConnection(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
  }
}