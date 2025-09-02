import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const POST = async (request) => {
  try {
    const payload = await getPayload({ config: configPromise })
    
    const authResult = await payload.auth({ headers: request.headers })
    const user = authResult.user
    
    if (!user) {
      return Response.json(
        { message: 'Unauthorized' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    const { domainId, value, minBid, biddingTime } = await request.json()

    if (typeof value !== 'boolean' || !domainId) {
      return Response.json(
        { message: 'Missing required fields: isAuction (boolean) and domainName are required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    if (value && (!minBid || !biddingTime)) {
      return Response.json(
        { message: 'Min bid and bidding time are required when starting an auction' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    const domainsResult = await payload.find({
      collection: 'domains',
      where: {
        id: {equals: domainId}
      },
      limit: 1
    })

    if (domainsResult.docs.length === 0) {
      return Response.json(
        { message: `Domain ${domainId} not found` },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    const domain = domainsResult.docs[0]
    
    const newStatus = value ? 'auction' : 'sold'

    const updatedDomain = await payload.update({
      collection: 'domains',
      id: domain.id,
      data: {
        status: newStatus
      }
    })

    if (value && minBid && biddingTime) {
      const existingAuction = await payload.find({
        collection: 'auctions',
        where: {
          domainId: { equals: domain.id }
        },
        limit: 1
      })

      if (existingAuction.docs.length > 0) {
        await payload.update({
          collection: 'auctions',
          id: existingAuction.docs[0].id,
          data: {
            minBid: String(minBid),
            biddingTime: biddingTime,
            highestBid: String(minBid),
            bids: []
          }
        })
      } else {
        await payload.create({
          collection: 'auctions',
          data: {
            domainId: domain.id,
            minBid: String(minBid),
            biddingTime: biddingTime,
            highestBid: String(minBid),
            bids: []
          }
        })
      }
    } else if (!value) {
      // If removing from auction, delete the auction record
      const existingAuction = await payload.find({
        collection: 'auctions',
        where: {
          domainId: { equals: domain.id }
        },
        limit: 1
      })

      if (existingAuction.docs.length > 0) {
        await payload.delete({
          collection: 'auctions',
          id: existingAuction.docs[0].id
        })
      }
    }

    return Response.json(
      { 
        message: `Domain status updated to ${newStatus}`,
        domain: updatedDomain 
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
    console.error('Error in domains auction API:', error)
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

export const OPTIONS = async (_request) => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3001',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  })
}