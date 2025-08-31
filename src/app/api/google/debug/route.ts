import { NextResponse } from "next/server";
import { readTokensFromCookie } from "@lib/google";
export const runtime = "nodejs";
export async function GET() {
  const tokens = readTokensFromCookie();
  return NextResponse.json({
    hasCookie: !!tokens,
    tokenKeys: tokens ? Object.keys(tokens) : [],
  });
}