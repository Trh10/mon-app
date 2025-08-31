import { NextRequest, NextResponse } from "next/server";
import { listAudit } from "../../../../lib/audit/store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || "";
  const limit = Number(searchParams.get("limit") || 100);
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const items = listAudit(limit * 5).filter((ev) => ev.user?.id === userId).slice(-limit);
  return NextResponse.json({ items });
}