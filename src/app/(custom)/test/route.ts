import { NextRequest } from 'next/server'

export const GET = async (_request: NextRequest) => {
  console.log('Test API called')
  
  return Response.json({ 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  }, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3001',
      'Access-Control-Allow-Credentials': 'true',
    }
  })
}

export const OPTIONS = async (_request: NextRequest) => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3001',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  })
}