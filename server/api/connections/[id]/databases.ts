import { cacheDatabases, getCachedDatabases } from "../../../utils/cache";
import { AdapterFactory } from "../../../adapters/AdapterFactory";
import type { ConnectionConfig } from "~/types/schema";

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Connection ID is required",
    });
  }

  // Get query parameters
  const query = getQuery(event);
  const invalidate = query.invalidate === "true";

  // Check cache first if not invalidating
  if (!invalidate) {
    const cachedData = await getCachedDatabases(id);
    if (cachedData) {
      return cachedData.databases;
    }
  }

  // If not cached or requested refresh, fetch from database
  const response = await $fetch(`/api/connections/${id}`);
  if (!response) {
    throw createError({
      statusCode: 404,
      message: "Connection not found",
    });
  }

  const connection = response;
  const config: ConnectionConfig = {
    host: connection.host,
    port: connection.port,
    username: connection.username,
    password: connection.password,
  };

  try {
    const adapter = AdapterFactory.createAdapter(connection.type, config);
    const databases = await adapter.listDatabases();

    // Cache the results
    await cacheDatabases(id, databases);

    return databases;
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to list databases: ${error.message}`,
    });
  }
});
