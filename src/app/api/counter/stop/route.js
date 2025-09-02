import { stopCounterProducer } from '../../../../lib/counter-producer.js';

export async function POST() {
  try {
    await stopCounterProducer();
    return Response.json({ success: true, message: 'Counter producer stopped' });
  } catch (error) {
    console.error('Error stopping counter producer:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}