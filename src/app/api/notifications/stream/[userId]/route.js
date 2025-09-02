import { kafka, getUserPartition } from '@/lib/kafka-connect.js';

export async function GET(request, { params }) {
  const { userId } = await params;
  
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  };

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);
      let isActive = true;
      let controllerClosed = false;
      let abortHandled = false;
      
      const userPartition = getUserPartition(userId, 10);
      
      const consumer = kafka.consumer({ 
        groupId: `sse-debug-${userId}-${Date.now()}`,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        maxWaitTimeInMs: 1000,
        allowAutoTopicCreation: true
      });
      
      const startConsumer = async () => {
        try {
          const topicName = 'notifications';
          console.log(`[SSE] 🔄 Starting consumer for topic: ${topicName}, partition: ${userPartition}, userId: ${userId}`);
          
          console.log(`[SSE] 🔌 Connecting to Kafka...`);
          await consumer.connect();
          console.log(`[SSE] ✅ Connected to Kafka successfully`);
          
          // Subscribe to topic and filter by userId in consumer - start from latest to avoid old messages
          console.log(`[SSE] 📌 Subscribing to topic ${topicName}...`);
          await consumer.subscribe({ topic: topicName, fromBeginning: false });
          console.log(`[SSE] ✅ Successfully subscribed to topic ${topicName} for userId: ${userId} (from latest messages)`);
          
          console.log(`[SSE] 🏃 Starting consumer run loop...`);
          
          // Send a test heartbeat message to confirm SSE is working
          setTimeout(() => {
            if (isActive && !controllerClosed) {
              console.log(`[SSE] 💓 Sending heartbeat to userId: ${userId}`);
              controller.enqueue(`data: ${JSON.stringify({
                type: 'heartbeat',
                timestamp: new Date().toISOString(),
                message: 'Connection alive'
              })}\n\n`);
            }
          }, 2000);
          
          let hasStarted = false;
          
          await consumer.run({
            partitionsConsumedConcurrently: 10, // Process all partitions concurrently
            eachMessage: async ({ topic, partition, message }) => {
              console.log(`[SSE] 📨 RAW Message received from topic: ${topic}, partition: ${partition}, message key: ${message.key ? message.key.toString() : 'null'}`);
              console.log(`[SSE] 📨 Message value: ${message.value ? message.value.toString() : 'null'}`);
              
              // Filter messages to only process from user's assigned partition
              if (partition !== userPartition) {
                console.log(`[SSE] ⏭️ Skipping message from partition ${partition}, user ${userId} should use partition ${userPartition}`);
                return;
              }
              
              console.log(`[SSE] 🎯 Processing message from correct partition ${partition} for userId ${userId}`);
              
              if (isActive && !controllerClosed) {
                try {
                  const notification = JSON.parse(message.value.toString());
                  console.log(`[SSE] 📋 Processing message from partition ${partition}:`, notification);
                  
                  // Filter messages for this specific userId
                  console.log(`[SSE] 🔍 Comparing message userId: ${notification.userId} (${typeof notification.userId}) with expected: ${userId} (${typeof userId})`);
                  
                  if (String(notification.userId) === String(userId)) { // Convert both to strings for comparison
                    console.log(`[SSE] ✅ Match! Received message for userId ${userId} from partition ${partition}:`, notification);
                    controller.enqueue(`data: ${JSON.stringify(notification)}\n\n`);
                    console.log(`[SSE] 📤 Enqueued message to SSE stream`);
                  } else {
                    console.log(`[SSE] ❌ No match. Message userId ${notification.userId} doesn't match expected ${userId}, skipping`);
                  }
                } catch (error) {
                  console.log(`[SSE] ❗ Error processing message:`, error);
                }
              } else {
                console.log(`[SSE] ⏸️ Consumer inactive or controller closed, skipping message`);
              }
            },
          });
          
          console.log(`[SSE] 🔄 Consumer run loop started successfully`);
        } catch (error) {
          console.log(`[SSE] ❌ Consumer error:`, error);
          console.error(`[SSE] Full error details:`, error);
        }
      };

      startConsumer();
      
      request.signal.addEventListener('abort', async () => {
        if (abortHandled) return; // Prevent multiple executions
        abortHandled = true;
        
        isActive = false;
        controllerClosed = true;
        
        try {
          await consumer.disconnect();
        } catch (error) {
          console.log('Consumer disconnect error:', error)
        }
        
        // Don't try to close controller - let it close naturally
      });
    }
  });

  return new Response(stream, { headers });
}