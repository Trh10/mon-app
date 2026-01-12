import { NextResponse } from 'next/server';

/**
 * API Health Check
 * GET /api/health
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
