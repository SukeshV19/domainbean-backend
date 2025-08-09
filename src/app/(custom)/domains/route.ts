import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { NextRequest } from 'next/server'

export const GET = async (request: NextRequest) => {
  try {
    const payload = await getPayload({
      config: configPromise,
    })
    let user = null
    
    try {
      const authResult = await payload.auth({ headers: request.headers })
      user = authResult.user
    } catch (authError) {
      console.log(authError)
    }

    if (!user) {
      const allDomains = await payload.find({
        collection: 'domains',
        depth: 1,
      })
      return Response.json({ domains: allDomains.docs }, { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
        }
      })
    }

    let domains

    if (user.collection === 'customers' && user.role === 'customer') {   
      const filteredDomains = await payload.find({
        collection: 'domains',
        where: { 
          or: [
            { status: { equals: 'available' } },
            { ownedBy: { equals: user.id } }
          ]
        },
      })
      domains = filteredDomains.docs

    } else {
      const allDomains = await payload.find({
        collection: 'domains',
        depth: 1,
      })
      
      domains = allDomains.docs
    }

    return Response.json({ domains }, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3001',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
      }
    })
  } catch (error) {
    return Response.json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : 'No details available'
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
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  })
}