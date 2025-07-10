import { closePrismaConnection } from '../utils/cache'

export default defineNitroPlugin(async (nitroApp) => {
  // Handle graceful shutdown
  nitroApp.hooks.hook('close', async () => {
    await closePrismaConnection()
  })
}) 