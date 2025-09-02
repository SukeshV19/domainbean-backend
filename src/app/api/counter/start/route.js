import { startCounterProducer } from '../../../../lib/counter-producer.js';

export async function POST() {
  try {
    await startCounterProducer();
    return Response.json({ success: true, message: 'Counter producer started' });
  } catch (error) {
    console.error('Error starting counter producer:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}