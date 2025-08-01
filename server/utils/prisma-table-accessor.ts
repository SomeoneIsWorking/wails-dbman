import { PrismaClient } from "~/generated/prisma";
import type { ColumnInfo, TableInfoAccessor, TableIdentifier, ViewIdentifier } from "~/types/schema";

export class PrismaTableAccessor implements TableInfoAccessor {
  private prisma: PrismaClient;
  private connectionId: string;
  private database: string;

  constructor(connectionId: string, database: string) {
    this.prisma = new PrismaClient();
    this.connectionId = connectionId;
    this.database = database;
  }

  async getProcedureDefinition(schema: string, name: string): Promise<string> {
    try {
      console.log(`[PrismaTableAccessor] Fetching procedure definition for ${schema}.${name}`);
      
      // Find the connection
      const connection = await this.prisma.connection.findFirst({
        where: {
          id: this.connectionId
        }
      });

      if (!connection) {
        throw new Error(`No connection found for ID: ${this.connectionId}`);
      }

      // Get cached schema
      const cachedSchema = await this.prisma.cachedSchema.findFirst({
        where: {
          connectionId: connection.id,
          database: this.database
        }
      });

      if (!cachedSchema) {
        throw new Error(`No cached schema found for database: ${this.database}`);
      }

      // Get cached procedure
      const cachedProcedure = await this.prisma.cachedProcedure.findFirst({
        where: {
          schemaId: cachedSchema.id,
          schema: schema,
          procedureName: name
        }
      });

      if (!cachedProcedure || !cachedProcedure.definition) {
        throw new Error(`No cached procedure definition found for ${schema}.${name}`);
      }

      console.log(`[PrismaTableAccessor] Retrieved procedure definition from cache`);
      return cachedProcedure.definition;
    } catch (error) {
      console.error(`[PrismaTableAccessor] Error getting procedure definition for ${schema}.${name}: ${error}`);
      throw error;
    }
  }

  async getMultipleTableColumns(tableNames: TableIdentifier[]): Promise<Map<string, ColumnInfo[]>> {
    const result = new Map<string, ColumnInfo[]>();
    
    if (tableNames.length === 0) {
      return result;
    }

    try {
      console.log(`[PrismaTableAccessor] Fetching columns for ${tableNames.length} tables in bulk`);
      
      // Find the connection
      const connection = await this.prisma.connection.findFirst({
        where: {
          id: this.connectionId
        }
      });

      if (!connection) {
        console.warn(`[PrismaTableAccessor] No connection found for ID: ${this.connectionId}`);
        return result;
      }

      // Get cached schema
      const cachedSchema = await this.prisma.cachedSchema.findFirst({
        where: {
          connectionId: connection.id,
          database: this.database
        }
      });

      if (!cachedSchema) {
        console.warn(`[PrismaTableAccessor] No cached schema found for database: ${this.database}`);
        return result;
      }

      // Build where conditions for all tables
      const whereConditions = tableNames.map(({schema, tableName}) => ({
        schemaId: cachedSchema.id,
        schema: schema,
        name: tableName
      }));

      // Get all cached tables in one query
      const cachedTables = await this.prisma.cachedTable.findMany({
        where: {
          OR: whereConditions
        },
        include: {
          columns: {
            orderBy: {
              ordinalPosition: 'asc'
            }
          }
        }
      });

      // Map results
      for (const cachedTable of cachedTables) {
        const tableKey = `${cachedTable.schema}.${cachedTable.name}`;
        
        const columns: ColumnInfo[] = cachedTable.columns.map(col => ({
          name: col.name,
          type: col.dataType,
          nullable: col.isNullable,
          defaultValue: col.defaultValue || undefined,
          primary: col.isPrimary,
          unique: col.isUnique,
          foreign: col.isForeign,
          comment: col.comment || undefined
        }));

        result.set(tableKey, columns);
        console.log(`[PrismaTableAccessor] Found ${columns.length} columns for table ${tableKey}`);
      }

      // Log missing tables
      const foundKeys = new Set(Array.from(result.keys()));
      for (const {schema, tableName} of tableNames) {
        const tableKey = `${schema}.${tableName}`;
        if (!foundKeys.has(tableKey)) {
          console.log(`[PrismaTableAccessor] No cached table found for ${tableKey}`);
          result.set(tableKey, []);
        }
      }

      return result;
    } catch (error) {
      console.error(`[PrismaTableAccessor] Error fetching columns for multiple tables: ${error}`);
      return result;
    }
  }

  async getMultipleViewColumns(viewNames: ViewIdentifier[]): Promise<Map<string, ColumnInfo[]>> {
    const result = new Map<string, ColumnInfo[]>();
    
    if (viewNames.length === 0) {
      return result;
    }

    try {
      console.log(`[PrismaTableAccessor] Fetching columns for ${viewNames.length} views in bulk`);
      
      // Find the connection
      const connection = await this.prisma.connection.findFirst({
        where: {
          id: this.connectionId
        }
      });

      if (!connection) {
        console.warn(`[PrismaTableAccessor] No connection found for ID: ${this.connectionId}`);
        return result;
      }

      // Get cached schema
      const cachedSchema = await this.prisma.cachedSchema.findFirst({
        where: {
          connectionId: connection.id,
          database: this.database
        }
      });

      if (!cachedSchema) {
        console.warn(`[PrismaTableAccessor] No cached schema found for database: ${this.database}`);
        return result;
      }

      // Build where conditions for all views
      const whereConditions = viewNames.map(({schema, viewName}) => ({
        schemaId: cachedSchema.id,
        schema: schema,
        name: viewName
      }));

      // Get all cached views in one query
      const cachedViews = await this.prisma.cachedView.findMany({
        where: {
          OR: whereConditions
        },
        include: {
          columns: {
            orderBy: {
              ordinalPosition: 'asc'
            }
          }
        }
      });

      // Map results
      for (const cachedView of cachedViews) {
        const viewKey = `${cachedView.schema}.${cachedView.name}`;
        
        const columns: ColumnInfo[] = cachedView.columns.map(col => ({
          name: col.name,
          type: col.dataType,
          nullable: col.isNullable,
          defaultValue: col.defaultValue || undefined
        }));

        result.set(viewKey, columns);
        console.log(`[PrismaTableAccessor] Found ${columns.length} columns for view ${viewKey}`);
      }

      // Log missing views
      const foundKeys = new Set(Array.from(result.keys()));
      for (const {schema, viewName} of viewNames) {
        const viewKey = `${schema}.${viewName}`;
        if (!foundKeys.has(viewKey)) {
          console.log(`[PrismaTableAccessor] No cached view found for ${viewKey}`);
          result.set(viewKey, []);
        }
      }

      return result;
    } catch (error) {
      console.error(`[PrismaTableAccessor] Error fetching columns for multiple views: ${error}`);
      return result;
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
} 