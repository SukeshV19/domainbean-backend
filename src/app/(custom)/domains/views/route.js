import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3001',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

export const POST = async(_request) => {
  try {
    const { domainId } = await _request.json()
    
    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' }, 
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }

    const payload = await getPayload({ config })
    
    try {
      // Get current domain
      const domain = await payload.findByID({
        collection: 'domains',
        id: domainId,
      })
      
      if (!domain) {
        return NextResponse.json(
          { error: 'Domain not found' }, 
          { 
            status: 404,
            headers: {
              'Access-Control-Allow-Origin': 'http://localhost:3001',
              'Access-Control-Allow-Credentials': 'true',
            }
          }
        )
      }
      
      // Simply increment the view count by 1
      const newViewCount = (domain.views || 0) + 1
      
      // Update domain with new view count
      await payload.update({
        collection: 'domains',
        id: domainId,
        data: {
          views: newViewCount,
        },
      })
      
      return NextResponse.json({ 
        success: true, 
        views: newViewCount 
      }, { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        }
      })
      
    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to update views' }, 
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      )
    }
    
  } catch (error) {
    console.error('Error updating views:', error)
    return NextResponse.json(
      { error: 'Failed to update views' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    )
  }
}