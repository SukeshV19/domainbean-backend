import { getPayloadHMR } from '@payloadcms/next/utilities';
import config from '../../../../payload.config.js';

// Handle CORS preflight requests
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

// POST /api/notifications/mark-read - Mark all notifications as read for logged in user
export async function POST(request) {
  try {
    const payload = await getPayloadHMR({ config });
    
    // Get user from cookies/session
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
    console.log(`[API] Marking all notifications as read for user: ${userId}`);

    // First, get all unread notifications for the user
    const unreadNotifications = await payload.find({
      collection: 'notifications',
      where: {
        and: [
          { userId: { equals: userId } },
          { read: { equals: false } }
        ]
      }
    });

    console.log(`[API] Found ${unreadNotifications.docs.length} unread notifications for user ${userId}`);

    // Update all unread notifications to read: true
    const updatePromises = unreadNotifications.docs.map(notification =>
      payload.update({
        collection: 'notifications',
        id: notification.id,
        data: { read: true }
      })
    );

    await Promise.all(updatePromises);

    console.log(`[API] Successfully marked ${unreadNotifications.docs.length} notifications as read for user ${userId}`);

    return Response.json({
      success: true,
      message: `Marked ${unreadNotifications.docs.length} notifications as read`,
      updatedCount: unreadNotifications.docs.length
    }, {
      headers: {
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3001',
        'Access-Control-Allow-Credentials': 'true',
      },
    });

  } catch (error) {
    console.error('[API] Error marking notifications as read:', error);
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