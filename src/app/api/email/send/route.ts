import { NextRequest, NextResponse } from "next/server";

function parseAuth(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const json = Buffer.from(m[1], "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const creds = parseAuth(req);
  const body = await req.json().catch(() => ({} as any));

  const from = body.from || creds?.email || "";
  const to = String(body.to || "").trim();
  const subject = String(body.subject || "").trim();
  const content = String(body.content || "").trim();
  const provider = String(body.provider || creds?.provider || "auto").toLowerCase();

  console.log(`Envoi email SMTP - From: ${from || "undefined"} - To: ${to} - Subject: ${subject || "[Sans objet]"} - Provider: ${provider}`);

  if (!from) {
    return NextResponse.json({ error: "Missing 'from' (aucune adresse expéditeur). Connecte un compte ou fournis 'from'." }, { status: 400 });
  }
  if (!to || !subject || !content) {
    return NextResponse.json({ error: "Champs requis manquants: to, subject, content" }, { status: 400 });
  }

  // TODO: branche ton envoi réel ici (Gmail API ou SMTP via provider IMAP/Outlook)
  // Exemples:
  // if (provider === "gmail") { await sendWithGmailAPI({ from, to, subject, content, ... }); }
  // else { await sendWithSMTP({ host, port, user, pass, secure, from, to, subject, text/html: content }); }

  // Pour la démo on renvoie 200 directement:
  return NextResponse.json({ ok: true, id: `local-${Date.now()}` }, { status: 200 });
}