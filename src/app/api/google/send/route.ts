import { NextRequest, NextResponse } from "next/server";
import { getAuthedGmail } from "@lib/google";
import { buildMimeMessage, type MimeAttachment } from "@lib/gmail-mime";

export const runtime = "nodejs";

type SendBody = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  threadId?: string;
  headers?: Record<string, string>;
  attachments?: MimeAttachment[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SendBody;
    if (!body?.to || !body?.subject) {
      return NextResponse.json({ error: "Missing 'to' or 'subject'" }, { status: 400 });
    }

    const gmail = getAuthedGmail();
    const raw = buildMimeMessage({
      to: body.to,
      subject: body.subject,
      html: body.html,
      text: body.text,
      headers: body.headers,
      attachments: body.attachments
    });

    const r = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw, threadId: body.threadId }
    });

    return NextResponse.json({ ok: true, id: r.data.id, threadId: r.data.threadId });
  } catch (e: any) {
    const m = e?.message || "Error";
    const status = m.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ error: m }, { status });
  }
}