import { NextRequest, NextResponse } from "next/server";
import { hub } from "../../../../lib/realtime/hub";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const org = searchParams.get("org") || "company-1";
  const members = hub.members(`org:${org}`);
  return NextResponse.json({ members });
}