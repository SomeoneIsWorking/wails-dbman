export const databaseTypes = ["mssql", "mysql", "postgresql"] as const;

export type DatabaseType = (typeof databaseTypes)[number];

export interface ConnectionForm {
  name?: string;
  type: DatabaseType;
  host: string;
  port: string;
  username: string;
  password: string;
}

export interface Connection extends Omit<ConnectionForm, 'port'> {
  id: string;
  port: number;
  createdAt: string;
  updatedAt: string;
}
