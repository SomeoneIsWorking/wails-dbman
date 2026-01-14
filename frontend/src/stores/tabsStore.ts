import { ref } from "vue";
import { loadTableData } from "../utils/tableDataLoader";
import { loadViewData } from "../utils/viewDataLoader";
import { loadProcedureData } from "../utils/procedureDataLoader";
import type { cache } from "wailsjs/go/models";
import { defineStore } from "pinia";
import type { ColumnInfo } from "../types/schema";

type CommonTab = {
  id: string;
  title: string;
  connectionId: string;
  database: string;
};

export type QueryTab = {
  type: "query";
} & CommonTab;

export type TableTab = {
  type: "table";
  state: TableTabState;
  objectName: string;
} & CommonTab;

export type ProcedureTab = {
  type: "procedure";
  state: ProcedureTabState;
  objectName: string;
} & CommonTab;

export type ViewTab = {
  type: "view";
  state: ViewTabState;
  objectName: string;
} & CommonTab;

export type Tab = QueryTab | TableTab | ProcedureTab | ViewTab;

export type TableTabState = {
  loading: boolean;
  error: string | null;
  data: cache.TableDataResponse | null;
  schema: cache.TableResponse | null;
  page: number;
  pageSize: number;
  totalRows: number;
  activeTab: "data" | "schema";
  filters: any[];
  lastFilters?: any[];
};

export type ViewTabState = {
  loading: boolean;
  error: string | null;
  data: cache.TableDataResponse | null;
  columns: ColumnInfo[];
  definition: string;
  page: number;
  pageSize: number;
  totalRows: number;
  activeTab: "data" | "definition" | "schema";
  targetLine?: number;
};

export type ProcedureTabState = {
  loading: boolean;
  error: string | null;
  info: cache.StoredProcedureInfo | null;
  content: string;
  activeTab: "info" | "definition" | "query";
  targetLine?: number;
};

export type MessageEntry = {
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: string;
};

export type LogEntry = {
  level: "info" | "warn" | "error";
  message: string;
  timestamp: string;
};

export const useTabsStore = defineStore("tabs", () => {
  const tabs = ref<Tab[]>([]);

  const activeTab = ref<Tab | null>(null);

  const addTab = <T extends Tab>(tab: T, callback?: (arg: T) => void) => {
    const existingTab = tabs.value.find((t) => t.id === tab.id);
    if (existingTab) {
      activeTab.value = existingTab;
      return;
    }

    tabs.value.push(tab);
    const addedTab = tabs.value[tabs.value.length - 1] as T;
    activeTab.value = addedTab;
    callback?.(addedTab);
  };

  const addTableTab = (
    connectionId: string,
    database: string,
    schema: string,
    tableName: string
  ) => {
    const tabId = `table-${connectionId}-${database}-${schema}.${tableName}`;
    const tab: TableTab = {
      id: tabId,
      type: "table",
      title: `${schema}.${tableName}`,
      connectionId,
      database,
      objectName: `${schema}.${tableName}`,
      state: {
        loading: true,
        error: null,
        data: null,
        schema: null,
        activeTab: "data",
        page: 0,
        totalRows: 0,
        pageSize: 100,
        filters: [],
      },
    };
    addTab(tab, loadTableData);
  };

  const addViewTab = (
    connectionId: string,
    database: string,
    schema: string,
    viewName: string,
    targetLine?: number
  ) => {
    const tabId = `view-${connectionId}-${database}-${schema}.${viewName}`;
    const existingTab = tabs.value.find((t) => t.id === tabId) as ViewTab;
    if (existingTab) {
      if (targetLine) {
        existingTab.state.targetLine = targetLine;
        existingTab.state.activeTab = "definition";
      }
      activeTab.value = existingTab;
      return;
    }

    const tab: ViewTab = {
      id: tabId,
      type: "view",
      title: `${schema}.${viewName}`,
      connectionId,
      database,
      objectName: `${schema}.${viewName}`,
      state: {
        loading: true,
        error: null,
        data: null,
        columns: [],
        definition: "",
        page: 0,
        pageSize: 100,
        totalRows: 0,
        activeTab: targetLine ? "definition" : "data",
        targetLine,
      },
    };
    addTab(tab, loadViewData);
  };

  const addProcedureTab = (
    connectionId: string,
    database: string,
    schema: string,
    procedureName: string,
    targetLine?: number
  ) => {
    const tabId = `procedure-${connectionId}-${database}-${schema}.${procedureName}`;
    const existingTab = tabs.value.find((t) => t.id === tabId) as ProcedureTab;
    if (existingTab) {
      if (targetLine) {
        existingTab.state.targetLine = targetLine;
        existingTab.state.activeTab = "definition";
      }
      activeTab.value = existingTab;
      return;
    }

    const tab: ProcedureTab = {
      id: tabId,
      type: "procedure",
      title: `${schema}.${procedureName}`,
      connectionId,
      database,
      objectName: `${schema}.${procedureName}`,
      state: {
        loading: true,
        error: null,
        info: null,
        content: "",
        activeTab: targetLine ? "definition" : "info",
        targetLine,
      },
    };
    addTab(tab, loadProcedureData);
  };

  const addQueryTab = (connectionId: string, database: string) => {
    const tabId = `query-${Date.now()}`;
    addTab({
      id: tabId,
      type: "query",
      title: "Query",
      connectionId,
      database,
    });
  };

  const closeTab = (tab: Tab) => {
    const index = tabs.value.findIndex((t) => t === tab);
    if (index > -1) {
      tabs.value.splice(index, 1);
      if (activeTab.value === tab) {
        if (tabs.value.length > 0) {
          activeTab.value = tabs.value[Math.min(index, tabs.value.length - 1)];
        }
      }
    }
  };

  const setActiveTab = (tab: Tab) => {
    activeTab.value = tab;
  };

  return {
    tabs,
    activeTab,
    addTab,
    addTableTab,
    addViewTab,
    addProcedureTab,
    addQueryTab,
    closeTab,
    setActiveTab,
  };
});
