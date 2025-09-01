import { NextRequest, NextResponse } from "next/server";
import SmartAIProvider from "@/lib/ai/smart-provider";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject = "", from = "", content = "" } = body || {};
    
    if (!content && !subject) {
      return NextResponse.json({ error: "content or subject is required" }, { status: 400 });
    }

    // Utiliser le nouveau provider intelligent
    const aiProvider = SmartAIProvider.getInstance();
    const result = await aiProvider.predictPriority(subject, content, from);

    return NextResponse.json({
      ok: true,
      ...result
    });

  } catch (error: any) {
    console.error("🚨 Priority prediction error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Priority prediction failed" },
      { status: 500 }
    );
  }
}