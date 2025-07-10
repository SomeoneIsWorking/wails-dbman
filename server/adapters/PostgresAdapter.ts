import pg, { Pool } from "pg";
import { groupBy } from "lodash-es";
import { BaseAdapter } from "./BaseAdapter";
import type {
  SchemaInfo,
  StoredProcedureDetails,
  StoredProcedureInfo,
} from "~/types/schema";

export class PostgresAdapter extends BaseAdapter {
  private pool: Pool | null = null;

  private getClientConfig(): pg.ClientConfig {
    const config = {
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
    };
    console.log("[PostgresAdapter] Connecting with config:", {
      ...config,
      password: "***",
    });
    return config;
  }

  async listDatabases(): Promise<string[]> {
    console.log("[PostgresAdapter] Listing databases");
    // For listing databases, we need to connect to postgres database
    const client = new pg.Client(this.getClientConfig());
    try {
      await client.connect();
      console.log("[PostgresAdapter] Connected successfully");
      const result = await client.query(
        "SELECT datname FROM pg_database WHERE datistemplate = false;"
      );
      console.log("[PostgresAdapter] Found databases:", result.rows);
      return result.rows.map((row) => row.datname);
    } catch (error) {
      console.error("[PostgresAdapter] Error listing databases:", error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async getSchema(database: string): Promise<SchemaInfo> {
    console.log(`[PostgresAdapter] Getting schema for database: ${database}`);
    // Connect to the specified database, not postgres
    const client = new pg.Client(this.getClientConfig());

    try {
      await client.connect();
      console.log(
        "[PostgresAdapter] Connected successfully to database:",
        database
      );

      // Set search_path to include all non-system schemas
      await client.query('SET search_path TO public, "$user"');

      // Debug query to check available schemas and tables with better visibility
      const debugQuery = `
        SELECT 
          n.nspname as schema_name,
          COUNT(CASE WHEN t.relkind IN ('r', 'p', 'v') THEN 1 END) as table_count,
          string_agg(DISTINCT t.relname, ', ') as table_names,
          string_agg(DISTINCT t.relkind, ', ') as table_kinds
        FROM pg_namespace n
        LEFT JOIN pg_class t ON t.relnamespace = n.oid
        WHERE n.nspname NOT IN ('pg_toast', 'pg_temp_1', 'pg_toast_temp_1', 'pg_catalog', 'information_schema')
          AND (
            pg_catalog.has_schema_privilege(current_user, n.nspname, 'USAGE') OR
            has_schema_privilege(n.oid, 'CREATE')
          )
        GROUP BY n.nspname
        ORDER BY n.nspname;
      `;
      const debugResult = await client.query(debugQuery);
      console.log(
        "[PostgresAdapter] Available schemas and tables:",
        debugResult.rows
      );

      // Get tables and their columns with better visibility
      const columnsQuery = `
        SELECT 
          n.nspname as schema_name,
          t.relname as table_name,
          a.attname as column_name,
          pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
          a.attnotnull as not_null,
          pg_get_expr(d.adbin, d.adrelid) as column_default,
          t.relkind as table_type
        FROM pg_catalog.pg_namespace n
        JOIN pg_catalog.pg_class t ON t.relnamespace = n.oid
        JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid
        LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = t.oid AND d.adnum = a.attnum
        WHERE t.relkind IN ('r', 'p')
          AND a.attnum > 0
          AND NOT a.attisdropped
          AND n.nspname NOT IN ('pg_toast', 'pg_temp_1', 'pg_toast_temp_1', 'pg_catalog', 'information_schema')
          AND (
            pg_catalog.has_schema_privilege(current_user, n.nspname, 'USAGE') OR
            has_schema_privilege(n.oid, 'CREATE')
          )
          AND pg_catalog.has_table_privilege(current_user, t.oid, 'SELECT')
        ORDER BY n.nspname, t.relname, a.attnum;
      `;
      const columnsResult = await client.query(columnsQuery);
      console.log(
        "[PostgresAdapter] Found columns:",
        columnsResult.rows.length
      );
      const tableColumns = groupBy(
        columnsResult.rows,
        (row) => `${row.schema_name}.${row.table_name}`
      );

      // Get primary keys with better visibility
      const pksQuery = `
        SELECT 
          n.nspname as schema_name,
          t.relname as table_name,
          array_agg(a.attname) as pk_columns
        FROM pg_catalog.pg_class t
        JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_catalog.pg_index i ON i.indrelid = t.oid
        JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
        WHERE i.indisprimary
          AND n.nspname NOT IN ('pg_toast', 'pg_temp_1', 'pg_toast_temp_1', 'pg_catalog', 'information_schema')
          AND (
            pg_catalog.has_schema_privilege(current_user, n.nspname, 'USAGE') OR
            has_schema_privilege(n.oid, 'CREATE')
          )
          AND pg_catalog.has_table_privilege(current_user, t.oid, 'SELECT')
        GROUP BY n.nspname, t.relname;
      `;
      const pksResult = await client.query(pksQuery);
      console.log(
        "[PostgresAdapter] Found primary keys:",
        pksResult.rows.length
      );
      const tablePrimaryKeys = groupBy(
        pksResult.rows,
        (row) => `${row.schema_name}.${row.table_name}`
      );

      // Get foreign keys with better visibility
      const fksQuery = `
        SELECT 
          n.nspname as schema_name,
          cl.relname as table_name,
          att.attname as column_name,
          rn.nspname as referenced_schema,
          rcl.relname as referenced_table,
          ratt.attname as referenced_column,
          c.conname as constraint_name
        FROM pg_catalog.pg_constraint c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.connamespace
        JOIN pg_catalog.pg_class cl ON cl.oid = c.conrelid
        JOIN pg_catalog.pg_attribute att ON att.attrelid = cl.oid AND att.attnum = ANY(c.conkey)
        JOIN pg_catalog.pg_namespace rn ON rn.oid = (SELECT relnamespace FROM pg_class WHERE oid = c.confrelid)
        JOIN pg_catalog.pg_class rcl ON rcl.oid = c.confrelid
        JOIN pg_catalog.pg_attribute ratt ON ratt.attrelid = rcl.oid AND ratt.attnum = ANY(c.confkey)
        WHERE c.contype = 'f'
          AND n.nspname NOT IN ('pg_toast', 'pg_temp_1', 'pg_toast_temp_1', 'pg_catalog', 'information_schema')
          AND (
            pg_catalog.has_schema_privilege(current_user, n.nspname, 'USAGE') OR
            has_schema_privilege(n.oid, 'CREATE')
          )
          AND pg_catalog.has_table_privilege(current_user, cl.oid, 'SELECT')
        ORDER BY n.nspname, cl.relname, c.conname;
      `;
      const fksResult = await client.query(fksQuery);
      console.log(
        "[PostgresAdapter] Found foreign keys:",
        fksResult.rows.length
      );
      const tableForeignKeys = groupBy(
        fksResult.rows,
        (row) => `${row.schema_name}.${row.table_name}`
      );

      // Get views with better visibility
      const viewsQuery = `
        SELECT 
          n.nspname as schema_name,
          v.relname as view_name,
          a.attname as column_name,
          pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
          vw.definition as view_definition
        FROM pg_catalog.pg_class v
        JOIN pg_catalog.pg_namespace n ON n.oid = v.relnamespace
        JOIN pg_catalog.pg_attribute a ON a.attrelid = v.oid
        LEFT JOIN pg_views vw ON vw.schemaname = n.nspname AND vw.viewname = v.relname
        WHERE v.relkind = 'v'
          AND a.attnum > 0
          AND n.nspname NOT IN ('pg_toast', 'pg_temp_1', 'pg_toast_temp_1', 'pg_catalog', 'information_schema')
          AND (
            pg_catalog.has_schema_privilege(current_user, n.nspname, 'USAGE') OR
            has_schema_privilege(n.oid, 'CREATE')
          )
          AND pg_catalog.has_table_privilege(current_user, v.oid, 'SELECT')
        ORDER BY n.nspname, v.relname, a.attnum;
      `;
      const viewsResult = await client.query(viewsQuery);
      console.log("[PostgresAdapter] Found views:", viewsResult.rows.length);
      const viewColumns = groupBy(
        viewsResult.rows,
        (row) => `${row.schema_name}.${row.view_name}`
      );

      // Get stored procedures with better visibility
      const procsQuery = `
        SELECT 
          n.nspname as schema_name,
          p.proname as name,
          pg_get_function_arguments(p.oid) as parameters
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname NOT IN ('pg_toast', 'pg_temp_1', 'pg_toast_temp_1', 'pg_catalog', 'information_schema')
          AND (
            pg_catalog.has_schema_privilege(current_user, n.nspname, 'USAGE') OR
            has_schema_privilege(n.oid, 'CREATE')
          )
        ORDER BY n.nspname, p.proname;
      `;
      const procsResult = await client.query(procsQuery);
      console.log(
        "[PostgresAdapter] Found stored procedures:",
        procsResult.rows.length
      );

      // Process tables
      const tables = Object.entries(tableColumns).map(([key, columns]) => {
        const [schema, name] = key.split(".");
        const primaryKey = tablePrimaryKeys[key]?.[0]?.pk_columns || [];

        const foreignKeys = Object.values(
          groupBy(tableForeignKeys[key] || [], "constraint_name")
        ).map((fkGroup) => ({
          columns: fkGroup.map((fk) => fk.column_name),
          referencedTable: `${fkGroup[0].referenced_schema}.${fkGroup[0].referenced_table}`,
          referencedColumns: fkGroup.map((fk) => fk.referenced_column),
        }));

        return {
          name,
          schema,
          columns: columns.map((col) => ({
            name: col.column_name,
            type: col.data_type,
            nullable: !col.not_null,
            defaultValue: col.column_default,
            primary: tablePrimaryKeys[key]?.[0]?.pk_columns?.includes(col.column_name),
            unique: false, // TODO: Add unique constraint detection
            foreign: tableForeignKeys[key]?.some(fk => fk.column_name === col.column_name)
          })),
          primaryKey,
          foreignKeys,
        };
      });

      // Process views
      const views = Object.entries(viewColumns).map(([key, columns]) => {
        const [schema, name] = key.split(".");
        // Get the view definition from the first column record (they're all the same)
        const viewDefinition = columns[0]?.view_definition;
        return {
          name,
          schema,
          definition: viewDefinition,
          columns: columns.map((col) => ({
            name: col.column_name,
            type: col.data_type,
            nullable: true,
          })),
        };
      });

      const result: SchemaInfo = {
        tables,
        views,
        storedProcedures: procsResult.rows.map(
          (row) =>
            ({
              name: row.name,
              schema: row.schema_name,
              parameters: row.parameters ? row.parameters.split(",") : [],
            } as StoredProcedureInfo)
        ),
      };

      console.log("[PostgresAdapter] Final schema result:", {
        tables: result.tables.length,
        views: result.views.length,
        storedProcedures: result.storedProcedures.length,
        tableDetails: result.tables.map(
          (t) => `${t.schema}.${t.name} (${t.columns.length} columns)`
        ),
      });

      return result;
    } catch (error) {
      console.error(
        `[PostgresAdapter] Error getting schema for database ${database}:`,
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  }

  async executeQuery(query: string, database: string): Promise<any[]> {
    console.log(`[PostgresAdapter] Executing query on database: ${database}`);
    // Connect to the specified database for query execution
    const client = new pg.Client(this.getClientConfig());
    try {
      await client.connect();
      console.log(
        "[PostgresAdapter] Connected successfully to database:",
        database
      );
      const result = await client.query(query);
      console.log("[PostgresAdapter] Query result:", result.rows);
      return result.rows;
    } catch (error) {
      console.error(
        `[PostgresAdapter] Error executing query on database ${database}:`,
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  }

  async getTableData(
    database: string,
    schema: string,
    tableName: string,
    options: { page: number; limit: number }
  ): Promise<{ results: any[]; total: number }> {
    const client = new pg.Client({
      ...this.getClientConfig(),
      database
    });

    try {
      await client.connect();
      
      const offset = (options.page - 1) * options.limit;
      const quotedTable = `"${schema}"."${tableName}"`;
      
      // Get total count
      const countResult = await client.query(`SELECT COUNT(*) FROM ${quotedTable}`);
      const total = parseInt(countResult.rows[0].count);
      
      // Get paginated data
      const dataResult = await client.query(
        `SELECT * FROM ${quotedTable} LIMIT $1 OFFSET $2`,
        [options.limit, offset]
      );
      
      return {
        results: dataResult.rows,
        total
      };
    } finally {
      await client.end();
    }
  }

  async getProcedureDetails(
    schema: string,
    name: string
  ): Promise<StoredProcedureDetails> {
    const client = new pg.Client(this.getClientConfig());
    await client.connect();

    try {
      // Get procedure definition and parameters
      const procedureInfo = await client.query(
        `
        SELECT 
          p.proname,
          pg_get_functiondef(p.oid) as definition,
          p.proargnames as param_names,
          p.proargmodes as param_modes,
          p.proallargtypes as param_types,
          p.proargdefaults as param_defaults
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = $1 AND p.proname = $2
      `,
        [schema, name]
      );

      if (procedureInfo.rows.length === 0) {
        throw new Error("Stored procedure not found");
      }

      const proc = procedureInfo.rows[0];

      // Parse parameter information
      const paramNames = proc.param_names ? proc.param_names : [];
      const paramModes = proc.param_modes ? proc.param_modes : [];
      const paramTypes = proc.param_types ? proc.param_types : [];

      const parameters = paramNames.map((name: string, index: number) => ({
        name,
        type: this.getPostgresType(paramTypes[index]),
        mode: this.getParamMode(paramModes[index]),
        defaultValue: undefined, // TODO: Parse proargdefaults if needed
      }));

      // Get result set information using information_schema
      const resultSetInfo = await client.query(
        `
        SELECT 
          p.prorettype,
          t.typtype,
          t.typname,
          a.attname,
          at.typname as attr_type,
          a.attnotnull
        FROM pg_proc p
        JOIN pg_type t ON p.prorettype = t.oid
        LEFT JOIN pg_attribute a ON t.typrelid = a.attrelid
        LEFT JOIN pg_type at ON a.atttypid = at.oid
        WHERE p.proname = $1
        AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = $2)
        AND a.attnum > 0
        ORDER BY a.attnum
      `,
        [name, schema]
      );

      // If procedure returns a table/composite type, construct result set
      const resultSets = [];
      if (resultSetInfo.rows.length > 0) {
        const columns = resultSetInfo.rows.map((row) => ({
          name: row.attname,
          type: row.attr_type,
          nullable: !row.attnotnull,
        }));
        resultSets.push({ columns });
      }

      return {
        definition: proc.definition,
        parameters,
        resultSets,
      };
    } finally {
      await client.end();
    }
  }

  private getParamMode(mode: string): "IN" | "OUT" | "INOUT" {
    switch (mode) {
      case "o":
        return "OUT";
      case "b":
        return "INOUT";
      case "v": // variadic
      case "t": // table
      default:
        return "IN";
    }
  }

  private getPostgresType(typeOid: number): string {
    // This is a simplified version - in production you'd want to map OIDs to actual type names
    return "varchar"; // TODO: Implement proper type mapping
  }
}
