import { GetViewData, GetTableDataCount } from "wailsjs/go/main/App";
import type { ViewTab } from "../stores/tabsStore";
import { useConnectionsStore } from "../stores/connectionsStore";

export async function loadViewData(tab: ViewTab) {
  tab.state.loading = true;
  tab.state.error = null;

  try {
    const connectionsStore = useConnectionsStore();
    const [databaseName, schemaName, viewName] = tab.objectName.split(".");

    await connectionsStore.loadConnections();
    
    // Find connection and view info from store
    const connection = connectionsStore.connections.find(
      (c) => c.id === tab.connectionId
    );
    const databaseInfo = connection?.databases.find(
      (d) => d.name === databaseName
    );
    const viewInfo = databaseInfo?.viewsBySchema[schemaName]?.find(
      (v) => v.name === viewName
    );

    if (!viewInfo) {
      throw new Error(`View ${tab.objectName} not found in schema cache`);
    }

    // Get view data and count
    // Backend GetViewData currently doesn't take filters explicitly but we can use GetTableDataCount
    const [response, total] = await Promise.all([
      GetViewData(
        tab.connectionId,
        databaseName,
        schemaName,
        viewName,
        tab.state.page + 1,
        tab.state.pageSize
      ),
      GetTableDataCount({
        connectionId: tab.connectionId,
        database: databaseName,
        schema: schemaName,
        tableName: viewName,
        filters: [], // Views don't have filters in UI yet
      }),
    ]);

    tab.state.data = response;
    tab.state.columns = viewInfo.columns;
    tab.state.definition = viewInfo.definition || "";
    tab.state.totalRows = total;
    tab.state.loading = false;
  } catch (err) {
    console.error("View data loading error:", err);
    tab.state.error = (err as Error).message || "Unknown error occurred";
    tab.state.loading = false;
  }
}