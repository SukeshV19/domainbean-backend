import { kafka } from './kafka-connect.js';

const COUNTER_TOPIC = 'counter';
let counter = 0;
let producer = null;
let intervalId = null;
let isRunning = false;

const startCounterProducer = async () => {
  // Prevent multiple instances
  if (isRunning) {
    console.log('[COUNTER] Producer already running');
    return;
  }

  // Stop any existing producer first
  if (producer || intervalId) {
    await stopCounterProducer();
  }

  try {
    isRunning = true;
    producer = kafka.producer();
    const admin = kafka.admin();
    
    await producer.connect();
    await admin.connect();
    console.log('[COUNTER] Connected to Kafka');
    
    // Create counter topic if it doesn't exist
    const existingTopics = await admin.listTopics();
    if (!existingTopics.includes(COUNTER_TOPIC)) {
      console.log(`[COUNTER] Creating topic: ${COUNTER_TOPIC}`);
      await admin.createTopics({
        topics: [{
          topic: COUNTER_TOPIC,
          numPartitions: 1,
          replicationFactor: 1
        }]
      });
      console.log(`[COUNTER] Topic ${COUNTER_TOPIC} created successfully`);
    }
    
    await admin.disconnect();
    
    // Start sending counter messages every 3 seconds
    intervalId = setInterval(async () => {
      counter++;
      const message = `Counter: ${counter}`;
      
      try {
        await producer.send({
          topic: COUNTER_TOPIC,
          messages: [{
            key: 'counter',
            value: message,
            timestamp: Date.now().toString()
          }]
        });
        // console.log(`[COUNTER] Sent: ${message}`);
      } catch (error) {
        console.error('[COUNTER] Error sending message:', error);
      }
    }, 3000);
    
    console.log('[COUNTER] Producer started - sending counter every 3 seconds');
    
  } catch (error) {
    console.error('[COUNTER] Error starting producer:', error);
    isRunning = false;
  }
};

const stopCounterProducer = async () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
  
  isRunning = false;
  console.log('[COUNTER] Producer stopped');
};

// Graceful shutdown
process.on('SIGTERM', stopCounterProducer);
process.on('SIGINT', stopCounterProducer);

export { startCounterProducer, stopCounterProducer };