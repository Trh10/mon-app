import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

function parseAuth(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try { return JSON.parse(Buffer.from(m[1], 'base64').toString('utf8')); } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const creds = parseAuth(req);
    const {
      originalMessageId,
      replyType, // 'reply' | 'reply-all' | 'forward'
      subject,
      body,
      content,
      to,
      cc,
      from,
      fromName,
      fromPassword,
      inReplyTo,
      references
    } = await req.json();

    const text = (content || body || '').trim();
    if (!text) return NextResponse.json({ error: 'Contenu vide' }, { status: 400 });

    const sender = (from || creds?.email || '').trim();
    const password = fromPassword || creds?.password;
    if (!sender || !password) return NextResponse.json({ error: 'Identifiants expéditeur manquants' }, { status: 400 });

    const domain = sender.split('@')[1] || '';
    const smtpMap: Record<string, { host: string; port: number; secure: boolean }> = {
      'gmail.com': { host: 'smtp.gmail.com', port: 587, secure: false },
      'outlook.com': { host: 'smtp.office365.com', port: 587, secure: false },
      'hotmail.com': { host: 'smtp.office365.com', port: 587, secure: false },
      'live.com': { host: 'smtp.office365.com', port: 587, secure: false },
      'yahoo.com': { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
    };
    const fallbackHost = domain ? `smtp.${domain}` : '';
    const cfg = smtpMap[domain] || { host: fallbackHost, port: 587, secure: false };
    if (!cfg.host) return NextResponse.json({ error: 'Serveur SMTP introuvable' }, { status: 400 });

    // Destinataires (le front garde la logique; on n'altère pas l'UI)
    const toList = Array.isArray(to) ? to : (to ? [to] : []);
    const ccList = Array.isArray(cc) ? cc : (cc ? [cc] : []);
    if (toList.length === 0 && replyType !== 'forward') {
      return NextResponse.json({ error: 'Destinataire manquant' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: sender, pass: password },
      tls: { rejectUnauthorized: false }
    });

    // Vérification non bloquante
    try { await Promise.race([transporter.verify(), new Promise((_, rej) => setTimeout(() => rej(new Error('verify timeout')), 6000))]); } catch {}

    const html = text.replace(/\n/g, '<br>');
    const headers: Record<string,string> = { 'X-Mailer': 'MonApp Reply' };
    const finalInReply = inReplyTo || originalMessageId;
    if (finalInReply) headers['In-Reply-To'] = finalInReply;
    if (references) {
      headers['References'] = Array.isArray(references) ? references.join(' ') : String(references);
    } else if (finalInReply) {
      headers['References'] = finalInReply;
    }

    const mailOptions: any = {
      from: fromName ? `${fromName} <${sender}>` : sender,
      to: toList.join(', '),
      cc: ccList.length ? ccList.join(', ') : undefined,
      subject: subject || '(sans objet)',
      text,
      html,
      headers
    };

    console.log('[email/send-reply] attempt', { sender, to: mailOptions.to, cc: mailOptions.cc, replyType, originalMessageId });
    const info = await transporter.sendMail(mailOptions);
    console.log('[email/send-reply] sent id=', info.messageId);
    return NextResponse.json({ ok: true, replyType, messageId: info.messageId, accepted: info.accepted });
  } catch (error: any) {
    console.error('[email/send-reply] ERROR', error);
    return NextResponse.json({ error: error?.message || 'Erreur envoi reply' }, { status: 500 });
  }
}
