import mssql from "mssql";
import { BaseAdapter } from "./BaseAdapter";
import type { ColumnInfo, SchemaInfo, StoredProcedureDetails } from "~/types/schema";

export class MSSQLAdapter extends BaseAdapter {
  private pool: mssql.ConnectionPool | null = null;

  private getConnectionConfig(database?: string): mssql.config {
    return {
      server: this.config.host,
      port: this.config.port,
      user: this.config.username,
      database: database,
      password: this.config.password,
      options: {
        trustServerCertificate: true,
        enableArithAbort: true,
      },
    };
  }

  async listDatabases(): Promise<string[]> {
    const pool = await mssql.connect(this.getConnectionConfig());
    try {
      const result = await pool
        .request()
        .query("SELECT name FROM sys.databases WHERE database_id > 4"); // Skip system databases
      return result.recordset.map((row) => row.name);
    } finally {
      await pool.close();
    }
  }

  async getSchema(database: string): Promise<SchemaInfo> {
    const pool = await mssql.connect(this.getConnectionConfig(database));

    try {
      // Get tables and columns
      const tablesResult = await pool.request().query(`
        SELECT 
          s.name as schema_name,
          t.name as table_name,
          c.name as column_name,
          tp.name as data_type,
          c.is_nullable,
          dc.definition as column_default
        FROM sys.tables t
        JOIN sys.schemas s ON t.schema_id = s.schema_id
        JOIN sys.columns c ON t.object_id = c.object_id
        JOIN sys.types tp ON c.user_type_id = tp.user_type_id
        LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
      `);

      // Get primary keys
      const pksResult = await pool.request().query(`
        SELECT 
          s.name as schema_name,
          t.name as table_name,
          c.name as column_name
        FROM sys.tables t
        JOIN sys.schemas s ON t.schema_id = s.schema_id
        JOIN sys.indexes i ON t.object_id = i.object_id
        JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE i.is_primary_key = 1
      `);

      // Get foreign keys
      const fksResult = await pool.request().query(`
        SELECT 
          s.name as schema_name,
          t.name as table_name,
          c.name as column_name,
          rs.name as referenced_schema,
          rt.name as referenced_table,
          rc.name as referenced_column
        FROM sys.foreign_keys fk
        JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        JOIN sys.tables t ON fkc.parent_object_id = t.object_id
        JOIN sys.schemas s ON t.schema_id = s.schema_id
        JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
        JOIN sys.tables rt ON fkc.referenced_object_id = rt.object_id
        JOIN sys.schemas rs ON rt.schema_id = rs.schema_id
        JOIN sys.columns rc ON fkc.referenced_object_id = rc.object_id AND fkc.referenced_column_id = rc.column_id
      `);

      // Get views
      const viewsResult = await pool.request().query(`
        SELECT 
          s.name as schema_name,
          v.name as view_name,
          c.name as column_name,
          tp.name as data_type,
          m.definition as view_definition
        FROM sys.views v
        JOIN sys.schemas s ON v.schema_id = s.schema_id
        JOIN sys.columns c ON v.object_id = c.object_id
        JOIN sys.types tp ON c.user_type_id = tp.user_type_id
        LEFT JOIN sys.sql_modules m ON v.object_id = m.object_id
      `);

      // Get stored procedures
      const procsResult = await pool.request().query(`
        SELECT 
          s.name as schema_name,
          p.name as procedure_name,
          pm.name as parameter_name
        FROM sys.procedures p
        JOIN sys.schemas s ON p.schema_id = s.schema_id
        LEFT JOIN sys.parameters pm ON p.object_id = pm.object_id
        WHERE p.is_ms_shipped = 0
      `);

      // Group tables and their columns
      const tables = tablesResult.recordset.reduce((acc: any, row: any) => {
        const key = `${row.schema_name}.${row.table_name}`;
        if (!acc[key]) {
          acc[key] = {
            name: row.table_name,
            schema: row.schema_name,
            columns: [],
            primaryKey: [],
            foreignKeys: [],
          };
        }
        acc[key].columns.push({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable,
          defaultValue: row.column_default,
          primary: false,
          unique: false,
          foreign: false
        });
        return acc;
      }, {});

      // Add primary keys
      pksResult.recordset.forEach((row: any) => {
        const key = `${row.schema_name}.${row.table_name}`;
        if (tables[key]) {
          tables[key].primaryKey.push(row.column_name);
          const column = tables[key].columns.find((col: any) => col.name === row.column_name);
          if (column) {
            column.primary = true;
          }
        }
      });

      // Add foreign keys
      fksResult.recordset.forEach((row: any) => {
        const key = `${row.schema_name}.${row.table_name}`;
        if (tables[key]) {
          const existingFk = tables[key].foreignKeys.find(
            (fk: any) =>
              fk.referencedTable ===
              `${row.referenced_schema}.${row.referenced_table}`
          );
          if (existingFk) {
            existingFk.columns.push(row.column_name);
            existingFk.referencedColumns.push(row.referenced_column);
          } else {
            tables[key].foreignKeys.push({
              columns: [row.column_name],
              referencedTable: `${row.referenced_schema}.${row.referenced_table}`,
              referencedColumns: [row.referenced_column],
            });
          }
          const column = tables[key].columns.find((col: any) => col.name === row.column_name);
          if (column) {
            column.foreign = true;
          }
        }
      });

      // Group views
      const views = viewsResult.recordset.reduce((acc: any, row: any) => {
        const key = `${row.schema_name}.${row.view_name}`;
        if (!acc[key]) {
          acc[key] = {
            name: row.view_name,
            schema: row.schema_name,
            definition: row.view_definition,
            columns: [],
          };
        }
        acc[key].columns.push({
          name: row.column_name,
          type: row.data_type,
          nullable: true,
        });
        return acc;
      }, {});

      // Group stored procedures
      const procedures = procsResult.recordset.reduce((acc: any, row: any) => {
        const key = `${row.schema_name}.${row.procedure_name}`;
        if (!acc[key]) {
          acc[key] = {
            name: row.procedure_name,
            schema: row.schema_name,
            parameters: [],
          };
        }
        if (row.parameter_name) {
          acc[key].parameters.push(row.parameter_name);
        }
        return acc;
      }, {});

      return {
        tables: Object.values(tables),
        views: Object.values(views),
        storedProcedures: Object.values(procedures),
      };
    } finally {
      await pool.close();
    }
  }

