import { GetTableData, GetSchema } from "wailsjs/go/main/App";
import type { TableTab } from "../stores/tabsStore";

export async function loadTableData(tab: TableTab) {
  tab.state = {
    type: "loading",
    activeTab: tab.state.activeTab,
    page: tab.state.page,
    pageSize: tab.state.pageSize,
  };
  try {
    const [schemaName, tableName] = tab.objectName.split(".");

    // Get table schema to know column information
    const schemaResponse = await GetSchema(
      tab.connectionId,
      tab.database,
      false
    );

    const tableInfo = schemaResponse.tables.find(
      (t) => t.schema === schemaName && t.name === tableName
    )!;

    if (!tableInfo) {
      throw new Error(`Table ${tab.objectName} not found in schema`);
    }

    // Get table data with pagination
    const response = await GetTableData({
      connectionId: tab.connectionId,
      database: tab.database,
      schema: schemaName,
      tableName: tableName,
      page: tab.state.page,
      limit: tab.state.pageSize,
    });

    response.results = response.results || [];
    console.log("Table data response:", response);

    tab.state = {
      type: "success",
      data: response,
      schema: tableInfo,
      activeTab: tab.state.activeTab,
      page: tab.state.page,
      pageSize: tab.state.pageSize,
    };
  } catch (err) {
    console.error("Table data loading error:", err);
    const errorMsg = (err as Error).message || "Unknown error occurred";
    tab.state = {
      type: "error",
      error: errorMsg,
      page: tab.state.page,
      pageSize: tab.state.pageSize,
      activeTab: tab.state.activeTab,
    };
  }
}
