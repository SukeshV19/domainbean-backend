import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { cookies } from 'next/headers';

export async function OPTIONS(_request) {
  return new NextResponse(null, { 
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3001',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function PUT(request) {
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
    const { leadId, userId, message } = body;

    if (!leadId || !userId || !message) {
      return NextResponse.json(
        { error: 'leadId, userId, and message are required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Get the lead
    const lead = await payload.findByID({
      collection: 'leads',
      id: leadId,
      depth: 1
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Add new message to existing chats array
    const updatedChats = [
      ...(lead.chats || []),
      {
        userId,
        message
      }
    ];

    // Update lead with new chat message
    const updatedLead = await payload.update({
      collection: 'leads',
      id: leadId,
      data: {
        chats: updatedChats
      },
      depth: 2
    });

    return NextResponse.json(
      {
        message: 'Message added successfully',
        lead: updatedLead
      },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );

  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add message',
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