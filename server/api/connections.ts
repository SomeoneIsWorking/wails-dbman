import { getConnections, createConnection } from '../utils/cache'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  switch (method) {
    case 'GET':
      return await getConnections()

    case 'POST':
      const body = await readBody(event)
      return await createConnection(body)

    default:
      throw createError({
        statusCode: 405,
        message: 'Method not allowed'
      })
  }
})