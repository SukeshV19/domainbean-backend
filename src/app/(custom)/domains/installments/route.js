import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const GET = async (request) => {
  try {
    const payload = await getPayload({ config: configPromise })

    let user = null
    try {
      const authResult = await payload.auth({ headers: request.headers })
      user = authResult?.user
    } catch (authError) {
      console.error('Auth error:', authError)
    }

    if (!user) {
      return Response.json(
        { message: 'Unauthorized' },
        { status: 401, headers: corsHeaders() }
      )
    }

    const installments = await payload.find({
      collection: 'installments',
      where: {
        or: [
          { buyerId: { equals: user.id } },
          { sellerId: { equals: user.id } },
        ],
      },
    })

    return Response.json(
      { message: 'Installments fetched successfully', installments: installments.docs },
      { status: 200, headers: corsHeaders() }
    )
  } catch (err) {
    console.error('GET Installments API Error:', err)
    return Response.json(
      { message: `Internal server error: ${err.message || err}` },
      { status: 500, headers: corsHeaders() }
    )
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export const OPTIONS = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      ...corsHeaders(),
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  })
}
