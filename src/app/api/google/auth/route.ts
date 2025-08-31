import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@lib/google";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || String(e),
        has_GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        has_GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || "http://localhost:3000/api/google/callback",
      },
      { status: 500 }
    );
  }
}