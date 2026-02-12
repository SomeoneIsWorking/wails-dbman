import { ref } from "vue";
import { defineStore } from "pinia";
import { groupBy } from "lodash-es";
import {
  GetConnections,
  GetSchema,
  UpdateConnectionSettings,
} from "wailsjs/go/main/App";
import { cache } from "wailsjs/go/models";
import type { TableInfo, ViewInfo, StoredProcedureInfo } from "../types/schema";

export interface DatabaseInfo {
  name: string;
  tablesBySchema: Record<string, TableInfo[]>;
  viewsBySchema: Record<string, ViewInfo[]>;
  proceduresBySchema: Record<string, StoredProcedureInfo[]>;
  loaded: boolean;
  loading: boolean;
  isHidden?: boolean;
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
  const connectionsPromise = ref<Promise<void> | null>(null);

  const loadConnections = async () => {
    if (connectionsPromise.value) {
      return connectionsPromise.value;
    }

    connectionsPromise.value = _loadConnections();
    await connectionsPromise.value;
    connectionsPromise.value = null;
  };

  const _loadConnections = async () => {
    loading.value = true;
    error.value = null;

    try {
      const enrichedConns = await GetConnections();

      // Transform connections to include database structure
      connections.value = enrichedConns.map((conn) => {
        let hiddenForConn: string[] = [];
        try {
          hiddenForConn = JSON.parse(conn.hiddenDatabases || "[]");
        } catch (e) {
          console.error("Failed to parse hidden databases for", conn.id, e);
        }

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
              isHidden: hiddenForConn.includes(db.name),
            };
          }),
        };
      });
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
    } finally {
      dbInfo.loading = false;
    }
  };

  const syncSettings = async (connectionId: string) => {
    const conn = connections.value.find((c) => c.id === connectionId);
    if (!conn) return;

    await UpdateConnectionSettings(
      connectionId,
      conn.hiddenDatabases,
      conn.showHidden,
    );
  };

  const hideDatabase = async (connectionId: string, dbName: string) => {
    const conn = connections.value.find((c) => c.id === connectionId);
    if (!conn) return;

    let hiddenList: string[] = [];
    try {
      hiddenList = JSON.parse(conn.hiddenDatabases || "[]");
    } catch (e) {}

    if (!hiddenList.includes(dbName)) {
      hiddenList.push(dbName);
      const hiddenStr = JSON.stringify(hiddenList);

      // Update local state
      conn.hiddenDatabases = hiddenStr;
      const db = conn.databases.find((d) => d.name === dbName);
      if (db) db.isHidden = true;

      // Sync with backend
      await syncSettings(connectionId);
    }
  };

  const showDatabase = async (connectionId: string, dbName: string) => {
    const conn = connections.value.find((c) => c.id === connectionId);
    if (!conn) return;

    let hiddenList: string[] = [];
    try {
      hiddenList = JSON.parse(conn.hiddenDatabases || "[]");
    } catch (e) {}

    if (hiddenList.includes(dbName)) {
      hiddenList = hiddenList.filter((name) => name !== dbName);
      const hiddenStr = JSON.stringify(hiddenList);

      // Update local state
      conn.hiddenDatabases = hiddenStr;
      const db = conn.databases.find((d) => d.name === dbName);
      if (db) db.isHidden = false;

      // Sync with backend
      await syncSettings(connectionId);
    }
  };

  const toggleShowHidden = async (connectionId: string) => {
    const conn = connections.value.find((c) => c.id === connectionId);
    if (!conn) return;

    // Update local state
    conn.showHidden = !conn.showHidden;

    // Sync with backend
    await syncSettings(connectionId);
  };

  const getConnectionString = (conn: cache.ConnectionDetail) => {
    const { type, host, port, username, password, database } = conn;
    if (!type || !host) return "";

    switch (type) {
      case "postgresql":
        return `postgresql://${username || ""}${password ? `:${password}` : ""}${
          username || password ? "@" : ""
        }${host}${port ? `:${port}` : ""}/${database || ""}`;
      case "mysql":
        return `mysql://${username || ""}${password ? `:${password}` : ""}${
          username || password ? "@" : ""
        }${host}${port ? `:${port}` : ""}/${database || ""}`;
      case "mssql":
        return `Server=${host}${port ? `,${port}` : ""};Database=${
          database || ""
        };User Id=${username || ""};Password=${password || ""};`;
      default:
        return "";
    }
  };

  return {
    connections,
    loading,
    error,
    loadConnections,
    loadSchemaForDatabase,
    hideDatabase,
    showDatabase,
    toggleShowHidden,
    getConnectionString,
  };
});
