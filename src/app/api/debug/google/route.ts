import { NextResponse } from 'next/server';
import { readTokensFromCookie } from '@/lib/google';

export async function GET() {
  try {
    const tokens = readTokensFromCookie();
    return NextResponse.json({
      hasTokens: !!tokens,
      tokens: tokens ? { access_token: '***', refresh_token: !!tokens.refresh_token, expiry_date: tokens.expiry_date } : null,
      env: {
        GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'not set'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
