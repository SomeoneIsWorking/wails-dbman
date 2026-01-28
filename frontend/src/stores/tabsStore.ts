import { ref } from "vue";
import { loadTableData } from "../utils/tableDataLoader";
import { loadViewData } from "../utils/viewDataLoader";
import { loadProcedureData } from "../utils/procedureDataLoader";
import type { cache } from "wailsjs/go/models";
import { SaveTab, LoadTabs, DeleteTab } from "wailsjs/go/main/App";
import { defineStore } from "pinia";
import type { ColumnInfo } from "../types/schema";
import { mapToPersistent, mapFromPersistent } from "../utils/tabPersistence";

type CommonTab = {
  id: string;
  title: string;
  connectionId: string;
  database: string;
};

export type QueryTabState = {
  content: string;
  loading: boolean;
  error: string | null;
  results?: any;
  resultHeight: number;
};

export type QueryTab = {
  type: "query";
  state: QueryTabState;
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
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
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

// Helper functions for tab persistence
const serializeTabData = (tab: Tab): string => {
  return mapToPersistent(tab);
};

const deserializeTabData = (data: string, tabType: Tab["type"]): any => {
  return mapFromPersistent(data, tabType);
};

const saveTabToBackend = async (tab: Tab) => {
  const objectName = "objectName" in tab ? tab.objectName || "" : "";
  await SaveTab(
    tab.id,
    tab.type,
    tab.title,
    tab.connectionId,
    tab.database,
    objectName,
    serializeTabData(tab)
  );
};

const deleteTabFromBackend = async (tabId: string) => {
  await DeleteTab(tabId);
};

const loadTabsFromBackend = async (): Promise<Tab[]> => {
  const backendTabs = await LoadTabs();
  return backendTabs.map(backendTab => {
    const state = backendTab.data ? deserializeTabData(backendTab.data, backendTab.type as Tab["type"]) : deserializeTabData("{}", backendTab.type as Tab["type"]);
    
    const baseTab = {
      id: backendTab.id,
      type: backendTab.type as Tab["type"],
      title: backendTab.title,
      connectionId: backendTab.connectionId,
      database: backendTab.database,
      state,
    };

    if (backendTab.type === "query") {
      return baseTab as QueryTab;
    } else {
      return { ...baseTab, objectName: backendTab.objectName || "" } as TableTab | ViewTab | ProcedureTab;
    }
  });
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
    
    // Save tab to backend
    saveTabToBackend(addedTab);
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
      objectName: `${database}.${schema}.${tableName}`,
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
      objectName: `${database}.${schema}.${viewName}`,
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
      objectName: `${database}.${schema}.${procedureName}`,
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
      state: {
        content: "SELECT * FROM Users LIMIT 100;",
        loading: false,
        error: null,
        resultHeight: 250,
      },
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
      // Delete tab from backend
      deleteTabFromBackend(tab.id);
    }
  };

  const setActiveTab = (tab: Tab) => {
    activeTab.value = tab;
  };

  const initTabs = async () => {
    const loadedTabs = await loadTabsFromBackend();
    tabs.value = loadedTabs;
    if (loadedTabs.length > 0) {
      activeTab.value = loadedTabs[0];
    }
  };

  // Initialize tabs from backend
  initTabs();

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
