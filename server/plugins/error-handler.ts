import { defineNitroPlugin } from 'nitropack/runtime/plugin'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    console.error('[API Error]', {
      url: event?.path,
      method: event?.method,
      statusCode: (error as any).statusCode,
      message: error.message,
      stack: error.stack
    })
  })
})