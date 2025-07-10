import type {
  SchemaInfo,
  StoredProcedureDetails,
  ConnectionConfig,
} from "../../types/schema";

export abstract class BaseAdapter {
  protected config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  abstract listDatabases(): Promise<string[]>;
  abstract getSchema(database: string): Promise<SchemaInfo>;
  abstract executeQuery(query: string, database: string): Promise<any[]>;

  abstract getTableData(
    database: string,
    schema: string,
    tableName: string,
    options: { page: number; limit: number }
  ): Promise<{ results: any[]; total: number }>;

  abstract getProcedureDetails(
    database: string,
    schema: string,
    name: string
  ): Promise<StoredProcedureDetails>;
}
