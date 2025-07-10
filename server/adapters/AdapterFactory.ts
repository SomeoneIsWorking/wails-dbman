import { BaseAdapter } from './BaseAdapter'
import { PostgresAdapter } from './PostgresAdapter'
import { MySQLAdapter } from './MySQLAdapter'
import { MSSQLAdapter } from './MSSQLAdapter'
import type { ConnectionConfig } from '~/types/schema'

export class AdapterFactory {
  private static adapters: Map<string, BaseAdapter> = new Map()

  static createAdapter(type: string, config: ConnectionConfig): BaseAdapter {
    const key = `${type}:${config.host}:${config.port}:${config.username}`
    
    if (!this.adapters.has(key)) {
      let adapter: BaseAdapter
      
      switch (type) {
        case 'postgresql':
          adapter = new PostgresAdapter(config)
          break
        case 'mysql':
          adapter = new MySQLAdapter(config)
          break
        case 'mssql':
          adapter = new MSSQLAdapter(config)
          break
        default:
          throw new Error(`Unsupported database type: ${type}`)
      }
      
      this.adapters.set(key, adapter)
    }
    
    return this.adapters.get(key)!
  }

  static clearAdapter(type: string, config: ConnectionConfig): void {
    const key = `${type}:${config.host}:${config.port}:${config.username}`
    this.adapters.delete(key)
  }
}