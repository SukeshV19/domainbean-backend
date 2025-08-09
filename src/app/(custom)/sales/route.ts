import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { NextRequest } from 'next/server'

export const GET = async (request: NextRequest) => {
  try {
    const payload = await getPayload({ config: configPromise })
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return Response.json(
        { message: 'User ID is required' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    const sales = await payload.find({
      collection: 'sales',
      where: {
        and: [
          {
            sellerId: {
              equals: userId
            }
          },
          {
            sellerId: {
              not_equals: null
            }
          }
        ]
      },
      depth: 1
    })

    return Response.json(
      {
        sales: sales.docs
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    )
  } catch (error) {
    console.error('Error fetching sales:', error)
    return Response.json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3001',
        'Access-Control-Allow-Credentials': 'true',
      }
    })
  }
}

export const POST = async (request: NextRequest) => {
  try {
    const payload = await getPayload({ config: configPromise })
    const { domainId, price, sellerId, buyerId } = await request.json()

    if (!domainId || !price || !buyerId) {
      return Response.json(
        { message: 'Missing required fields' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    const sale = await payload.create({
      collection: 'sales',
      data: {
        domainId,
        price: price.toString(),
        sellerId: sellerId || null,
        buyerId
      }
    })

    if (sale) {
      await payload.update({
        collection: 'domains',
        id: domainId,
        data: {
          ownedBy: buyerId,
          status: 'sold'
        }
      })
    }

    return Response.json(
      {
        message: 'Domain purchased successfully',
        sale
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    )
  } catch (error) {
    console.error('Error in domains sale API:', error)
    return Response.json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3001',
        'Access-Control-Allow-Credentials': 'true',
      }
    })
  }
}

export const OPTIONS = async (_request: NextRequest) => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3001',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  })
}