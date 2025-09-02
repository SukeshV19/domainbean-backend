import { setBroadcastFunction } from '../../../../lib/counter-consumer.js';

let clients = new Set();

export async function POST(request) {
  try {
    const data = await request.json();
    broadcastCounterUpdate(data.value, data.message);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error handling counter update:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const client = {
        controller,
        closed: false,
        send: (data) => {
          if (client.closed) return;
          
          try {
            controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
          } catch (error) {
            if (error.code === 'ERR_INVALID_STATE' || error.message.includes('Controller is already closed')) {
              client.closed = true;
              clients.delete(client);
            } else {
              console.error('Error sending SSE data:', error);
            }
          }
        }
      };
      
      clients.add(client);
      
      // Send initial connection message
      client.send({ type: 'connected', message: 'Counter stream connected' });
    },
    
    cancel() {
      // Find and mark client as closed when connection is cancelled
      const clientsToRemove = [];
      clients.forEach(client => {
        if (client.controller === controller) {
          client.closed = true;
          clientsToRemove.push(client);
        }
      });
      
      clientsToRemove.forEach(client => {
        clients.delete(client);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

export const broadcastCounterUpdate = (counterValue, message) => {
  const data = {
    type: 'counter',
    value: counterValue,
    message: message,
    timestamp: new Date().toISOString()
  };
  
  // console.log(`[SSE] Broadcasting to ${clients.size} clients:`, data);
  
  const clientsToRemove = [];
  
  clients.forEach(client => {
    if (client.closed) {
      clientsToRemove.push(client);
      return;
    }
    
    try {
      client.send(data);
    } catch (error) {
      client.closed = true;
      clientsToRemove.push(client);
    }
  });
  
  // Remove closed clients
  clientsToRemove.forEach(client => {
    clients.delete(client);
  });
};

// Set the broadcast function for the consumer to use
setBroadcastFunction(broadcastCounterUpdate);