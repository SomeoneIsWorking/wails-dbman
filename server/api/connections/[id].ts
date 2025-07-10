import { getConnection, updateConnection, deleteConnection } from '../../utils/cache'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Connection ID is required'
    })
  }

  switch (event.method) {
    case 'GET': {
      const connection = await getConnection(id)
      
      if (!connection) {
        throw createError({
          statusCode: 404,
          message: 'Connection not found'
        })
      }
      
      return connection
    }

    case 'PUT': {
      const body = await readBody(event)
      const existingConnection = await getConnection(id)

      if (!existingConnection) {
        throw createError({
          statusCode: 404,
          message: 'Connection not found'
        })
      }

      // If password is empty, keep the existing password
      if (!body.password) {
        delete body.password
      }

      const updatedConnection = await updateConnection(id, body)
      if (!updatedConnection) {
        throw createError({
          statusCode: 404,
          message: 'Connection not found'
        })
      }

      return updatedConnection
    }

    case 'DELETE': {
      const success = await deleteConnection(id)
      if (!success) {
        throw createError({
          statusCode: 404,
          message: 'Connection not found'
        })
      }
      return { success: true }
    }

    default:
      throw createError({
        statusCode: 405,
        message: 'Method not allowed'
      })
  }
})