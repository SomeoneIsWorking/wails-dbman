import { ref } from "vue";
import { loadTableData } from "../utils/tableDataLoader";
import type { cache } from "wailsjs/go/models";
import { defineStore } from "pinia";

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
  objectName: string;
} & CommonTab;

export type ViewTab = {
  type: "view";
  objectName: string;
} & CommonTab;

export type Tab = QueryTab | TableTab | ProcedureTab | ViewTab;

export type DataState = {
  tableData: any[];
  tableColumns: string[];
  totalRows: number;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  error?: string;
};

type ErrorState = {
  type: "error";
  error: any;
};

type LoadingState = {
  type: "loading";
};

type SuccessState<T> = {
  type: "success";
} & T;

export type AnyState<T> = ErrorState | LoadingState | SuccessState<T>;

export type TableTabState = AnyState<{
  data: cache.TableDataResponse;
  schema: cache.TableResponse;
}> & {
  page: number;
  pageSize: number;
  activeTab: "data" | "schema";
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
        activeTab: "data",
        type: "loading",
        page: 0,
        pageSize: 100,
      },
    };
    addTab(tab, loadTableData);
  };

  const addViewTab = (
    connectionId: string,
    database: string,
    schema: string,
    viewName: string
  ) => {
    const tabId = `view-${connectionId}-${database}-${schema}.${viewName}`;
    addTab({
      id: tabId,
      type: "view",
      title: `${schema}.${viewName}`,
      connectionId,
      database,
      objectName: `${schema}.${viewName}`,
    });
  };

  const addProcedureTab = (
    connectionId: string,
    database: string,
    schema: string,
    procedureName: string
  ) => {
    const tabId = `procedure-${connectionId}-${database}-${schema}.${procedureName}`;
    addTab({
      id: tabId,
      type: "procedure",
      title: `${schema}.${procedureName}`,
      connectionId,
      database,
      objectName: `${schema}.${procedureName}`,
    });
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
