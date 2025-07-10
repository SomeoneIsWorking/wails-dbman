import { isBackgroundLoadingActive } from '~/server/utils/background-loader'
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
    const isActive = isBackgroundLoadingActive(id, database)
    
    return { 
      active: isActive,
      message: isActive ? 'Background loading is active' : 'Background loading is not active'
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to check background loading status: ${error.message}`
    })
  }
}) 