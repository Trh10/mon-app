import { NextRequest, NextResponse } from "next/server";
import { listChatMessages } from "../../../../lib/realtime/chatStore";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room") || "default";
  const limit = Number(searchParams.get("limit") || 200);
  const items = listChatMessages(room, isFinite(limit) ? limit : 200);
  return NextResponse.json({ items });
}