import { AnalyzeProcedure } from "wailsjs/go/main/App";
import type { ProcedureTab } from "../stores/tabsStore";

export async function loadProcedureData(tab: ProcedureTab) {
  tab.state.loading = true;
  tab.state.error = null;
  try {
    const [schema, procedureName] = tab.objectName.split(".");

    const info = await AnalyzeProcedure(
      tab.connectionId,
      tab.database,
      schema,
      procedureName
    );

    let content = "";
    if (info && info.definition) {
      content = info.definition;
    } else {
      content = `-- Procedure definition not available\n-- ${tab.objectName}`;
    }

    tab.state.info = info;
    tab.state.content = content;
    tab.state.loading = false;
  } catch (err) {
    console.error("Procedure data loading error:", err);
    tab.state.error = (err as Error).message || "Unknown error occurred";
    tab.state.loading = false;
  }
}