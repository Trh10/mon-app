'use server';
import 'server-only';
import { google } from 'googleapis';
import type { Email, Attachment } from '@/lib/types';

// Gmail encode le corps en base64url
function b64urlDecode(data?: string): string {
  if (!data) return '';
  const norm = data.replace(/-/g, '+').replace(/_/g, '/');
  const pad = norm.length % 4 === 0 ? '' : '='.repeat(4 - (norm.length % 4));
  return Buffer.from(norm + pad, 'base64').toString('utf8');
}

function headerValue(headers: any[] | undefined, name: string): string {
  if (!headers) return '';
  return headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

function parseFrom(value: string): { text: string; name?: string } {
  const text = value || 'Expéditeur inconnu';
  const m = text.match(/^(.*?)\s*<.*?>$/);
  return { text, name: m?.[1]?.trim() || undefined };
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

  const contentIdHeader = (headers?: any[]) =>
    headers?.find(h => h.name?.toLowerCase() === 'content-id')?.value;

  // Partie simple
  if (payload.body?.data && payload.mimeType && !payload.parts) {
    const decoded = b64urlDecode(payload.body.data);
    if (payload.mimeType.includes('text/html')) out.html = decoded;
    if (payload.mimeType.includes('text/plain')) out.text = decoded;
  }

  // Multipart
  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.filename) {
        out.attachments.push({
          id: part.body?.attachmentId || `att-${Date.now()}-${Math.random()}`,
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          contentType: part.mimeType || 'application/octet-stream',
          size: part.body?.size || 0,
          contentId: contentIdHeader(part.headers)?.replace(/[<>]/g, ''),
        });
      }
      const sub = extractFromPayload(part);
      if (!out.html && sub.html) out.html = sub.html;
      if (!out.text && sub.text) out.text = sub.text;
      if (sub.attachments.length) out.attachments.push(...sub.attachments);
    }
  }

  // Fallback
  if (!out.html && !out.text && payload.body?.data) {
    const decoded = b64urlDecode(payload.body.data);
    if (/<[a-z!][\s\S]*>/i.test(decoded)) out.html = decoded;
    else out.text = decoded;
  }

  return out;
}

/**
 * Retourne des Email[] conformes à ton type:
 * - body: HTML si dispo, sinon texte (toujours string)
 * - attachments: filename/contentType/size/contentId
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

  // 2) Détails
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
      const body = (content.html && content.html)
        || (content.text && content.text)
        || '';

      const atts = content.attachments || [];
      const unread = (detail.data.labelIds || []).includes('UNREAD');

      emails.push({
        id: detail.data.id || '',
        subject,
        from: fromParsed.text,
        fromName: fromParsed.name || fromParsed.text,
        date: new Date(internalDate).toISOString(),
        snippet: detail.data.snippet || '',
        unread,
        hasAttachments: atts.length > 0,
        body,
        attachments: atts,
        priority: 'P3',
      });
    } catch {
      // ignore message individuel
    }
  }

  return emails;
}