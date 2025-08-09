import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { NextRequest } from 'next/server'

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
      // Update domain ownership and status
      await payload.update({
        collection: 'domains',
        id: domainId,
        data: {
          ownedBy: buyerId,
          status: 'sold'
        }
      })

      // Delete all leads associated with this domain
      // This prevents edge cases where buyer and owner could be the same
      // or leads become irrelevant after domain is sold
      try {
        const leadsToDelete = await payload.find({
          collection: 'leads',
          where: {
            domainId: {
              equals: domainId
            }
          },
          limit: 1000 // Get all leads for this domain
        })

        // Delete each lead
        for (const lead of leadsToDelete.docs) {
          await payload.delete({
            collection: 'leads',
            id: lead.id
          })
        }

        console.log(`Deleted ${leadsToDelete.docs.length} leads for domain ${domainId} after sale`)
      } catch (error) {
        console.error('Error deleting leads after domain sale:', error)
        // Don't fail the sale if lead deletion fails
      }
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
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  })
}