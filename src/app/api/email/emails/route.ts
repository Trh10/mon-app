export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/google-auth';
import { listAccounts } from '@/lib/emailAccountsDb';
import { getSession } from '@/lib/session';
type AccountsData = { accounts: any[]; activeAccount: string | null };

function mapFolder(folder: string) {
  const f = folder.toUpperCase();
  if (f === 'INBOX') return 'INBOX';
  if (f === 'SENT') return '[Gmail]/Sent Mail';
  if (f === 'STARRED') return '[Gmail]/Starred';
  if (f === 'DRAFTS') return '[Gmail]/Drafts';
  return folder;
}

export async function GET(request: NextRequest) {
  try {
    const globalAny: any = global as any;
    if (!globalAny.__EMAIL_CACHE) globalAny.__EMAIL_CACHE = { store: new Map(), ts: Date.now() };
    const cache = globalAny.__EMAIL_CACHE as { store: Map<string, { at: number; data: any }>; };

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'INBOX';

    const session = await getSession(request);
    if (!session.organizationId || !session.userId) {
      return NextResponse.json({ success: true, emails: [], account: null, folder, total: 0, message: 'Non authentifié' });
    }
    const store = await listAccounts(session);
    const data: AccountsData = { accounts: store.accounts as any, activeAccount: store.activeAccount };

    if (!data.activeAccount) {
      return NextResponse.json({
        success: true,
        emails: [],
        account: null,
        folder,
        total: 0,
        message: 'Aucun compte connecté'
      });
    }

    const acc = data.accounts.find(a => a.id === data.activeAccount);
    if (!acc) {
      return NextResponse.json({
        success: true,
        emails: [],
        account: null,
        folder,
        total: 0,
        message: 'Compte actif introuvable'
      });
    }

    const cacheKey = `${acc.id}:${acc.provider?.id || acc.provider}:$${folder}`;
    const cached = cache.store.get(cacheKey);
    if (cached && Date.now() - cached.at < 120_000) {
      return NextResponse.json({ ...cached.data, cached: true });
    }

    // ---- Gmail via OAuth
    if ((acc.provider?.id === 'gmail' || acc.provider === 'gmail') && acc.credentials?.oauth === 'google') {
      try {
        const auth = getAuthenticatedClient();
        const gmail = google.gmail({ version: 'v1', auth });

        const mappedFolder = mapFolder(folder);
        let query = '';
        if (folder.toUpperCase() === 'SENT') query = 'in:sent';
        else if (folder.toUpperCase() === 'DRAFTS') query = 'in:draft';
        else if (folder.toUpperCase() === 'STARRED') query = 'is:starred';
        else if (folder.toUpperCase() !== 'INBOX') query = `label:${mappedFolder}`;

        const list = await gmail.users.messages.list({ userId: 'me', maxResults: 100, q: query || undefined });
        const ids = list.data.messages || [];
        const emails = await Promise.all(ids.slice(0, 100).map(async (m) => {
          try {
            const msg = await gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'metadata', metadataHeaders: ['From','Subject','Date'] });
            const headers = (msg.data.payload?.headers || []) as any[];
            const get = (k: string) => headers.find(h => h.name?.toLowerCase() === k.toLowerCase())?.value || '';
            const subject = get('Subject') || '(sans objet)';
            const from = get('From');
            const date = get('Date');
            const labelIds = msg.data.labelIds || [];
            const unread = labelIds.includes('UNREAD');
            const hasAttachments = (msg.data.payload?.parts || []).some(p => p?.filename);
            return {
              id: m.id!,
              subject,
              from,
              fromName: from,
              date: date ? new Date(date).toISOString() : new Date().toISOString(),
              snippet: msg.data.snippet || '',
              unread,
              hasAttachments
            };
          } catch {
            return null;
          }
        }));
        const validEmails = emails.filter(Boolean) as any[];
        const payload = { success: true, emails: validEmails, account: { email: acc.email, provider: acc.provider?.name || 'Gmail', unreadCount: validEmails.filter(e => e.unread).length }, folder, total: validEmails.length };
        cache.store.set(cacheKey, { at: Date.now(), data: payload });
        return NextResponse.json(payload);
      } catch (e: any) {
        return NextResponse.json({ success: false, error: e?.message || 'Erreur Gmail API' }, { status: 500 });
      }
    }

    // ---- IMAP
    if (acc.credentials && acc.credentials.imapServer) {
      let client: ImapFlow | null = null;
      try {
        client = new ImapFlow({
          host: acc.credentials.imapServer,
          port: acc.credentials.imapPort,
          secure: acc.credentials.useSSL,
          auth: { user: acc.credentials.email, pass: acc.credentials.password },
        });
        await client.connect();

        const mailboxes = await client.list();
        const mailboxPaths = mailboxes.map(m => m.path);
        const targetFolder = mailboxPaths.includes(folder) ? folder : 'INBOX';
        const mailbox: any = await client.mailboxOpen(targetFolder, { readOnly: true });
        const total = (mailbox && mailbox.exists) || 0;

        const maxToFetch = 30;
        // Prefer a UID window using uidNext for stability across servers
        const uidNext: number = (mailbox && (mailbox as any).uidNext) || 0;
        const toUid = uidNext > 0 ? uidNext - 1 : total; // if uidNext unknown, fall back to total
        const fromUid = Math.max(1, toUid - maxToFetch + 1);
        const useUid = true;
        const range = toUid >= fromUid ? `${fromUid}:${toUid}` : '1:*';

        const emails: any[] = [];
        for await (const msg of client.fetch(range, { envelope: true, flags: true, uid: useUid })) {
          const env: any = msg.envelope || {};
          const fromPart = (env.from && env.from[0]) || null;
          const fromRaw = fromPart ? (fromPart.name || fromPart.address) : 'Inconnu';
          const dateIso = env.date ? new Date(env.date).toISOString() : new Date().toISOString();
          const rawFlags: any = msg.flags as any;
          const flagsArr: string[] = Array.isArray(rawFlags) ? rawFlags : Array.from(rawFlags instanceof Set ? rawFlags : []);
          const unread = !flagsArr.includes('\\Seen');
          emails.push({ id: String(msg.uid), subject: env.subject || '(sans objet)', from: fromRaw, fromName: fromRaw, date: dateIso, snippet: '', unread, hasAttachments: false });
        }

        // Fallback: if no emails via UID window, try a sequence window
        let fallback = false;
        if (emails.length === 0) {
          const seqStart = Math.max(1, total - maxToFetch + 1);
          const seqRange = `${seqStart}:*`;
          for await (const msg of client.fetch(seqRange, { envelope: true, flags: true })) {
            const env: any = msg.envelope || {};
            const fromPart = (env.from && env.from[0]) || null;
            const fromRaw = fromPart ? (fromPart.name || fromPart.address) : 'Inconnu';
            const dateIso = env.date ? new Date(env.date).toISOString() : new Date().toISOString();
            const rawFlags: any = msg.flags as any;
            const flagsArr: string[] = Array.isArray(rawFlags) ? rawFlags : Array.from(rawFlags instanceof Set ? rawFlags : []);
            const unread = !flagsArr.includes('\\Seen');
            emails.push({ id: String(msg.uid), subject: env.subject || '(sans objet)', from: fromRaw, fromName: fromRaw, date: dateIso, snippet: '', unread, hasAttachments: false });
          }
          fallback = true;
        }

        const ordered = emails.sort((a, b) => b.date.localeCompare(a.date));
  const payload = { success: true, message: 'IMAP messages fetched', mailboxes: mailboxPaths, emails: ordered, account: { email: acc.email, provider: acc.provider?.name || 'IMAP' }, folder: targetFolder, total: ordered.length, step: 'messages', debug: { exists: total, uidNext, range, byUid: useUid, fallback } };
        cache.store.set(cacheKey, { at: Date.now(), data: payload });
        return NextResponse.json(payload);
      } catch (err: any) {
        return NextResponse.json({ success: false, error: `Erreur IMAP: ${err.message || 'Unknown error'}` }, { status: 500 });
      } finally {
        try { if (client && (client as any).usable) await client.logout(); } catch {}
      }
    }

    // Aucun IMAP valide
    return NextResponse.json({
      success: true,
      emails: [],
      account: { email: acc.email, provider: acc.provider?.name || acc.provider || 'unknown' },
      folder,
      total: 0,
      message: 'Aucune configuration IMAP valide'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Erreur serveur' }, { status: 500 });
  }
}
