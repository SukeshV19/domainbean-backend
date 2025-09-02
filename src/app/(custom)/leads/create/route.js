import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { cookies } from 'next/headers';

export async function OPTIONS(_request) {
  return new NextResponse(null, { 
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3001',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function POST(request) {
  try {
    const payload = await getPayload({ config });
    
    const cookieStore = await cookies();
    const token = cookieStore.get('payload-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
    const body = await request.json();
    const { buyerId, domainId, type, message, status } = body;
    
    if (!buyerId || !domainId) {
      return NextResponse.json(
        { error: 'buyerId and domainId are required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    const lead = await payload.create({
      collection: 'leads',
      data: {
        buyerId,
        domainId,
        type: type || 'Offer',
        chats: message ? [{
          userId: buyerId,
          message: message
        }] : [],
        status: status || 'Accepted'
      },
      depth: 2
    })
    
    return NextResponse.json(
      {
        message: 'Lead created successfully',
        lead
      },
      { 
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );

  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create lead',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  }
}