/**
 * Pagination constants
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  PAGE_SIZE_OPTIONS: [
    { label: '25', value: 25 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
    { label: '250', value: 250 }
  ],
  BASIC_PAGE_SIZES: [10, 25, 50, 100]
} as const

/**
 * Default database ports
 */
export const DEFAULT_PORTS = {
  postgresql: 5432,
  mysql: 3306,
  mssql: 1433
} as const

/**
 * Database type labels
 */
export const DATABASE_TYPE_LABELS = [
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'Microsoft SQL Server', value: 'mssql' }
] as const 