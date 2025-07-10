import { getCachedSchema, getAllCachedProcedures } from './cache'

type LoadingState = 'waiting' | 'loading' | 'loaded' | 'failed'

interface ProcedureLoadingState {
  state: LoadingState
  error?: string
  startedAt?: number
}

interface ConnectionLoadingStates {
  [procedureKey: string]: ProcedureLoadingState
}

interface LoadingStates {
  [connectionKey: string]: ConnectionLoadingStates
}

// In-memory loading states
export const loadingStates: LoadingStates = {}

// Get the key for a connection
function getConnectionKey(connectionId: string, database: string): string {
  return `${connectionId}/${database}`
}

// Get the key for a procedure
function getProcedureKey(schema: string, name: string): string {
  return `${schema}.${name}`
}

export function setLoadingState(connectionId: string, database: string, schema: string, name: string) {
  const connectionKey = getConnectionKey(connectionId, database)
  const procedureKey = getProcedureKey(schema, name)
  
  if (!loadingStates[connectionKey]) {
    loadingStates[connectionKey] = {}
  }
  
  loadingStates[connectionKey][procedureKey] = {
    state: 'loading',
    startedAt: Date.now()
  }
}

export function setLoadedState(connectionId: string, database: string, schema: string, name: string) {
  const connectionKey = getConnectionKey(connectionId, database)
  const procedureKey = getProcedureKey(schema, name)
  
  if (!loadingStates[connectionKey]) {
    loadingStates[connectionKey] = {}
  }
  
  loadingStates[connectionKey][procedureKey] = {
    state: 'loaded'
  }
}

export function setFailedState(connectionId: string, database: string, schema: string, name: string, error: string) {
  const connectionKey = getConnectionKey(connectionId, database)
  const procedureKey = getProcedureKey(schema, name)
  
  if (!loadingStates[connectionKey]) {
    loadingStates[connectionKey] = {}
  }
  
  loadingStates[connectionKey][procedureKey] = {
    state: 'failed',
    error
  }
}

export function setWaitingState(connectionId: string, database: string, schema: string, name: string) {
  const connectionKey = getConnectionKey(connectionId, database)
  const procedureKey = getProcedureKey(schema, name)
  
  if (!loadingStates[connectionKey]) {
    loadingStates[connectionKey] = {}
  }
  
  loadingStates[connectionKey][procedureKey] = {
    state: 'waiting'
  }
}

export function getLoadingState(connectionId: string, database: string, schema: string, name: string): ProcedureLoadingState | undefined {
  const connectionKey = getConnectionKey(connectionId, database)
  const procedureKey = getProcedureKey(schema, name)
  
  return loadingStates[connectionKey]?.[procedureKey]
}

// Initialize loading states for procedures based on their cached status
async function initializeProcedureLoadingStates(
  connectionId: string,
  database: string
) {
  const connectionKey = getConnectionKey(connectionId, database)

  // Exit early if loading states already exist
  if (loadingStates[connectionKey]) {
    return
  }

  const schema = await getCachedSchema(connectionId, database)
  if (!schema?.storedProcedures) {
    return
  }

  // Get all cached procedures in one query
  const cachedProceduresMap = await getAllCachedProcedures(connectionId, database)

  // Initialize connection states object
  loadingStates[connectionKey] = Object.fromEntries(
    schema.storedProcedures.map((proc: any) => {
      const procedureKey = getProcedureKey(proc.schema, proc.name)
      const cachedProcedure = cachedProceduresMap.get(procedureKey)
      
      let state: ProcedureLoadingState
      if (cachedProcedure?.parametersCached) {
        // Already cached with full details
        state = { state: 'loaded' }
      } else if (cachedProcedure?.failedToLoad) {
        // Previously failed to load
        state = { 
          state: 'failed', 
          error: cachedProcedure.failureReason || 'Failed to load' 
        }
      } else {
        // Not cached yet - set as waiting
        state = { state: 'waiting' }
      }
      
      return [procedureKey, state]
    })
  )
}

export async function getAllLoadingStates(connectionId: string, database: string): Promise<ConnectionLoadingStates> {
  // Initialize loading states if not already done
  await initializeProcedureLoadingStates(connectionId, database)
  
  const connectionKey = getConnectionKey(connectionId, database)
  return loadingStates[connectionKey] || {}
}

export function clearLoadingState(connectionId: string, database: string, schema: string, name: string) {
  const connectionKey = getConnectionKey(connectionId, database)
  const procedureKey = getProcedureKey(schema, name)
  
  if (loadingStates[connectionKey]) {
    delete loadingStates[connectionKey][procedureKey]
    if (Object.keys(loadingStates[connectionKey]).length === 0) {
      delete loadingStates[connectionKey]
    }
  }
} 