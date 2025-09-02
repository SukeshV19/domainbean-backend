import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const POST = async (request) => {
  try {
    const payload = await getPayload({ config: configPromise })
    const { domainId, value, installment, time, interest } = await request.json()

    if (!domainId) {
      return Response.json(
        { message: 'Domain ID is required' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    const updateData = {
      status: value === true ? 'available' : 'sold',
      // Conditionally add or clear installment data
      ...(value === true && installment === true ? {
        acceptInstallment: true,
        interestRate: interest,
        maxTimeLimit: time,
      } : {
        acceptInstallment: false,
        interestRate: 0,
        maxTimeLimit: null,
      })
    }

    const updatedDomain = await payload.update({
      collection: 'domains',
      id: domainId,
      data: updateData,
    })

    return Response.json(
      {
        message: 'Domain updated successfully',
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
    console.error('Error in domains sell API:', error)
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