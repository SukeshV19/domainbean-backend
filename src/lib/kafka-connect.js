import { Kafka, logLevel } from 'kafkajs';
import fs from 'fs';
import path from 'path';

const getCertificates = () => {
  try {
    const caPath = path.join(process.cwd(), '..', 'ca.pem');
    const certPath = path.join(process.cwd(), '..', 'service.cert');
    const keyPath = path.join(process.cwd(), '..', 'service.key');

    return {
      ca: [fs.readFileSync(caPath, 'utf-8')],
      cert: fs.readFileSync(certPath, 'utf-8'),
      key: fs.readFileSync(keyPath, 'utf-8'),
    };
  } catch (error) {
    console.error('Error reading SSL certificates:', error);
    throw error;
  }
};

const kafka = new Kafka({
  clientId: 'domainbean-api',
  brokers: ['kafka-e9d7694-osiltec-fe50.d.aivencloud.com:13129'],
  ssl: getCertificates(),
  logLevel: logLevel.NOTHING,
})

const getUserPartition = (userId, numPartitions = 10) => {
  // Simple hash function - converts userId to consistent partition number
  let hash = 0;
  const str = String(userId);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % numPartitions;
};

const sendNotificationToUser = async (userId, notification) => {
  const producer = kafka.producer();
  const admin = kafka.admin();
  
  try {
    console.log(`[KAFKA] Starting notification send for userId: ${userId}, type: ${notification.type}`);
    
    await producer.connect();
    await admin.connect();
    console.log('[KAFKA] Connected to Kafka');
    
    const topicName = 'notifications';
    const numPartitions = 10;
    const userPartition = getUserPartition(userId, numPartitions);
    
    console.log(`[KAFKA] Topic: ${topicName}, userId: ${userId} -> partition: ${userPartition}`);
    
    const existingTopics = await admin.listTopics();
    console.log(`[KAFKA] Existing topics: ${existingTopics.length} topics found`);
    
    if (!existingTopics.includes(topicName)) {
      console.log(`[KAFKA] Topic ${topicName} does not exist, attempting to create...`);
      try {
        await admin.createTopics({
          topics: [{
            topic: topicName,
            numPartitions: numPartitions,
            replicationFactor: 1
          }]
        });
        console.log(`[KAFKA] Successfully created topic: ${topicName} with ${numPartitions} partitions`);
      } catch (createError) {
        console.error(`[KAFKA] Topic creation failed for ${topicName}:`, createError);
        // Continue anyway - topic might already exist or be created by another process
      }
    } else {
      console.log(`[KAFKA] Topic ${topicName} already exists`);
    }
    
    const message = { 
      type: 'notification', 
      userId: userId, 
      timestamp: new Date().toISOString(), 
      data: notification 
    };
    console.log(`[KAFKA] Sending message to topic ${topicName}, partition ${userPartition}:`, JSON.stringify(message));
    
    try {
      await producer.send({
        topic: topicName,
        messages: [{
          key: String(userId),
          value: JSON.stringify(message),
          partition: userPartition,
          timestamp: Date.now().toString()
        }],
      });
    } catch (sendError) {
      console.error(`[KAFKA] Failed to send message to topic ${topicName}:`, sendError);
      
      // If topic doesn't exist, try creating it first then retry
      if (sendError.type === 'INVALID_TOPIC_EXCEPTION') {
        console.log(`[KAFKA] Retrying topic creation and message send for ${topicName}...`);
        try {
          await admin.createTopics({
            topics: [{
              topic: topicName,
              numPartitions: numPartitions,
              replicationFactor: 1
            }]
          });
          console.log(`[KAFKA] Created topic on retry: ${topicName} with ${numPartitions} partitions`);
          
          // Retry message send
          await producer.send({
            topic: topicName,
            messages: [{
              key: String(userId),
              value: JSON.stringify(message),
              partition: userPartition,
              timestamp: Date.now().toString()
            }],
          });
          console.log(`[KAFKA] Message sent successfully on retry to partition ${userPartition}`);
        } catch (retryError) {
          console.error(`[KAFKA] Retry failed for ${topicName}:`, retryError);
          throw retryError;
        }
      } else {
        throw sendError;
      }
    }
    
    console.log(`[KAFKA] Successfully sent notification to userId: ${userId}, partition: ${userPartition}`);
    return { success: true, message: 'Notification sent successfully', partition: userPartition };
    
  } catch (error) {
    console.error(`[KAFKA] Error sending notification to userId ${userId}:`, error);
    throw error;
  } finally {
    await producer.disconnect();
    await admin.disconnect();
    console.log('[KAFKA] Disconnected from Kafka');
  }
}

export { kafka, sendNotificationToUser, getUserPartition };
export default kafka;