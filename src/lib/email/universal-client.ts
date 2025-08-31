'use server';
import 'server-only';
import { google } from 'googleapis';

export type GmailEmail = {
  id: string;
  subject: string;
  from: string;
  fromName?: string;
  date: string;        // ISO string
  snippet: string;
  unread: boolean;
  hasAttachments: boolean;
  folder: string;
};

function headerValue(headers: any[] | undefined, name: string): string {
  if (!headers) return '';
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

function parseFrom(value: string): { text: string; name?: string } {
  const text = value || 'Expéditeur inconnu';
  const name = text.split('<')[0]?.trim() || undefined;
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

export async function getGmailEmails(accessToken: string, limit = 20, folder = 'INBOX'): Promise<GmailEmail[]> {
  if (!accessToken) throw new Error('Missing Google access token');

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const list = await gmail.users.messages.list({
    userId: 'me',
    maxResults: limit,
    q: folderToQuery(folder),
  });

  const messages = list.data.messages || [];
  if (!messages.length) return [];

  const emails: GmailEmail[] = [];

  for (const msg of messages) {
    try {
      const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
      const payload = detail.data.payload;
      const headers = payload?.headers || [];
      const subject = headerValue(headers, 'Subject') || 'Sans sujet';
      const fromRaw = headerValue(headers, 'From');
      const fromParsed = parseFrom(fromRaw);
      const internalDate = detail.data.internalDate ? Number(detail.data.internalDate) : Date.now();

      emails.push({
        id: detail.data.id || '',
        subject,
        from: fromParsed.text,
        fromName: fromParsed.name,
        date: new Date(internalDate).toISOString(),
        snippet: detail.data.snippet || '',
        unread: (detail.data.labelIds || []).includes('UNREAD'),
        hasAttachments: (payload?.parts || []).some((p) => p.filename),
        folder,
      });
    } catch {
      // ignore ce message en cas d'erreur individuelle
    }
  }

  return emails;
}