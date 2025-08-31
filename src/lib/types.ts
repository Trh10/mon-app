'use server';
import 'server-only';
import { google } from 'googleapis';
import type { Email, Attachment } from '@/lib/types';

// Helpers
function b64urlDecode(data?: string): string {
  if (!data) return '';
  const norm = data.replace(/-/g, '+').replace(/_/g, '/');
  const pad = norm.length % 4 === 0 ? '' : '='.repeat(4 - (norm.length % 4));
  const buff = Buffer.from(norm + pad, 'base64');
  return buff.toString('utf8');
}

function headerValue(headers: any[] | undefined, name: string): string {
  if (!headers) return '';
  return headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

function parseFrom(value: string): { text: string; name?: string } {
  const text = value || 'Expéditeur inconnu';
  const nameMatch = text.match(/^(.*?)\s*<.*?>$/);
  const name = nameMatch?.[1]?.trim() || undefined;
  return { text, name };
}

function folderToQuery(folder: string) {
  const f = (folder || 'INBOX').toUpperCase();
  switch (f) {
    case 'INBOX': return 'in:inbox';
    case 'STARRED': return 'is:starred';
    case 'SENT': return 'in:sent';
    case 'DRAFTS': return 'in:drafts';
    case 'SPAM': return 'in:spam';
    case 'TRASH': return 'in:trash';
    default: return 'in:inbox';
  }
}

type Extracted = { html?: string; text?: string; attachments: Attachment[] };

function extractFromPayload(payload: any): Extracted {
  const out: Extracted = { html: undefined, text: undefined, attachments: [] };
  if (!payload) return out;

  // Pièces jointes (métadonnées)
  const contentIdHeader = (headers?: any[]) =>
    headers?.find(h => h.name?.toLowerCase() === 'content-id')?.value;

  // Cas simple: corps directement sur ce niveau
  if (payload.body?.data && payload.mimeType && !payload.parts) {
    const decoded = b64urlDecode(payload.body.data);
    if (payload.mimeType.includes('text/html')) out.html = decoded;
    if (payload.mimeType.includes('text/plain')) out.text = decoded;
  }

  // Multipart: parcourir récursivement
  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      // Si c'est une pièce jointe (filename présent)
      if (part.filename) {
        const attachment: Attachment = {
          filename: part.filename,
          contentType: part.mimeType || 'application/octet-stream',
          size: part.body?.size || 0,
          contentId: contentIdHeader(part.headers || undefined)?.replace(/[<>]/g, ''),
        };
        out.attachments.push(attachment);
      }

      // Récursion pour sous-parties (alternative, mixed, related…)
      const sub = extractFromPayload(part);
      if (!out.html && sub.html) out.html = sub.html;
      if (!out.text && sub.text) out.text = sub.text;
      if (sub.attachments.length) out.attachments.push(...sub.attachments);
    }
  }

  // Fallback: parfois body.data existe sans mimeType clair
  if (!out.html && !out.text && payload.body?.data) {
    const decoded = b64urlDecode(payload.body.data);
    if (/<[a-z!][\s\S]*>/i.test(decoded)) out.html = decoded;
    else out.text = decoded;
  }

  return out;
}

/**
 * Récupère des emails Gmail et les mappe vers TON type Email.
 * - Remplit Email.body avec HTML si disponible, sinon texte.
 * - Mappe les pièces jointes vers Attachment (filename, contentType, size, contentId).
 */
export async function getGmailEmails(
  accessToken: string,
  limit = 20,
  folder = 'INBOX'
): Promise<Email[]> {
  if (!accessToken) throw new Error('Missing Google access token');

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // 1) Liste d’IDs
  const list = await gmail.users.messages.list({
    userId: 'me',
    maxResults: limit,
    q: folderToQuery(folder),
  });

  const messages = list.data.messages || [];
  if (!messages.length) return [];

  const emails: Email[] = [];

  // 2) Détails par message
  for (const msg of messages) {
    try {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      });

      const payload = detail.data.payload;
      const headers = payload?.headers || [];

      const subject = headerValue(headers, 'Subject') || 'Sans sujet';
      const fromRaw = headerValue(headers, 'From');
      const fromParsed = parseFrom(fromRaw);
      const internalDate = detail.data.internalDate
        ? Number(detail.data.internalDate)
        : Date.now();

      const content = extractFromPayload(payload);

      const body =
        (content.html && content.html) ||
        (content.text && content.text) ||
        ''; // toujours une string

      const atts = content.attachments || [];
      const unread = (detail.data.labelIds || []).includes('UNREAD');

      const email: Email = {
        id: detail.data.id || '',
        subject,
        from: fromParsed.text,
        fromName: fromParsed.name || fromParsed.text,
        date: new Date(internalDate).toISOString(),
        snippet: detail.data.snippet || '',
        unread,
        hasAttachments: atts.length > 0,
        body, // IMPORTANT: rempli pour ton UI
        attachments: atts,
        // optionnels selon ton type
        priority: 'normal',
        read: !unread,
      };

      emails.push(email);
    } catch {
      // Ignore les erreurs individuelles pour un message
    }
  }

  return emails;
}