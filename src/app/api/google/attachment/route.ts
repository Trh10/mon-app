import { NextRequest } from "next/server";
import { getAuthedGmail } from "@lib/google";

export const runtime = "nodejs";

function isPdf(filename?: string) {
  return !!filename && filename.toLowerCase().endsWith(".pdf");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("messageId");
  const attachmentId = searchParams.get("attachmentId");

  if (!messageId || !attachmentId) {
    return new Response(JSON.stringify({ error: "Missing messageId or attachmentId" }), { status: 400 });
  }

  try {
    const gmail = getAuthedGmail();

    // Retrouver mimeType/filename depuis le message
    const msg = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
    let filename = "attachment";
    let mimeType = "application/octet-stream";
    const scan = (p: any) => {
      if (!p) return;
      if (p.parts) p.parts.forEach(scan);
      const attId = p?.body?.attachmentId;
      if (attId === attachmentId) {
        filename = p.filename || filename;
        mimeType = p.mimeType || mimeType;
      }
    };
    scan(msg.data.payload);

    const att = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId
    });

    const data = att.data.data || "";
    const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
    const buffer = Buffer.from(b64, "base64");

    const headers = new Headers();
    headers.set("Content-Type", isPdf(filename) ? "application/pdf" : mimeType);
    // inline pour prévisualiser, attachment pour forcer le téléchargement
    headers.set("Content-Disposition", `inline; filename="${filename}"`);
    headers.set("Cache-Control", "private, max-age=600");

    return new Response(buffer, { headers });
  } catch (e: any) {
    const m = e?.message || "Error";
    const status = m.includes("Not authenticated") ? 401 : 500;
    return new Response(JSON.stringify({ error: m }), { status });
  }
}