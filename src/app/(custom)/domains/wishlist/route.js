import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

export async function GET(request) {
  try {
    const payload = await getPayload({ config })
    
    const authResult = await payload.auth({ headers: request.headers })
    const user = authResult.user
    
    if (!user) {
      return NextResponse.json(
        { message: 'Not authenticated', wishlistItems: [] },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    // Find or create PayloadCMS customer
    let payloadCustomer
    try {
      const customerSearch = await payload.find({
        collection: 'customers',
        where: {
          email: {
            equals: user.email
          }
        },
        limit: 1
      })
      
      if (customerSearch.docs.length > 0) {
        payloadCustomer = customerSearch.docs[0]
      } else {
        // Create customer if doesn't exist
        payloadCustomer = await payload.create({
          collection: 'customers',
          data: {
            email: user.email,
            password: Math.random().toString(36).slice(-12) + 'Aa1!',
            name: user.name || user.email.split('@')[0],
          }
        })
      }
    } catch (error) {
      console.error('Error with customer:', error)
      return NextResponse.json({
        success: true,
        wishlistItems: [],
        totalItems: 0,
        totalAmount: 0
      }, {
        headers: {
          'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        }
      })
    }

    const userId = payloadCustomer.id

    // Find user's wishlist
    const wishlistData = await payload.find({
      collection: 'wishlist',
      where: {
        user: {
          equals: userId
        }
      },
      depth: 2, // Include related domain data
    })

    // If no wishlist exists, return empty
    if (wishlistData.docs.length === 0) {
      return NextResponse.json({
        success: true,
        wishlistItems: [],
        totalItems: 0,
        totalAmount: 0
      }, {
        headers: {
          'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        }
      })
    }

    const userWishlist = wishlistData.docs[0]
    const domains = userWishlist.domains || []

    // Format the response with domain details
    const formattedWishlistItems = domains.map(domain => {
      // Handle both populated objects and IDs
      const domainData = typeof domain === 'object' ? domain : null
      
      if (!domainData) return null
      
      return {
        domainId: domainData.id,
        domain: {
          id: domainData.id,
          name: domainData.name,
          price: domainData.price,
          description: domainData.description,
          category: domainData.category,
          status: domainData.status,
          owner: domainData.ownedBy
        },
        // Include wishlist timestamps
        addedAt: userWishlist.createdAt,
        updatedAt: userWishlist.updatedAt
      }
    }).filter(Boolean)

    // Calculate total amount
    const totalAmount = formattedWishlistItems.reduce((sum, item) => 
      sum + (parseFloat(item.domain?.price) || 0), 0
    )

    return NextResponse.json({
      success: true,
      wishlistItems: formattedWishlistItems,
      totalItems: formattedWishlistItems.length,
      totalAmount
    }, {
      headers: {
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
        'Access-Control-Allow-Credentials': 'true',
      }
    })

  } catch (error) {
    console.error('Error fetching wishlist items:', error)
    return NextResponse.json(
      { message: 'Failed to fetch wishlist items', wishlistItems: [] },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    )
  }
}