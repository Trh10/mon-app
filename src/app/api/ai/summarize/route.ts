import { NextRequest, NextResponse } from "next/server";
import { stripHtml, cleanEmailBody } from "../../../../lib/ai/cleanEmail";
import SmartAIProvider from "../../../../lib/ai/smart-provider";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const subject = String(body?.subject || "");
    const lang = (body?.lang === "en" ? "en" : "fr") as "fr" | "en";

    let text = "";
    if (body?.bodyText) text = String(body.bodyText);
    else if (body?.bodyHtml) text = stripHtml(String(body.bodyHtml || ""));
    else if (body?.text) text = String(body.text);

    if (!text.trim() && !subject.trim()) {
      return NextResponse.json({ error: "Missing email content" }, { status: 400 });
    }

    const cleaned = cleanEmailBody({ subject, text });
    
    // Utiliser le nouveau provider intelligent
    const aiProvider = SmartAIProvider.getInstance();
    const result = await aiProvider.summarizeEmail(subject, cleaned, lang);

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("🚨 Summarize API error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}