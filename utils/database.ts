import type { ConnectionForm } from '~/types/connection'

export function getDefaultPort(type: ConnectionForm['type']): string {
  const defaultPorts: Record<ConnectionForm['type'], string> = {
    mssql: '1433',
    mysql: '3306',
    postgresql: '5432'
  }
  return defaultPorts[type]
} 