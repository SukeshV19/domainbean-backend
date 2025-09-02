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

export async function GET(request) {
  try {
    const payload = await getPayload({ config });
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('payload-token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    const userDomains = await payload.find({
      collection: 'domains',
      where: {
        ownedBy: {
          equals: userId
        }
      },
      limit: 1000
    });

    const domainIds = userDomains.docs.map(domain => domain.id);
    
   
    const orConditions = [];
    
    if (domainIds.length > 0) {
      orConditions.push({ domainId: { in: domainIds } });
    }
    
    orConditions.push({ buyerId: { equals: userId } });

    const leads = await payload.find({
      collection: 'leads',
      where: {
        or: orConditions
      },
      depth: 2, 
      limit: 100,
      sort: '-createdAt' 
    })

    return NextResponse.json({
      leads: leads.docs
    }, {
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3001',
        'Access-Control-Allow-Credentials': 'true',
      }
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch leads',
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