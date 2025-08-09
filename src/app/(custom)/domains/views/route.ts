import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function OPTIONS(request: NextRequest) {
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

export const POST = async(request: NextRequest) => {
  try {
    const { domainId, userId } = await request.json()
    
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
    const domainIdNum = Number(domainId)
    const userIdNum = userId ? Number(userId) : null
    
    try {
      const existingViews = await payload.find({
        collection: 'domainViews',
        where: {
          domainId: {
            equals: domainIdNum,
          },
        },
        limit: 1,
      })
      
      let viewCount = 0
      
      if (existingViews.docs.length > 0) {
        const viewRecord = existingViews.docs[0]
        const users = viewRecord.users || []
        
        const userAlreadyViewed = userIdNum ? users.some((u: any) => {
          const existingUserId = typeof u.userId === 'object' && u.userId !== null ? u.userId?.id : u.userId
          return existingUserId && Number(existingUserId) === userIdNum
        }) : false
        
        if (!userAlreadyViewed && userIdNum) {
          const updatedUsers = [...users, { userId: userIdNum }]
          
          await payload.update({
            collection: 'domainViews',
            id: viewRecord.id,
            data: {
              users: updatedUsers,
            },
          })
          viewCount = updatedUsers.length
        } else if (!userIdNum) {
          viewCount = users.length
        } else {
          viewCount = users.length
        }
      } else {
    
        const newViewData: any = {
          domainId: domainIdNum,
          users: userIdNum ? [{ userId: userIdNum }] : [],
        }
        
        const newViewRecord = await payload.create({
          collection: 'domainViews',
          data: newViewData,
        })
        viewCount = userIdNum ? 1 : 0
      }
      
      await payload.update({
        collection: 'domains',
        id: domainIdNum,
        data: {
          views: viewCount,
        },
      })
      
      return NextResponse.json({ 
        success: true, 
        views: viewCount 
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