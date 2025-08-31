import { NextRequest, NextResponse } from "next/server";
import { detectSentiment } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content = "" } = body || {};
    if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });
    const result = detectSentiment({ content });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}