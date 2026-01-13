import { ref } from "vue";
import { defineStore } from "pinia";
import { groupBy } from "lodash-es";
import { GetConnections, GetSchema } from "wailsjs/go/main/App";
import type { Connection } from "~/types/wails";
import type { TableInfo, ViewInfo, StoredProcedureInfo } from "../types/schema";

export interface DatabaseInfo {
  name: string;
  tablesBySchema: Record<string, TableInfo[]>;
  viewsBySchema: Record<string, ViewInfo[]>;
  proceduresBySchema: Record<string, StoredProcedureInfo[]>;
}

export interface ExtendedConnection extends Connection {
  databases: DatabaseInfo[];
}

export const useConnectionsStore = defineStore("connections", () => {
  const connections = ref<ExtendedConnection[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const loadConnections = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const conns = await GetConnections();
      
      // Transform connections to include database structure
      connections.value = await Promise.all(
        conns.map(async (conn) => {
          try {
            // Get actual database schema from backend
            const schemaResponse = await GetSchema(
              conn.id,
              conn.database || "master",
              false
            );

            const tablesBySchema = groupBy(schemaResponse.tables, "schema");
            const viewsBySchema = groupBy(schemaResponse.views, "schema");
            const proceduresBySchema = groupBy(
              schemaResponse.storedProcedures,
              "schema"
            );

            const databases = [
              {
                name: conn.database || "master",
                tablesBySchema,
                viewsBySchema,
                proceduresBySchema,
              },
            ];

            return { ...conn, databases };
          } catch (error) {
            console.error(`Failed to load schema for ${conn.name}:`, error);
            // Return connection with empty databases on error
            return {
              ...conn,
              databases: [
                {
                  name: conn.database || "master",
                  tablesBySchema: {},
                  viewsBySchema: {},
                  proceduresBySchema: {},
                },
              ],
            };
          }
        })
      );
    } catch (err) {
      console.error("Failed to load connections:", err);
      error.value = err instanceof Error ? err.message : "Failed to load connections";
    } finally {
      loading.value = false;
    }
  };

  return {
    connections,
    loading,
    error,
    loadConnections,
  };
});
