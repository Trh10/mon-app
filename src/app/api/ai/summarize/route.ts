import { NextRequest, NextResponse } from "next/server";
import { stripHtml, cleanEmailBody } from "../../../../lib/ai/cleanEmail";
import { summarizeText } from "../../../../lib/ai/provider";

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
    const out = await summarizeText(cleaned, lang);

    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}