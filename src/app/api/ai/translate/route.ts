import { NextRequest, NextResponse } from "next/server";
import SmartAIProvider from "@/lib/ai/smart-provider";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, targetLanguage = "en" } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Utiliser le nouveau provider intelligent
    const aiProvider = SmartAIProvider.getInstance();
    const result = await aiProvider.translateText(text, targetLanguage);

    return NextResponse.json({
      ok: true,
      detectedLanguage: "auto",
      targetLanguage,
      ...result
    });

  } catch (error: any) {
    console.error("🚨 Translation API error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Translation failed" },
      { status: 500 }
    );
  }
}
