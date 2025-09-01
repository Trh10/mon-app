import { NextRequest, NextResponse } from "next/server";
import SmartAIProvider from "@/lib/ai/smart-provider";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject = "", from = "", content = "" } = body || {};
    
    if (!content && !subject) {
      return NextResponse.json({ error: "content or subject is required" }, { status: 400 });
    }

    // Utiliser le nouveau provider intelligent
    const aiProvider = SmartAIProvider.getInstance();
    const result = await aiProvider.suggestReplies(subject, content, from);

    return NextResponse.json({
      ok: true,
      suggestions: result.suggestions || [],
      ...result
    });

  } catch (e: any) {
    console.error("🚨 Suggest replies error:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}