  async executeQuery(query: string, database: string): Promise<any[]> {
    console.log(`[MSSQLAdapter] Executing query on database: ${database}`);
    console.log(`[MSSQLAdapter] Query: ${query}`);

    const pool = await mssql.connect(this.getConnectionConfig(database));
    try {
      const result = await pool.request().query(query);
      console.log(
        `[MSSQLAdapter] Query executed successfully with ${
          result.recordset?.length || 0
        } rows returned`
      );
      return result.recordset;
    } catch (error: any) {
      console.error(`[MSSQLAdapter] Query execution failed: ${error.message}`);
      console.error(`[MSSQLAdapter] Failed query: ${query}`);
      throw error;
    } finally {
      await pool.close();
    }
  }

  async getTableData(
    database: string,
    schema: string,
    tableName: string,
    options: { page: number; limit: number }
  ): Promise<{ results: any[]; total: number }> {
    const pool = await mssql.connect(this.getConnectionConfig(database));
    
    try {
      const offset = (options.page - 1) * options.limit;
      const quotedTable = `[${schema}].[${tableName}]`;
      
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM ${quotedTable}`;
      const countResult = await pool.request().query(countQuery);
      const total = countResult.recordset[0].total;
      
      // Get paginated data
      const dataQuery = `
        SELECT *
        FROM ${quotedTable}
        ORDER BY (SELECT NULL)
        OFFSET ${offset} ROWS
        FETCH NEXT ${options.limit} ROWS ONLY
      `;
      const dataResult = await pool.request().query(dataQuery);
      
      return {
        results: dataResult.recordset,
        total
      };
    } finally {
      await pool.close();
    }
  }

  // Add method to close the pool
  async closePool(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  async getProcedureDetails(
    database: string,
    schema: string,
    name: string
  ): Promise<StoredProcedureDetails> {
    console.log(
      `[ProcedureAPI] Fetching stored procedure details for ${database}.${schema}.${name}`
    );
    const pool = await mssql.connect(this.getConnectionConfig(database));

    try {
      // Get procedure definition and parameters
      const procedureQueryText = `
        SELECT 
          p.object_id,
          OBJECT_DEFINITION(p.object_id) as definition,
          pm.name as param_name,
          CASE 
            WHEN t.name IN ('varchar', 'nvarchar', 'char', 'nchar') 
              THEN t.name + '(' + CASE WHEN pm.max_length = -1 THEN 'max' ELSE CAST(pm.max_length as varchar) END + ')'
            WHEN t.name IN ('decimal', 'numeric') 
              THEN t.name + '(' + CAST(pm.precision as varchar) + ',' + CAST(pm.scale as varchar) + ')'
            ELSE t.name 
          END as param_type,
          pm.is_output,
          pm.has_default_value,
          pm.default_value,
          pm.max_length,
          pm.precision,
          pm.scale
        FROM sys.procedures p
        LEFT JOIN sys.parameters pm ON p.object_id = pm.object_id AND pm.parameter_id > 0
        LEFT JOIN sys.types t ON pm.user_type_id = t.user_type_id
        WHERE p.schema_id = SCHEMA_ID(@schema)
          AND p.name = @name
        ORDER BY pm.parameter_id
      `;

      console.log(
        `[ProcedureAPI] Executing query for procedure info:\n${procedureQueryText}`
      );
      const procedureInfo = await pool
        .request()
        .input("schema", mssql.VarChar, schema)
        .input("name", mssql.VarChar, name)
        .query(procedureQueryText);

      const parameters = procedureInfo.recordset
        .filter((row) => row.param_name)
        .map((row) => ({
          name: row.param_name,
          type: row.param_type || 'unknown',
          mode: row.is_output ? ("OUT" as const) : ("IN" as const),
          defaultValue: row.has_default_value ? row.default_value : undefined,
          maxLength: row.max_length,
          precision: row.precision,
          scale: row.scale,
          isNullable: true // MSSQL parameters are typically nullable unless specified otherwise
        }));

      return {
        definition: procedureInfo.recordset[0]?.definition || "",
        parameters,
        resultSets: [], // Let the API layer handle result set analysis
      };
    } catch (error: any) {
      console.error(`[ProcedureAPI] Error: ${error.message}`);
      if (error.stack) {
        console.error(`[ProcedureAPI] Stack trace: ${error.stack}`);
      }
      throw error;
    } finally {
      await pool.close();
    }
  }
}
