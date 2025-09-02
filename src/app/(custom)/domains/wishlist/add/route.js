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

    const userId = user.id
    const { domainId } = await request.json()
    
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
        console.log('Customer found by email:', payloadCustomer.id, payloadCustomer.email)
      } else {
        console.log('Customer not found, creating new customer:', user.email)
        
        try {
          payloadCustomer = await payload.create({
            collection: 'customers',
            data: {
              email: user.email,
              password: Math.random().toString(36).slice(-12) + 'Aa1!',
              name: user.name || user.email.split('@')[0],
            }
          })
          
          console.log('New customer created in PayloadCMS:', payloadCustomer.id, payloadCustomer.email)
        } catch (createError) {
          console.error('Failed to create customer:', createError)
          
          // If we can't create the customer, return error
          return NextResponse.json(
            { message: 'Failed to initialize customer account. Please try again.' },
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
    } catch (error) {
      console.error('Error finding customer:', error)
      return NextResponse.json(
        { message: 'Error verifying customer account' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }
    
    // Use the PayloadCMS customer ID for wishlist operations
    const validUserId = payloadCustomer.id
    console.log('Using PayloadCMS customer ID for wishlist:', validUserId)

    // Check if domain exists
    let domain
    try {
      domain = await payload.findByID({
        collection: 'domains',
        id: domainId,
      })
    } catch (error) {
      return NextResponse.json(
        { message: 'Domain not found' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    if (!domain) {
      return NextResponse.json(
        { message: 'Domain not found' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    // Check if user is trying to add their own domain
    const domainOwnerId = typeof domain.ownedBy === 'object' 
      ? domain.ownedBy?.id 
      : domain.ownedBy
      
    if (String(domainOwnerId) === String(validUserId)) {
      return NextResponse.json(
        { message: 'You cannot add your own domain to wishlist' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    // Check if domain is already sold
    if (domain.status === 'sold') {
      return NextResponse.json(
        { message: 'Domain is already sold' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    // Find or create user's wishlist
    const existingWishlist = await payload.find({
      collection: 'wishlist',
      where: {
        user: {
          equals: validUserId
        }
      },
      depth: 1,
    })

    if (existingWishlist.docs.length === 0) {
      // Create new wishlist with the domain
      console.log('Creating new wishlist for user:', validUserId)
      try {
        const newWishlist = await payload.create({
          collection: 'wishlist',
          data: {
            user: validUserId,
            domains: [domainId]
          }
        })
        console.log('Wishlist created successfully:', newWishlist.id)

        return NextResponse.json({
          success: true,
          message: 'Domain added to wishlist successfully',
          wishlistId: newWishlist.id
        }, {
          headers: {
            'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',  
            'Access-Control-Allow-Credentials': 'true',
          }
        })
      } catch (wishlistError) {
        console.error('Wishlist creation error:', wishlistError)
        throw wishlistError
      }
    } else {
      // Update existing wishlist
      const userWishlist = existingWishlist.docs[0]
      const currentDomains = userWishlist.domains || []
      
      // Check if domain already in wishlist
      const domainIds = currentDomains.map(d => 
        typeof d === 'object' ? d.id : d
      )
      
      if (domainIds.includes(domainId)) {
        return NextResponse.json(
          { message: 'Domain already in wishlist' },
          { 
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
              'Access-Control-Allow-Credentials': 'true',
            }
          }
        )
      }

      // Add domain to wishlist
      const updatedWishlist = await payload.update({
        collection: 'wishlist',
        id: userWishlist.id,
        data: {
          domains: [...domainIds, domainId]
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Domain added to wishlist successfully',
        wishlistId: updatedWishlist.id
      }, {
        headers: {
          'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        }
      })
    }

  } catch (error) {
    console.error('Error adding to wishlist:', error)
    return NextResponse.json(
      { message: 'Failed to add domain to wishlist' },
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