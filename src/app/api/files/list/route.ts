import { NextRequest, NextResponse } from "next/server";
import { listFilesByRoom, listFilesForUser } from "../../../../lib/files/store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room");
  const userId = searchParams.get("userId");
  if (room) {
    return NextResponse.json({ items: listFilesByRoom(room) });
  }
  if (userId) {
    return NextResponse.json({ items: listFilesForUser(userId) });
  }
  return NextResponse.json({ items: [] });
}