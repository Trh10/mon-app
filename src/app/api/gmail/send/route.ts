import { NextRequest, NextResponse } from 'next/server';

// Temporarily disabled next-auth dependency
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "Gmail send API temporarily disabled" },
    { status: 503 }
  );
}