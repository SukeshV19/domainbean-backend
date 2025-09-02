import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

export async function POST(request) {
  try {
    const payload = await getPayload({ config })
    
    // Use PayloadCMS built-in authentication
    const authResult = await payload.auth({ headers: request.headers })
    const user = authResult.user
    
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
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
      return NextResponse.json(
        { message: 'Error processing request' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    const userId = payloadCustomer.id
    const { domainId } = await request.json()

    // Validate input
    if (!domainId) {
      return NextResponse.json(
        { message: 'Domain ID is required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    // Find user's cart
    const existingCart = await payload.find({
      collection: 'cart',
      where: {
        user: {
          equals: userId
        }
      },
      depth: 1,
    })

    if (existingCart.docs.length === 0) {
      return NextResponse.json(
        { message: 'Cart not found' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    const userCart = existingCart.docs[0]
    const currentDomains = userCart.domains || []
    
    // Get domain IDs from cart
    const domainIds = currentDomains.map(d => 
      typeof d === 'object' ? d.id : d
    )
    
    // Check if domain is in cart
    if (!domainIds.includes(domainId)) {
      return NextResponse.json(
        { message: 'Item not found in cart' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    // Remove domain from cart
    const updatedDomainIds = domainIds.filter(id => id !== domainId)
    
    const updatedCart = await payload.update({
      collection: 'cart',
      id: userCart.id,
      data: {
        domains: updatedDomainIds
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Domain removed from cart successfully',
      cartId: updatedCart.id
    }, {
      headers: {
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
        'Access-Control-Allow-Credentials': 'true',
      }
    })

  } catch (error) {
    console.error('Error removing from cart:', error)
    return NextResponse.json(
      { message: 'Failed to remove domain from cart' },
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