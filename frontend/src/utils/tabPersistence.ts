import type { Tab, QueryTab, TableTab, ViewTab, ProcedureTab } from "../stores/tabsStore";

export type PersistentQueryTabState = {
  content: string;
  resultHeight: number;
};

export type PersistentTableTabState = {
  page: number;
  pageSize: number;
  activeTab: "data" | "schema";
  filters: any[];
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
};

export type PersistentViewTabState = {
  page: number;
  pageSize: number;
  activeTab: "data" | "definition" | "schema";
  targetLine?: number;
};

export type PersistentProcedureTabState = {
  activeTab: "info" | "definition" | "query";
  targetLine?: number;
};

export type PersistentTabState = 
  | PersistentQueryTabState 
  | PersistentTableTabState 
  | PersistentViewTabState 
  | PersistentProcedureTabState;

// Map tab state to persistent state
export function mapToPersistent(tab: Tab): string {
  if (tab.type === "query") {
    return mapToPersistentQuery(tab as QueryTab);
  } else if (tab.type === "table") {
    return mapToPersistentTable(tab as TableTab);
  } else if (tab.type === "view") {
    return mapToPersistentView(tab as ViewTab);
  } else if (tab.type === "procedure") {
    return mapToPersistentProcedure(tab as ProcedureTab);
  }
  return "{}";
}

export function mapToPersistentQuery(tab: QueryTab): string {
  const persistentState: PersistentQueryTabState = {
    content: tab.state.content,
    resultHeight: tab.state.resultHeight,
  };
  return JSON.stringify(persistentState);
}

export function mapToPersistentTable(tab: TableTab): string {
  const persistentState: PersistentTableTabState = {
    page: tab.state.page,
    pageSize: tab.state.pageSize,
    activeTab: tab.state.activeTab,
    filters: tab.state.filters,
    sortColumn: tab.state.sortColumn,
    sortDirection: tab.state.sortDirection,
  };
  return JSON.stringify(persistentState);
}

export function mapToPersistentView(tab: ViewTab): string {
  const persistentState: PersistentViewTabState = {
    page: tab.state.page,
    pageSize: tab.state.pageSize,
    activeTab: tab.state.activeTab,
    targetLine: tab.state.targetLine,
  };
  return JSON.stringify(persistentState);
}

export function mapToPersistentProcedure(tab: ProcedureTab): string {
  const persistentState: PersistentProcedureTabState = {
    activeTab: tab.state.activeTab,
    targetLine: tab.state.targetLine,
  };
  return JSON.stringify(persistentState);
}

// Map persistent data back to full state
export function mapFromPersistent(data: string, tabType: Tab["type"]): any {
  try {
    const persistentState = JSON.parse(data);
    
    if (tabType === "query") {
      return mapFromPersistentQuery(persistentState);
    } else if (tabType === "table") {
      return mapFromPersistentTable(persistentState);
    } else if (tabType === "view") {
      return mapFromPersistentView(persistentState);
    } else if (tabType === "procedure") {
      return mapFromPersistentProcedure(persistentState);
    }
  } catch {
    // Fall back to default state
  }
  
  // Return default state based on type
  return getDefaultState(tabType);
}

export function mapFromPersistentQuery(persistentState: any) {
  return {
    content: persistentState.content || "SELECT * FROM Users LIMIT 100;",
    loading: false,
    error: null,
    resultHeight: persistentState.resultHeight || 250,
  };
}

export function mapFromPersistentTable(persistentState: any) {
  return {
    loading: false, // Don't auto-load data for restored tabs
    error: null,
    data: null,
    schema: null,
    page: persistentState.page || 0,
    pageSize: persistentState.pageSize || 100,
    totalRows: 0,
    activeTab: persistentState.activeTab || "data",
    filters: persistentState.filters || [],
    sortColumn: persistentState.sortColumn,
    sortDirection: persistentState.sortDirection,
  };
}

export function mapFromPersistentView(persistentState: any) {
  return {
    loading: false, // Don't auto-load data for restored tabs
    error: null,
    data: null,
    columns: [],
    definition: "",
    page: persistentState.page || 0,
    pageSize: persistentState.pageSize || 100,
    totalRows: 0,
    activeTab: persistentState.activeTab || "data",
    targetLine: persistentState.targetLine,
  };
}

export function mapFromPersistentProcedure(persistentState: any) {
  return {
    loading: false, // Don't auto-load data for restored tabs
    error: null,
    info: null,
    content: "",
    activeTab: persistentState.activeTab || "info",
    targetLine: persistentState.targetLine,
  };
}

function getDefaultState(tabType: Tab["type"]) {
  if (tabType === "query") {
    return {
      content: "SELECT * FROM Users LIMIT 100;",
      loading: false,
      error: null,
      resultHeight: 250,
    };
  } else if (tabType === "table") {
    return {
      loading: false,
      error: null,
      data: null,
      schema: null,
      page: 0,
      pageSize: 100,
      totalRows: 0,
      activeTab: "data",
      filters: [],
    };
  } else if (tabType === "view") {
    return {
      loading: false,
      error: null,
      data: null,
      columns: [],
      definition: "",
      page: 0,
      pageSize: 100,
      totalRows: 0,
      activeTab: "data",
    };
  } else if (tabType === "procedure") {
    return {
      loading: false,
      error: null,
      info: null,
      content: "",
      activeTab: "info",
    };
  }
  
  return {};
}