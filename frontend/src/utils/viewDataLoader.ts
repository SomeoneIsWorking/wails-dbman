import { GetViewData, GetSchema } from "wailsjs/go/main/App";
import type { ViewTab } from "../stores/tabsStore";

export async function loadViewData(tab: ViewTab) {
  tab.state = {
    type: "loading",
    page: tab.state.page,
    pageSize: tab.state.pageSize,
  };
  try {
    const [schemaName, viewName] = tab.objectName.split(".");

    // Get view schema to know column information
    const schemaResponse = await GetSchema(
      tab.connectionId,
      tab.database,
      false
    );

    const viewInfo = schemaResponse.views.find(
      (v) => v.schema === schemaName && v.name === viewName
    );

    if (!viewInfo) {
      throw new Error(`View ${tab.objectName} not found in schema`);
    }

    const columns = viewInfo.columns.map(col => col.name);

    // Get view data
    const response = await GetViewData(
      tab.connectionId,
      tab.database,
      schemaName,
      viewName,
      tab.state.page,
      tab.state.pageSize
    );

    tab.state = {
      type: "success",
      data: response,
      columns,
      page: tab.state.page,
      pageSize: tab.state.pageSize,
    };
  } catch (err) {
    console.error("View data loading error:", err);
    const errorMsg = (err as Error).message || "Unknown error occurred";
    tab.state = {
      type: "error",
      error: errorMsg,
      page: tab.state.page,
      pageSize: tab.state.pageSize,
    };
  }
}