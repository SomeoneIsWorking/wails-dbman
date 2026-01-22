import { ref } from "vue";
import { defineStore } from "pinia";
import { groupBy } from "lodash-es";
import { GetConnections, GetSchema } from "wailsjs/go/main/App";
import { cache } from "wailsjs/go/models";
import type { TableInfo, ViewInfo, StoredProcedureInfo } from "../types/schema";

export interface DatabaseInfo {
  name: string;
  tablesBySchema: Record<string, TableInfo[]>;
  viewsBySchema: Record<string, ViewInfo[]>;
  proceduresBySchema: Record<string, StoredProcedureInfo[]>;
  loaded: boolean;
  loading: boolean;
}

export interface ExtendedConnection extends Omit<
  cache.ConnectionDetail,
  "databases"
> {
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
      const enrichedConns = await GetConnections();

      // Transform connections to include database structure
      connections.value = enrichedConns.map((conn) => {
        return {
          ...conn,
          databases: conn.databases.map((db) => {
            const tablesBySchema = db.schema
              ? groupBy(db.schema.tables, "schema")
              : {};
            const viewsBySchema = db.schema
              ? groupBy(db.schema.views, "schema")
              : {};
            const proceduresBySchema = db.schema
              ? groupBy(db.schema.storedProcedures, "schema")
              : {};

            return {
              name: db.name,
              tablesBySchema,
              viewsBySchema,
              proceduresBySchema,
              loaded: db.loaded,
              loading: false,
            };
          }),
        };
      });
    } catch (err) {
      console.error("Failed to load connections:", err);
      error.value =
        err instanceof Error ? err.message : "Failed to load connections";
    } finally {
      loading.value = false;
    }
  };

  const loadSchemaForDatabase = async (
    connectionId: string,
    dbInfo: DatabaseInfo,
    invalidate: boolean = false,
  ) => {
    if (dbInfo.loading || (dbInfo.loaded && !invalidate)) return;

    dbInfo.loading = true;
    try {
      const schemaResponse = await GetSchema(
        connectionId,
        dbInfo.name,
        invalidate,
      );

      dbInfo.tablesBySchema = groupBy(schemaResponse.tables, "schema");
      dbInfo.viewsBySchema = groupBy(schemaResponse.views, "schema");
      dbInfo.proceduresBySchema = groupBy(
        schemaResponse.storedProcedures,
        "schema",
      );
      dbInfo.loaded = true;
    } catch (error) {
      console.error(
        `Failed to load schema for database ${dbInfo.name}:`,
        error,
      );
    } finally {
      dbInfo.loading = false;
    }
  };

  return {
    connections,
    loading,
    error,
    loadConnections,
    loadSchemaForDatabase,
  };
});
