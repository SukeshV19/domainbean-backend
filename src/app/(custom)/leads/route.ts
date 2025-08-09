import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { cookies } from 'next/headers';

export async function OPTIONS(request: NextRequest) {
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

export async function GET(request: NextRequest) {
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
            'Access-Control-Allow-Origin': 'http://localhost:3001',
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
            'Access-Control-Allow-Origin': 'http://localhost:3001',
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

    if (domainIds.length === 0) {
      return NextResponse.json({
        leads: [],
        totalDocs: 0,
        limit: 100,
        page: 1,
        totalPages: 0
      }, {
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        }
      });
    }

    const leads = await payload.find({
      collection: 'leads',
      where: {
        domainId: {
          in: domainIds
        }
      },
      depth: 2, // Populate relationships to get buyer and domain info
      limit: 100,
      sort: '-createdAt' 
    })

    return NextResponse.json({
      leads: leads.docs,
      totalDocs: leads.totalDocs,
      limit: leads.limit,
      page: leads.page,
      totalPages: leads.totalPages
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

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config });
    
    const cookieStore = cookies();
    const token = cookieStore.get('payload-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { buyerId, domainId, type, message, status } = body;

    if (!buyerId || !domainId) {
      return NextResponse.json(
        { error: 'buyerId and domainId are required' },
        { status: 400 }
      );
    }

    const lead = await payload.create({
      collection: 'leads',
      data: {
        buyerId,
        domainId,
        type: type || 'Offer',
        message: message || '',
        status: status || 'Accepted'
      },
      depth: 1
    });

    return NextResponse.json(
      {
        message: 'Lead created successfully',
        lead
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create lead',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}