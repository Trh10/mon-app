import { NextRequest, NextResponse } from "next/server";
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/google-auth';

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

  // Compatibilité front: accepter fromEmail / text / html / content
  const from = (body.from || body.fromEmail || creds?.email || '').trim();
  const to = String(body.to || '').trim();
  const subject = String(body.subject || '').trim();
  const rawContent = body.content || body.text || body.html || '';
  const content = String(rawContent).trim();
  const provider = String(body.provider || creds?.provider || 'auto').toLowerCase();
  const password = body.fromPassword || creds?.password || body.password;
  const fromName = body.fromName || '';

  console.log(`[API email/send] Attempt -> from=${from || 'undefined'} to=${to} subject='${subject}' provider=${provider}`);

  if (!from) return NextResponse.json({ error: "Adresse expéditeur manquante" }, { status: 400 });
  if (!to || !subject || !content) return NextResponse.json({ error: "Champs requis manquants: to, subject, content" }, { status: 400 });
  // Si on n'a pas de mot de passe et qu'on est sur Gmail, tenter l'envoi via l'API Gmail (OAuth)
  if (!password) {
    try {
      const auth = getAuthenticatedClient();
      const gmail = google.gmail({ version: 'v1', auth });

      // Construire un message RFC822 simple (texte brut)
      const headers: string[] = [];
      if (fromName) headers.push(`From: ${fromName} <${from}>`); else headers.push(`From: ${from}`);
      headers.push(`To: ${to}`);
      if (body.cc) headers.push(`Cc: ${body.cc}`);
      if (body.bcc) headers.push(`Bcc: ${body.bcc}`);
      headers.push(`Subject: ${subject}`);
      headers.push(`MIME-Version: 1.0`);
      headers.push(`Content-Type: text/plain; charset=UTF-8`);
      headers.push(`Content-Transfer-Encoding: 7bit`);
      if (body.inReplyTo) headers.push(`In-Reply-To: ${body.inReplyTo}`);
      if (body.references) headers.push(`References: ${body.references}`);

      const raw = headers.join('\r\n') + `\r\n\r\n${content}`;
      const base64Url = Buffer.from(raw, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const resp = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: base64Url } });
      const id = (resp.data as any)?.id;
      return NextResponse.json({ ok: true, via: 'gmail-api', messageId: id });
    } catch (e: any) {
      const msg = e?.message || 'Erreur envoi Gmail API';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // Déduire domaine & config SMTP
  const domain = from.split('@')[1] || '';
  const smtpMap: Record<string, { host: string; port: number; secure: boolean }> = {
    'gmail.com': { host: 'smtp.gmail.com', port: 587, secure: false },
    'outlook.com': { host: 'smtp.office365.com', port: 587, secure: false },
    'hotmail.com': { host: 'smtp.office365.com', port: 587, secure: false },
    'live.com': { host: 'smtp.office365.com', port: 587, secure: false },
    'yahoo.com': { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
  };
  const fallbackHost = domain ? `smtp.${domain}` : '';
  const cfg = smtpMap[domain] || { host: fallbackHost, port: 587, secure: false };

  if (!cfg.host) return NextResponse.json({ error: "Impossible de déterminer le serveur SMTP" }, { status: 400 });

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: from, pass: password },
      tls: { rejectUnauthorized: false }
    });

    // Optionnel: vérifier la connexion (timeouts rapides)
    try {
      await Promise.race([
        transporter.verify(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('SMTP verify timeout')), 8000))
      ]);
    } catch (verErr: any) {
      console.warn('[email/send] verify échoué (continue quand même):', verErr?.message);
    }

    const html = body.html || content.replace(/\n/g, '<br>');
    const mailOptions: any = {
      from: fromName ? `${fromName} <${from}>` : from,
      to,
      subject,
      text: content,
      html,
      headers: {
        'X-Mailer': 'MonApp Mailer'
      }
    };
    if (body.inReplyTo) mailOptions.inReplyTo = body.inReplyTo;
    if (body.references) mailOptions.references = body.references;

    const info = await transporter.sendMail(mailOptions);
    console.log('[email/send] Sent OK id=', info.messageId, 'accepted=', info.accepted);
    return NextResponse.json({ ok: true, messageId: info.messageId, accepted: info.accepted });
  } catch (e: any) {
    console.error('[email/send] ERROR', e); 
    const msg = e?.response?.includes('Invalid login') || /auth/i.test(e?.message || '') ? 'Authentification SMTP échouée' : e?.message || 'Erreur envoi';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}