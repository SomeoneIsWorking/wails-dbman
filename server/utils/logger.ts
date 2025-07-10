import pino from 'pino'

// Create the base logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined,
  formatters: {
    level: (label: string) => {
      return { level: label }
    }
  }
})

// Create specialized loggers for different modules
export const createLogger = (module: string) => {
  return logger.child({ module })
}

// Export the base logger
export default logger

// Common logger instances for frequently used modules
export const procedureLogger = createLogger('procedure')
export const reanalyzeLogger = createLogger('reanalyze')
export const loaderLogger = createLogger('loader')
export const cacheLogger = createLogger('cache')
export const sqlParserLogger = createLogger('sql-parser') 