import { AnalyzeProcedure } from "wailsjs/go/main/App";
import type { ProcedureTab } from "../stores/tabsStore";

export async function loadProcedureData(tab: ProcedureTab) {
  tab.state = {
    type: "loading",
  };
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

    tab.state = {
      type: "success",
      info,
      content,
    };
  } catch (err) {
    console.error("Procedure data loading error:", err);
    const errorMsg = (err as Error).message || "Unknown error occurred";
    tab.state = {
      type: "error",
      error: errorMsg,
    };
  }
}