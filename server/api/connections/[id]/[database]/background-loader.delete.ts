import { stopBackgroundLoading } from '~/server/utils/background-loader'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  const database = event.context.params?.database
  
  if (!id || !database) {
    throw createError({
      statusCode: 400,
      message: 'Connection ID and database are required'
    })
  }

  try {
    const stopped = stopBackgroundLoading(id, database)
    
    if (stopped) {
      return { success: true, message: 'Background loading stopped' }
    } else {
      return { success: false, message: 'No background loading was active' }
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to stop background loading: ${error.message}`
    })
  }
}) 