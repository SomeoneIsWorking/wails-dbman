import { defineEventHandler, getRouterParam, createError } from 'h3'
import type { ConnectionConfig } from '~/types/schema'
import { getConnection } from './cache'

/**
 * Validates required route parameters and returns them
 */
export function validateRouteParams(event: any, required: string[]): Record<string, string> {
  const params: Record<string, string> = {}
  
  for (const param of required) {
    const value = event.context.params?.[param] || getRouterParam(event, param)
    if (!value) {
      throw createError({
        statusCode: 400,
        message: `Missing required parameter: ${param}`
      })
    }
    params[param] = value
  }
  
  return params
}

/**
 * Validates and splits schema.name format
 */
export function validateSchemaName(name: string, type: 'table' | 'procedure' = 'table'): { schema: string; objectName: string } {
  const [schema, objectName] = name.split('.')
  if (!schema || !objectName) {
    throw createError({
      statusCode: 400,
      message: `Invalid ${type} name format. Expected: schema.name`
    })
  }
  return { schema, objectName }
}

/**
 * Creates a ConnectionConfig from connection details
 */
export async function createConnectionConfig(connectionId: string): Promise<{ connection: any; config: ConnectionConfig }> {
  const connection = await getConnection(connectionId)
  
  if (!connection) {
    throw createError({
      statusCode: 404,
      message: 'Connection not found'
    })
  }

  const config: ConnectionConfig = {
    host: connection.host,
    port: connection.port,
    username: connection.username,
    password: connection.password
  }

  return { connection, config }
}

/**
 * Standard error wrapper for API operations
 */
export function wrapApiError<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
  return operation().catch((error: any) => {
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Failed to ${operationName}: ${error.message}`
    })
  })
}

/**
 * Common parameter validation patterns
 */
export const PARAM_PATTERNS = {
  CONNECTION: ['id'],
  CONNECTION_DATABASE: ['id', 'database'],
  CONNECTION_DATABASE_OBJECT: ['id', 'database', 'name']
} 