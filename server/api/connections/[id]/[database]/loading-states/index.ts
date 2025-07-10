import { defineEventHandler } from 'h3'
import { getAllLoadingStates } from '~/server/utils/loading-states'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  const database = event.context.params?.database

  if (!id || !database) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameters'
    })
  }

  // Get loading states (will auto-initialize if needed)
  const connectionStates = await getAllLoadingStates(id, database)
  
  // Flatten the nested structure
  const states = Object.entries(connectionStates).reduce((acc, [key, state]) => {
    acc[key] = state
    return acc
  }, {} as Record<string, any>)

  return { states }
}) 