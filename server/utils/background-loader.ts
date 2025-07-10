import { storeProcedureDefinition, updateProcedureInSchema, getCachedProcedure, markProcedureAsFailed, clearProcedureFailedState } from "./cache";
import { setLoadingState, setLoadedState, setFailedState, setWaitingState } from "./loading-states";
import { BaseAdapter } from "~/server/adapters/BaseAdapter";
import type { SchemaInfo, StoredProcedureInfo } from "~/types/schema";

async function processProcedureBatch(
  connectionId: string,
  database: string,
  adapter: BaseAdapter,
  procedures: StoredProcedureInfo[]
) {
  // Process procedures in parallel
  await Promise.all(
    procedures.map(async (proc) => {
      try {
        // Check if already cached with detailed parameters
        const cachedProcedure = await getCachedProcedure(
          connectionId,
          database,
          proc.schema,
          proc.name
        );
        
        if (cachedProcedure?.parametersCached) {
          console.log(`[BackgroundLoader] Procedure ${proc.schema}.${proc.name} already cached with detailed parameters`);
          setLoadedState(connectionId, database, proc.schema, proc.name);
          return;
        }

        // Set loading state
        setLoadingState(connectionId, database, proc.schema, proc.name);

        // Get procedure details
        const details = await adapter.getProcedureDetails(
          database,
          proc.schema,
          proc.name
        );

        // Store procedure definition with full details
        await storeProcedureDefinition(
          connectionId,
          database,
          proc.schema,
          proc.name,
          details.definition,
          details.parameters,
          details.resultSets
        );

        // Mark as loaded
        setLoadedState(connectionId, database, proc.schema, proc.name);
      } catch (error: any) {
        console.error(
          `Error loading procedure ${proc.schema}.${proc.name}:`,
          error
        );

        // Mark as failed in database and loading state
        await markProcedureAsFailed(
          connectionId,
          database,
          proc.schema,
          proc.name,
          error.message
        );
        setFailedState(connectionId, database, proc.schema, proc.name, error.message);
      }
    })
  );
}

async function getNextUncachedProcedures(
  connectionId: string,
  database: string,
  schema: SchemaInfo,
  adapter: BaseAdapter,
  limit: number
): Promise<StoredProcedureInfo[]> {
  const uncached: StoredProcedureInfo[] = [];

  for (const proc of schema.storedProcedures) {
    if (uncached.length >= limit) {
      break;
    }

    // Check if already cached with detailed parameters
    const cachedProcedure = await getCachedProcedure(
      connectionId,
      database,
      proc.schema,
      proc.name
    );
    
    // If already cached, set loaded state and skip
    if (cachedProcedure?.parametersCached) {
      setLoadedState(connectionId, database, proc.schema, proc.name);
      continue;
    }

    // Handle failed procedures
    if (cachedProcedure?.failedToLoad) {
      setFailedState(connectionId, database, proc.schema, proc.name, cachedProcedure.failureReason || 'Failed to load');
      continue;
    }

    // Initialize waiting state for uncached procedures
    if (!cachedProcedure) {
      setWaitingState(connectionId, database, proc.schema, proc.name);
    }

    uncached.push(proc);
  }

  return uncached;
}

// Store active background loading processes
const activeLoaders = new Map<string, { stop: boolean }>();

function getLoaderKey(connectionId: string, database: string): string {
  return `${connectionId}:${database}`;
}

export async function startBackgroundLoading(
  connectionId: string,
  database: string,
  adapter: BaseAdapter,
  schema: SchemaInfo
) {
  const loaderKey = getLoaderKey(connectionId, database);
  
  // Check if already running
  if (activeLoaders.has(loaderKey)) {
    console.log(`[BackgroundLoader] Already running for ${loaderKey}`);
    return;
  }

  // Create control object
  const control = { stop: false };
  activeLoaders.set(loaderKey, control);

  try {
    console.log(`[BackgroundLoader] Starting for ${loaderKey}`);
    
    // Process in batches of 3 until no more uncached procedures or stopped
    while (!control.stop) {
      const uncachedProcedures = await getNextUncachedProcedures(
        connectionId,
        database,
        schema,
        adapter,
        3,
      );
      
      if (uncachedProcedures.length === 0) {
        break;
      }
      
      await processProcedureBatch(
        connectionId,
        database,
        adapter,
        uncachedProcedures
      );
    }
    
    if (control.stop) {
      console.log(`[BackgroundLoader] Stopped for ${loaderKey}`);
    } else {
      console.log(`[BackgroundLoader] Completed for ${loaderKey}`);
    }
  } catch (error) {
    console.error(`[BackgroundLoader] Error for ${loaderKey}:`, error);
  } finally {
    // Clean up
    activeLoaders.delete(loaderKey);
  }
}

export function stopBackgroundLoading(connectionId: string, database: string) {
  const loaderKey = getLoaderKey(connectionId, database);
  const control = activeLoaders.get(loaderKey);
  
  if (control) {
    control.stop = true;
    console.log(`[BackgroundLoader] Stop requested for ${loaderKey}`);
    return true;
  }
  
  return false;
}

export function isBackgroundLoadingActive(connectionId: string, database: string): boolean {
  const loaderKey = getLoaderKey(connectionId, database);
  return activeLoaders.has(loaderKey);
}
