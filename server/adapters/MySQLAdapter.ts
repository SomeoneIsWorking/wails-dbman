import { createConnection, createPool, type Pool } from "mysql2/promise";
import { BaseAdapter } from "./BaseAdapter";
import type { SchemaInfo, StoredProcedureDetails } from "../../types/schema";

export class MySQLAdapter extends BaseAdapter {
  private pool: Pool | null = null;

  private async getPool(database: string): Promise<Pool> {
    if (!this.pool) {
      this.pool = createPool({
        host: this.config.host,
        port: this.config.port,
        database,
        user: this.config.username,
        password: this.config.password,
      });
    }
    return this.pool;
  }

  async listDatabases(): Promise<string[]> {
    const conn = await createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
    });

    try {
      const [rows] = await conn.query("SHOW DATABASES");
      return (rows as any[]).map((row) => row.Database);
    } finally {
      await conn.end();
    }
  }

  async getSchema(database: string): Promise<SchemaInfo> {
    const conn = await createConnection({
      host: this.config.host,
      port: this.config.port,
      database,
      user: this.config.username,
      password: this.config.password,
    });

    try {
      // Get tables and columns
      const [tables] = await conn.query(
        `
        SELECT 
          TABLE_SCHEMA,
          TABLE_NAME,
          GROUP_CONCAT(COLUMN_NAME) as columns,
          GROUP_CONCAT(DATA_TYPE) as types,
          GROUP_CONCAT(IS_NULLABLE) as nullables,
          GROUP_CONCAT(COLUMN_DEFAULT) as defaults
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = ?
        GROUP BY TABLE_SCHEMA, TABLE_NAME
      `,
        [database]
      );

      // Get primary keys
      const [pks] = await conn.query(
        `
        SELECT 
          TABLE_SCHEMA,
          TABLE_NAME,
          GROUP_CONCAT(COLUMN_NAME) as pk_columns
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ? AND CONSTRAINT_NAME = 'PRIMARY'
        GROUP BY TABLE_SCHEMA, TABLE_NAME
      `,
        [database]
      );

      // Get foreign keys
      const [fks] = await conn.query(
        `
        SELECT 
          TABLE_SCHEMA,
          TABLE_NAME,
          GROUP_CONCAT(COLUMN_NAME) as fk_columns,
          GROUP_CONCAT(REFERENCED_TABLE_SCHEMA) as referenced_schemas,
          GROUP_CONCAT(REFERENCED_TABLE_NAME) as referenced_tables,
          GROUP_CONCAT(REFERENCED_COLUMN_NAME) as referenced_columns,
          CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
        GROUP BY TABLE_SCHEMA, TABLE_NAME, CONSTRAINT_NAME
      `,
        [database]
      );

      // Get views
      const [views] = await conn.query(
        `
        SELECT 
          v.TABLE_SCHEMA,
          v.TABLE_NAME,
          v.VIEW_DEFINITION,
          GROUP_CONCAT(c.COLUMN_NAME) as columns,
          GROUP_CONCAT(c.DATA_TYPE) as types
        FROM information_schema.VIEWS v
        JOIN information_schema.COLUMNS c 
          ON c.TABLE_SCHEMA = v.TABLE_SCHEMA 
          AND c.TABLE_NAME = v.TABLE_NAME
        WHERE v.TABLE_SCHEMA = ?
        GROUP BY v.TABLE_SCHEMA, v.TABLE_NAME, v.VIEW_DEFINITION
      `,
        [database]
      );

      // Get stored procedures
      const [procs] = await conn.query(
        `
        SELECT 
          ROUTINE_SCHEMA,
          ROUTINE_NAME as name,
          GROUP_CONCAT(PARAMETER_NAME) as parameters
        FROM information_schema.PARAMETERS
        WHERE SPECIFIC_SCHEMA = ?
        GROUP BY ROUTINE_SCHEMA, ROUTINE_NAME
      `,
        [database]
      );

      function splitIfString(value: string | null) {
        return value ? value.split(",") : [];
      }

      return {
        tables: (tables as any[]).map((row: any) => ({
          name: row.TABLE_NAME,
          schema: row.TABLE_SCHEMA,
          columns: splitIfString(row.columns).map((col: string, i: number) => ({
            name: col,
            type: splitIfString(row.types)[i],
            nullable: splitIfString(row.nullables)[i] === "YES",
            defaultValue: splitIfString(row.defaults)[i],
            primary: (pks as any[])
              .find(
                (pk: any) =>
                  pk.TABLE_SCHEMA === row.TABLE_SCHEMA &&
                  pk.TABLE_NAME === row.TABLE_NAME
              )
              ?.pk_columns?.split(",")
              .includes(col),
            unique: false, // TODO: Add unique constraint detection
            foreign: (fks as any[])
              .filter(
                (fk: any) =>
                  fk.TABLE_SCHEMA === row.TABLE_SCHEMA &&
                  fk.TABLE_NAME === row.TABLE_NAME
              )
              .some((fk: any) => splitIfString(fk.fk_columns).includes(col))
          })),
          primaryKey:
            (pks as any[])
              .find(
                (pk: any) =>
                  pk.TABLE_SCHEMA === row.TABLE_SCHEMA &&
                  pk.TABLE_NAME === row.TABLE_NAME
              )
              ?.pk_columns?.split(",") || [],
          foreignKeys: (fks as any[])
            .filter(
              (fk: any) =>
                fk.TABLE_SCHEMA === row.TABLE_SCHEMA &&
                fk.TABLE_NAME === row.TABLE_NAME
            )
            .map((fk: any) => ({
              columns: splitIfString(fk.fk_columns),
              referencedTable: `${splitIfString(fk.referenced_schemas)[0]}.${
                splitIfString(fk.referenced_tables)[0]
              }`,
              referencedColumns: splitIfString(fk.referenced_columns),
            })),
        })),
        views: (views as any[]).map((row: any) => ({
          name: row.TABLE_NAME,
          schema: row.TABLE_SCHEMA,
          definition: row.VIEW_DEFINITION,
          columns: splitIfString(row.columns).map((col: string, i: number) => ({
            name: col,
            type: splitIfString(row.types)[i],
            nullable: true,
          })),
        })),
        storedProcedures: (procs as any[]).map((row: any) => ({
          name: row.name,
          schema: row.ROUTINE_SCHEMA,
          definition: "",
          resultSets: [],
          parameters: row.parameters ? row.parameters.split(",") : [],
        })),
      };
    } finally {
      await conn.end();
    }
  }

  async executeQuery(query: string, database: string): Promise<any[]> {
    const conn = await createConnection({
      host: this.config.host,
      port: this.config.port,
      database,
      user: this.config.username,
      password: this.config.password,
    });

    try {
      const [rows] = await conn.query(query);
      return rows as any[];
    } finally {
      await conn.end();
    }
  }

  async getTableData(
    database: string,
    schema: string,
    tableName: string,
    options: { page: number; limit: number }
  ): Promise<{ results: any[]; total: number }> {
    const pool = await this.getPool(database);

    const offset = (options.page - 1) * options.limit;
    const quotedTable = `\`${schema}\`.\`${tableName}\``;
    
    // Get total count
    const [countRows] = await pool.execute(`SELECT COUNT(*) as count FROM ${quotedTable}`);
    const total = (countRows as any[])[0].count;
    
    // Get paginated data
    const [dataRows] = await pool.execute(
      `SELECT * FROM ${quotedTable} LIMIT ? OFFSET ?`,
      [options.limit, offset]
    );
    
    return {
      results: dataRows as any[],
      total
    };
  }

  async closePool(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async getProcedureDetails(
    database: string,
    schema: string,
    name: string
  ): Promise<StoredProcedureDetails> {
    const conn = await createConnection({
      host: this.config.host,
      port: this.config.port,
      database: database,
      user: this.config.username,
      password: this.config.password,
    });

    try {
      // Get procedure definition
      const [defResult] = await conn.query(
        `
        SELECT ROUTINE_DEFINITION
        FROM information_schema.ROUTINES
        WHERE ROUTINE_SCHEMA = ? AND ROUTINE_NAME = ?
      `,
        [schema, name]
      );

      // Get parameters
      const [paramsResult] = await conn.query(
        `
        SELECT 
          PARAMETER_NAME,
          DATA_TYPE,
          PARAMETER_MODE,
          PARAMETER_DEFAULT
        FROM information_schema.PARAMETERS
        WHERE SPECIFIC_SCHEMA = ? AND SPECIFIC_NAME = ?
        ORDER BY ORDINAL_POSITION
      `,
        [schema, name]
      );

      return {
        definition: (defResult as any[])[0]?.ROUTINE_DEFINITION || "",
        parameters: (paramsResult as any[]).map((param) => ({
          name: param.PARAMETER_NAME,
          type: param.DATA_TYPE,
          mode: param.PARAMETER_MODE as "IN" | "OUT" | "INOUT",
          defaultValue: param.PARAMETER_DEFAULT,
        })),
        resultSets: [], // MySQL doesn't provide result set information in information_schema
      };
    } finally {
      await conn.end();
    }
  }
}
