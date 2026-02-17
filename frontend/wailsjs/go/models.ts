export namespace cache {
	
	export interface QueryHistory {
	    id: string;
	    connectionId: string;
	    query: string;
	    result?: string;
	    error?: string;
	    executedAt: string;
	    Connection: Connection;
	}
	export interface ResultSetColumn {
	    id: string;
	    resultSetId: string;
	    name: string;
	    dataType: string;
	    isNullable: boolean;
	    maxLength?: number;
	    precision?: number;
	    scale?: number;
	    ordinalPosition: number;
	    ResultSet: ProcedureResultSet;
	}
	export interface ProcedureResultSet {
	    id: string;
	    procedureId: string;
	    resultSetIndex: number;
	    name?: string;
	    Procedure: CachedProcedure;
	    Columns: ResultSetColumn[];
	}
	export interface ProcedureParameter {
	    id: string;
	    procedureId: string;
	    name: string;
	    dataType: string;
	    direction: string;
	    defaultValue?: string;
	    isNullable: boolean;
	    maxLength?: number;
	    precision?: number;
	    scale?: number;
	    ordinalPosition: number;
	    Procedure: CachedProcedure;
	}
	export interface CachedProcedure {
	    id: string;
	    schemaId: string;
	    schema: string;
	    procedureName: string;
	    definition?: string;
	    definitionReadError?: string;
	    parametersCached: boolean;
	    parametersReadError?: string;
	    resultSetsCached: boolean;
	    resultSetsReadError?: string;
	    failedToLoad: boolean;
	    failureReason?: string;
	    createdAt: string;
	    updatedAt: string;
	    CachedSchema: CachedSchema;
	    Parameters: ProcedureParameter[];
	    ResultSets: ProcedureResultSet[];
	}
	export interface CachedViewColumn {
	    id: string;
	    viewId: string;
	    name: string;
	    dataType: string;
	    isNullable: boolean;
	    defaultValue?: string;
	    maxLength?: number;
	    precision?: number;
	    scale?: number;
	    ordinalPosition: number;
	    View: CachedView;
	}
	export interface CachedView {
	    id: string;
	    schemaId: string;
	    name: string;
	    schema: string;
	    definition?: string;
	    updatedAt: string;
	    CachedSchema: CachedSchema;
	    Columns: CachedViewColumn[];
	}
	export interface CachedTableForeignKey {
	    id: string;
	    tableId: string;
	    columnName: string;
	    referencedTable: string;
	    referencedColumn: string;
	    ordinalPosition: number;
	    Table: CachedTable;
	}
	export interface CachedTablePrimaryKey {
	    id: string;
	    tableId: string;
	    columnName: string;
	    ordinalPosition: number;
	    Table: CachedTable;
	}
	export interface CachedTableColumn {
	    id: string;
	    tableId: string;
	    name: string;
	    dataType: string;
	    isNullable: boolean;
	    defaultValue?: string;
	    isPrimary: boolean;
	    isUnique: boolean;
	    isForeign: boolean;
	    comment?: string;
	    maxLength?: number;
	    precision?: number;
	    scale?: number;
	    ordinalPosition: number;
	    Table: CachedTable;
	}
	export interface CachedTable {
	    id: string;
	    schemaId: string;
	    name: string;
	    schema: string;
	    updatedAt: string;
	    CachedSchema: CachedSchema;
	    Columns: CachedTableColumn[];
	    PrimaryKeys: CachedTablePrimaryKey[];
	    ForeignKeys: CachedTableForeignKey[];
	}
	export interface CachedSchema {
	    id: string;
	    connectionId: string;
	    database: string;
	    updatedAt: string;
	    Connection: Connection;
	    Tables: CachedTable[];
	    Views: CachedView[];
	    Procedures: CachedProcedure[];
	}
	export interface Connection {
	    id: string;
	    name: string;
	    type: string;
	    host: string;
	    port: number;
	    username?: string;
	    password?: string;
	    database?: string;
	    hiddenDatabases: string;
	    showHidden: boolean;
	    createdAt: string;
	    updatedAt: string;
	    Databases: CachedDatabase[];
	    Schemas: CachedSchema[];
	    QueryHistories: QueryHistory[];
	}
	export interface CachedDatabase {
	    id: string;
	    connectionId: string;
	    name: string;
	    updatedAt: string;
	    Connection: Connection;
	}
	
	
	
	
	
	
	
	
	export interface ColumnResponse {
	    name: string;
	    type: string;
	    nullable: boolean;
	    defaultValue?: string;
	    primary: boolean;
	    unique: boolean;
	    foreign: boolean;
	    comment?: string;
	}
	
	export interface ResultSetColumnResponse {
	    name: string;
	    type: string;
	    nullable: boolean;
	    maxLength?: number;
	    precision?: number;
	    scale?: number;
	}
	export interface ResultSetResponse {
	    columns: ResultSetColumnResponse[];
	}
	export interface ProcedureParameterResponse {
	    name: string;
	    type: string;
	    mode: string;
	    defaultValue?: string;
	    isNullable: boolean;
	    maxLength?: number;
	    precision?: number;
	    scale?: number;
	}
	export interface ProcedureResponse {
	    name: string;
	    schema: string;
	    parameters: ProcedureParameterResponse[];
	    resultSets: ResultSetResponse[];
	    definition?: string;
	    cached: boolean;
	    lastCached: string;
	}
	export interface ViewResponse {
	    name: string;
	    schema: string;
	    columns: ColumnResponse[];
	    definition?: string;
	}
	export interface ForeignKeyResponse {
	    columns: string[];
	    referencedTable: string;
	    referencedColumns: string[];
	}
	export interface TableResponse {
	    name: string;
	    schema: string;
	    columns: ColumnResponse[];
	    primaryKey: string[];
	    foreignKeys: ForeignKeyResponse[];
	}
	export interface SchemaResponse {
	    tables: TableResponse[];
	    views: ViewResponse[];
	    storedProcedures: ProcedureResponse[];
	    updatedAt: string;
	}
	export interface DatabaseDetail {
	    name: string;
	    schema?: SchemaResponse;
	    loaded: boolean;
	}
	export interface ConnectionDetail {
	    id: string;
	    name: string;
	    type: string;
	    host: string;
	    port: number;
	    username?: string;
	    password?: string;
	    database?: string;
	    hiddenDatabases: string;
	    showHidden: boolean;
	    databases: DatabaseDetail[];
	    lastError?: string;
	    hasError: boolean;
	}
	
	export interface ResultSet {
	    data: any[];
	    columns: string[];
	    rowsAffected: number;
	}
	export interface ExecuteQueryResponse {
	    resultSets: ResultSet[];
	    elapsedMs: number;
	}
	export interface Filter {
	    column: string;
	    operator: string;
	    value: any;
	}
	
	export interface ParameterInfo {
	    name: string;
	    type: string;
	    mode: string;
	    defaultValue?: string;
	    isNullable: boolean;
	    maxLength?: number;
	    precision?: number;
	    scale?: number;
	}
	
	
	
	
	
	
	
	export interface ResultSetColumnInfo {
	    name: string;
	    type: string;
	    nullable: boolean;
	    maxLength?: number;
	    precision?: number;
	    scale?: number;
	}
	
	export interface ResultSetInfo {
	    columns: ResultSetColumnInfo[];
	}
	
	
	export interface StoredProcedureInfo {
	    name: string;
	    schema: string;
	    parameters: ParameterInfo[];
	    resultSets: ResultSetInfo[];
	    definition?: string;
	    cached: boolean;
	    lastCached: string;
	}
	export interface Tab {
	    id: string;
	    type: string;
	    title: string;
	    connectionId: string;
	    database: string;
	    objectName?: string;
	    data: string;
	    createdAt: string;
	    updatedAt: string;
	}
	export interface TableDataResponse {
	    results: any[];
	    total: number;
	}
	

}

export namespace main {
	
	export interface GetTableDataCountRequest {
	    connectionId: string;
	    database: string;
	    schema: string;
	    tableName: string;
	    filters: cache.Filter[];
	}
	export interface GetTableDataRequest {
	    connectionId: string;
	    database: string;
	    schema: string;
	    tableName: string;
	    page: number;
	    limit: number;
	    filters: cache.Filter[];
	    sortColumn?: string;
	    sortDirection?: string;
	}

}

export namespace models {
	
	export interface ConnectionPostModel {
	    name: string;
	    type: string;
	    host: string;
	    port: number;
	    username?: string;
	    password?: string;
	    database?: string;
	}

}

export namespace search {
	
	export interface SearchResult {
	    id: string;
	    name: string;
	    path: string;
	    type: string;
	    connectionId: string;
	    database: string;
	    schema?: string;
	    objectName?: string;
	    matchedText?: string;
	    matchReason?: string;
	    lineNumber?: number;
	}

}

