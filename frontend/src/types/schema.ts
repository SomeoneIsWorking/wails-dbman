export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  primary?: boolean;
  unique?: boolean;
  foreign?: boolean;
  comment?: string;
  default?: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

export interface ForeignKeyInfo {
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
}

export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  primaryKey?: string[];
  foreignKeys?: ForeignKeyInfo[];
}

export interface ViewInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  definition?: string;
}

export interface StoredProcedureParameter {
  name: string;
  type: string;
  mode: string;
  defaultValue?: string;
}

export interface StoredProcedureResultSet {
  columns: ColumnInfo[];
}

export interface StoredProcedureInfo {
  name: string;
  schema: string;
  parameters: StoredProcedureParameter[];
  resultSets: StoredProcedureResultSet[];
  definition?: string;
  cached?: boolean;
  lastCached?: string;
}

export interface StoredProcedureDetails {
  definition: string;
  parameters: StoredProcedureParameter[];
  resultSets: StoredProcedureResultSet[];
}

export interface ProcedureState {
  state: 'waiting' | 'loading' | 'loaded' | 'failed';
  error?: string;
  lastAttempt?: number;
  lastUpdated: number;
}

export interface SchemaInfo {
  tables: TableInfo[];
  views: ViewInfo[];
  storedProcedures: StoredProcedureInfo[];
  loadingStates?: Record<string, ProcedureState>;
}

export interface DatabaseInfo {
  name: string;
}

export interface ConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface TableIdentifier {
  schema: string;
  tableName: string;
}

export interface ViewIdentifier {
  schema: string;
  viewName: string;
}

export interface TableInfoAccessor {
  // Bulk operations only
  getMultipleTableColumns(tableNames: TableIdentifier[]): Promise<Map<string, ColumnInfo[]>>;
  getMultipleViewColumns(viewNames: ViewIdentifier[]): Promise<Map<string, ColumnInfo[]>>;
  getProcedureDefinition(schema: string, name: string): Promise<string>;
  
  disconnect(): Promise<void>;
}