import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const POST = async (request) => {
  try {
    const payload = await getPayload({ config : configPromise })
    
    const authResult = await payload.auth({ headers: request.headers })
    const user = authResult.user
    
    if (!user) {
      return Response.json(
        { message: 'Unauthorized - Please login to place a proxy bid' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    const {userId, maxBid, auctionId} = await request.json()
    
    // Fetch the auction
    const auction = await payload.findByID({
        collection: 'auctions',  // Fixed: was 'auction'
        id: auctionId
    })

    if (!auction) {
      return Response.json(
        { message: 'Auction not found' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    // Calculate minimum required bid
    const currentHighestBid = parseFloat(auction.highestBid || auction.minBid || 0)
    const minimumRequiredBid = parseFloat(currentHighestBid + parseFloat(auction.minInc || 1))

    if(maxBid < minimumRequiredBid){
        return Response.json(
            { message: `Maximum bid must be at least $${minimumRequiredBid}` },
            {
              status: 400,
              headers: {
                  'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
                  'Access-Control-Allow-Credentials': 'true',
              }
            }
        )
    }

    const proxyBids = auction.proxy || []
    
    const existingProxyIndex = proxyBids.findIndex(p => p.userId === userId)
    
    if (existingProxyIndex !== -1) {
      proxyBids[existingProxyIndex].maxBid = maxBid
    } else {
      // Add new proxy bid
      const newProxy = { 
        userId, 
        maxBid,
        currentBid: minimumRequiredBid
      }
      proxyBids.push(newProxy)
    }

    // Sort proxy bids by maxBid in descending order
    proxyBids.sort((a, b) => b.maxBid - a.maxBid)

    // Determine the new highest bid based on proxy bids
    let newHighestBid = currentHighestBid
    if (proxyBids.length > 0) {
      const highestProxy = proxyBids[0]
      if (proxyBids.length > 1) {
        // If there's a second proxy, bid just above it
        const secondHighest = proxyBids[1].maxBid
        newHighestBid = Math.min(highestProxy.maxBid, secondHighest + (auction.minInc || 1))
      } else {
        // Only one proxy bid, use minimum required bid
        newHighestBid = minimumRequiredBid
      }
    }

    // Update the auction
    const updatedAuction = await payload.update({
        collection: 'auctions',
        id: auctionId,
        data: {  // Fixed: was 'where'
          proxy: proxyBids,
          highestBid: newHighestBid
        }
    })

    if(!updatedAuction){
        return Response.json(
            { message : 'Failed to create a proxy bid' },
            {
              status: 400,
              headers: {
                  'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
                  'Access-Control-Allow-Credentials': 'true'
              }
            }
        )
    }

    // Return success response
    return Response.json(
      { 
        message: 'Proxy bid placed successfully',
        maxBid: maxBid,
        currentHighestBid: newHighestBid,
        isWinning: proxyBids[0]?.userId === userId
      },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    )

  } catch (error) {
    console.error('Error in proxy bid API:', error)
    return Response.json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
        'Access-Control-Allow-Credentials': 'true',
      }
    })
  }
}

export const OPTIONS = async (_request) => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  })
}