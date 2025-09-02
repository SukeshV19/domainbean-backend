import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { sendOutbidNotification } from '@/lib/notifications.js'

export const POST = async (request) => {
  try {
    const payload = await getPayload({ config : configPromise })
    
    const authResult = await payload.auth({ headers: request.headers })
    const user = authResult.user
    
    if (!user) {
      return Response.json(
        { message: 'Unauthorized - Please login to place a bid' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    const { auctionId, bidAmount, currency = '$' } = await request.json()

    if (!auctionId || !bidAmount) {
      return Response.json(
        { message: 'Missing required fields: auctionId and bidAmount are required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    const auctionResult = await payload.find({
      collection: 'auctions',
      where: {
        id: { equals: auctionId }
      },
      depth: 2,
      limit: 1
    })

    if (auctionResult.docs.length === 0) {
      return Response.json(
        { message: 'Auction not found' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    const auction = auctionResult.docs[0]
    
    const minInc = parseFloat(auction.minInc || '1')
    const currentHighestBid = parseFloat(auction.highestBid || auction.minBid || '0')
    const bidValue = parseFloat(bidAmount)

    // Check minimum bid requirement
    const minimumRequiredBid = currentHighestBid + minInc

    if (bidValue < minimumRequiredBid) {
      return Response.json(
        { message: `Bid must be at least ${currency}${minimumRequiredBid} (current highest: ${currency}${currentHighestBid} + increment: ${currency}${minInc})` },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    // Check if user owns the domain
    const domainId = typeof auction.domainId === 'object' ? auction.domainId.id : auction.domainId
    const domainResult = await payload.find({
      collection: 'domains',
      where: {
        id: { equals: domainId }
      },
      limit: 1
    })

    if (domainResult.docs.length > 0) {
      const domain = domainResult.docs[0]
      if (domain.ownedBy) {
        const ownerId = typeof domain.ownedBy === 'object' ? domain.ownedBy.id : domain.ownedBy
        
        if (String(ownerId) === String(user.id)) {
          return Response.json(
            { message: 'You cannot bid on your own domain' },
            { 
              status: 400,
              headers: {
                'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
                'Access-Control-Allow-Credentials': 'true',
              }
            }
          )
        }
      }
    }

    const newBid = {userId: user.id,price: String(bidValue),units: currency}

    const updatedBids = [...(auction.bids || []), newBid]
    let finalHighestBid = bidValue
    let proxyTriggered = false

    let previousHighestBidder = null
    if (auction.bids && auction.bids.length > 0) {
      const currentBids = [...auction.bids].sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
      if (currentBids.length > 0) {
        previousHighestBidder = {
          userId: currentBids[0].userId,
          bidAmount: parseFloat(currentBids[0].price)
        }
      }
    }

    const proxyBids = auction.proxy || []
    
    if (proxyBids.length > 0) {
      // Sort proxy bids by maxBid in descending order
      const sortedProxies = [...proxyBids].sort((a, b) => parseFloat(b.maxBid) - parseFloat(a.maxBid))
      
      // Find proxy bids that can outbid the current bid
      for (const proxy of sortedProxies) {
        const proxyMaxBid = parseFloat(proxy.maxBid)
        const proxyUserId = typeof proxy.userId === 'object' ? proxy.userId : proxy.userId
        
        // Skip if this is the bidder's own proxy
        if (String(proxyUserId) === String(user.id)) {
          continue
        }
        
        // If proxy can outbid, create an automatic counter bid
        if (proxyMaxBid >= bidValue + minInc) {
          const proxyBidAmount = Math.min(proxyMaxBid, bidValue + minInc)
          const proxyAutoBid = {
            userId: proxyUserId,
            price: String(proxyBidAmount),
            units: currency,
            isProxy: true  // Mark as proxy-generated bid
          }
          updatedBids.push(proxyAutoBid)
          finalHighestBid = proxyBidAmount
          proxyTriggered = true
          
          // Update proxy's current bid
          const proxyIndex = proxyBids.findIndex(p => 
            (typeof p.userId === 'object' ? p.userId : p.userId) === proxyUserId
          )
          if (proxyIndex !== -1) {
            proxyBids[proxyIndex].currentBid = proxyBidAmount
          }
          
          break  // Only one proxy bid triggers per regular bid
        }
      }
    }
    
    // Update the auction with new bids
    const updatedAuction = await payload.update({
      collection: 'auctions',
      id: auction.id,
      data: {
        bids: updatedBids,
        highestBid: String(finalHighestBid),
        proxy: proxyBids  // Update proxy bids with new current bids
      }
    })

    // Send Kafka notifications for outbid users
    try {
      const domainName = typeof auction.domainId === 'object' ? auction.domainId.name : 'Unknown Domain'
      
      // Scenario 1: Previous highest bidder gets outbid by new bid  
      const prevUserId = typeof previousHighestBidder?.userId === 'object' ? previousHighestBidder.userId.id : previousHighestBidder?.userId
      if (previousHighestBidder && String(prevUserId) !== String(user.id)) {
        // Get user details - userId is already populated with user object from auction
        const outbidUser = typeof previousHighestBidder.userId === 'object' ? previousHighestBidder.userId : null
        const userId = prevUserId
        
        if (outbidUser) {
          await sendOutbidNotification(
            userId,
            domainName,
            proxyTriggered ? finalHighestBid : bidValue,
            previousHighestBidder.bidAmount
          )
        }
      }
      
      // Scenario 2: Current bidder gets outbid by proxy (if proxy was triggered)
      if (proxyTriggered) {
        await sendOutbidNotification(
          user.id,
          domainName,
          finalHighestBid,
          bidValue
        )
      }
    } catch (kafkaError) {
      console.error('Failed to send Kafka notification:', kafkaError)
      // Don't fail the bid process due to notification errors
    }

    return Response.json(
      { 
        message: proxyTriggered 
          ? 'Bid placed, but you were immediately outbid by an automatic bid' 
          : 'Bid placed successfully',
        auction: updatedAuction,
        bid: newBid,
        proxyTriggered: proxyTriggered,
        currentHighBid: finalHighestBid
      },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    )
  } catch (error) {
    console.error('Error in bid API:', error)
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