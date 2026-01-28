import { GetTableData, GetTableDataCount } from "wailsjs/go/main/App";
import type { TableTab } from "../stores/tabsStore";
import { useConnectionsStore } from "../stores/connectionsStore";
import { isEqual } from "lodash-es";

export async function loadTableData(tab: TableTab) {
  tab.state.loading = true;
  tab.state.error = null;

  try {
    const connectionsStore = useConnectionsStore();
    const [databaseName, schemaName, tableName] = tab.objectName.split(".");

    // Find connection and table info from store instead of fetching
    const connection = connectionsStore.connections.find(
      (c) => c.id === tab.connectionId
    );
    const databaseInfo = connection?.databases.find(
      (d) => d.name === databaseName
    );

    if (!databaseInfo) {
      throw new Error(`Database ${databaseName} not found for connection ${tab.connectionId}`);
    }

    // Ensure schema is loaded
    if (!databaseInfo.loaded) {
      await connectionsStore.loadSchemaForDatabase(tab.connectionId, databaseInfo);
    }

    const tableInfo = databaseInfo.tablesBySchema[schemaName]?.find(
      (t) => t.name === tableName
    );

    if (!tableInfo) {
      throw new Error(`Table ${tab.objectName} not found in schema cache`);
    }

    // Get table data and count separately
    // Backend uses 1-based page, frontend uses 0-based
    const promises: [Promise<any>, Promise<number> | null] = [
      GetTableData({
        connectionId: tab.connectionId,
        database: databaseName,
        schema: schemaName,
        tableName: tableName,
        page: tab.state.page + 1,
        limit: tab.state.pageSize,
        filters: tab.state.filters || [],
        sortColumn: tab.state.sortColumn || "",
        sortDirection: tab.state.sortDirection || "",
      }),
      null,
    ];

    // Only fetch count on initial load or when filters change
    const filtersChanged = !isEqual(tab.state.filters, tab.state.lastFilters);
    if (tab.state.totalRows === 0 || filtersChanged) {
      promises[1] = GetTableDataCount({
        connectionId: tab.connectionId,
        database: databaseName,
        schema: schemaName,
        tableName: tableName,
        filters: tab.state.filters || [],
      });
    }

    const [response, totalRows] = await Promise.all(promises);

    response.results = response.results || [];
    console.log("Table data response:", response);

    tab.state.data = response;
    tab.state.schema = tableInfo as any;
    if (totalRows !== null) {
      tab.state.totalRows = totalRows;
    }
    tab.state.lastFilters = JSON.parse(JSON.stringify(tab.state.filters));
    tab.state.loading = false;
  } catch (err) {
    console.error("Table data loading error:", err);
    tab.state.error = (err as Error).message || "Unknown error occurred";
    tab.state.loading = false;
  }
}
