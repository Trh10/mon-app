import { NextRequest, NextResponse } from 'next/server';

// Temporarily disabled Firebase admin dependency
export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    error: 'Firebase Gmail API temporarily disabled',
    emails: [],
    stats: { total: 0, unread: 0, provider: 'firebase_gmail', folder: 'INBOX' }
  }, { status: 503 });
}