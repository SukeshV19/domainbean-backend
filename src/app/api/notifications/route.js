import config from '../../../payload.config.js';
import { getPayload } from 'payload';

export async function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function GET(request) {
  try {
    const payload = await getPayload({ config });
    
    const user = await payload.auth({ headers: request.headers });
    
    if (!user.user) {
      return Response.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }

    const userId = user.user.id;
    const notifications = await payload.find({
      collection: 'notifications',
      where: {
        userId: { equals: userId }
      },
      sort: '-createdAt',
      limit: 0,
    });

    return Response.json({
      success: true,
      notifications: notifications.docs,
      unreadCount: notifications.docs.filter(n => !n.read).length
    }, {
      headers: {
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
        'Access-Control-Allow-Credentials': 'true',
      },
    });

  } catch (error) {
    console.error('[API] Error fetching notifications:', error);
    return Response.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        },
      }
    );
  }
}