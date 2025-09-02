import { kafka } from './kafka-connect.js';

const COUNTER_TOPIC = 'counter';
const GROUP_ID = 'backend-counter-consumer-group';

let consumer = null;
let isConnected = false;
let broadcastFunction = null;

// Set the broadcast function from the SSE route
export const setBroadcastFunction = (fn) => {
  broadcastFunction = fn;
  console.log('[COUNTER CONSUMER] Broadcast function set');
};

const startCounterConsumer = async () => {
  if (isConnected && consumer) {
    console.log('[COUNTER CONSUMER] Already running');
    return;
  }

  // Stop any existing consumer first
  if (consumer) {
    await stopCounterConsumer();
  }

  try {
    consumer = kafka.consumer({ groupId: GROUP_ID });
    await consumer.connect();
    console.log('[COUNTER CONSUMER] Connected to Kafka');

    await consumer.subscribe({ 
      topic: COUNTER_TOPIC, 
      fromBeginning: false 
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageText = message.value.toString();
          // console.log('[COUNTER CONSUMER] Received:', messageText);
          
          // Extract counter value from message format "Counter: X"
          const match = messageText.match(/Counter:\s*(\d+)/);
          const counterValue = match ? parseInt(match[1]) : 0;
          
          // Broadcast to SSE connections if function is available
          if (broadcastFunction) {
            broadcastFunction(counterValue, messageText);
          } else {
            console.log('[COUNTER CONSUMER] No broadcast function available');
          }
          
        } catch (error) {
          console.error('[COUNTER CONSUMER] Error processing message:', error);
        }
      },
    });
    
    isConnected = true;
    console.log('[COUNTER CONSUMER] Started and listening for messages');
    
  } catch (error) {
    console.error('[COUNTER CONSUMER] Error starting:', error);
    isConnected = false;
  }
};

const stopCounterConsumer = async () => {
  if (!isConnected || !consumer) {
    console.log('[COUNTER CONSUMER] Not running');
    return;
  }

  try {
    await consumer.disconnect();
    consumer = null;
    isConnected = false;
    console.log('[COUNTER CONSUMER] Stopped');
  } catch (error) {
    console.error('[COUNTER CONSUMER] Error stopping:', error);
  }
};

// Graceful shutdown
process.on('SIGTERM', stopCounterConsumer);
process.on('SIGINT', stopCounterConsumer);

export { startCounterConsumer, stopCounterConsumer };

// Auto-start the consumer only once
if (process.env.NODE_ENV !== 'test' && !consumer && !isConnected) {
  startCounterConsumer().catch(console.error);
}