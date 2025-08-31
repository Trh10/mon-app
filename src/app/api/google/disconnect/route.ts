import { NextResponse } from "next/server";
import { clearTokensOnResponse } from "@lib/google";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearTokensOnResponse(res);
  return res;
}