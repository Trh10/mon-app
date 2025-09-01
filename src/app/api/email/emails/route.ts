import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ImapFlow } from 'imapflow';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/google-auth';

const ACCOUNTS_FILE = join(process.cwd(), 'data', 'email-accounts.json');

type AccountsData = { accounts: any[]; activeAccount: string | null };

function loadAccounts(): AccountsData {
  try {
    if (!existsSync(ACCOUNTS_FILE)) return { accounts: [], activeAccount: null };
    const data = readFileSync(ACCOUNTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { accounts: [], activeAccount: null };
  }
}

function mapFolder(folder: string) {
  // Basic mapping for common folders
  const f = folder.toUpperCase();
  if (f === 'INBOX') return 'INBOX';
  if (f === 'SENT') return '[Gmail]/Sent Mail';
  if (f === 'STARRED') return '[Gmail]/Starred';
  if (f === 'DRAFTS') return '[Gmail]/Drafts';
  return folder;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API email/emails: Starting request - v2');
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'INBOX';

    const data = loadAccounts();
    console.log('📊 Loaded accounts data:', { 
      hasAccounts: data.accounts.length > 0, 
      activeAccount: data.activeAccount 
    });
    
    if (!data.activeAccount) return NextResponse.json({ success: false, error: 'Aucun compte actif' }, { status: 404 });
    const acc = data.accounts.find(a => a.id === data.activeAccount);
    if (!acc) return NextResponse.json({ success: false, error: 'Compte actif non trouvé' }, { status: 404 });

    console.log('🔑 Active account found:', { 
      id: acc.id, 
      email: acc.email, 
      provider: acc.provider?.id,
      hasCredentials: !!acc.credentials,
      oauth: acc.credentials?.oauth 
    });

    // Gmail API temporairement réactivé pour test
    if ((acc.provider?.id === 'gmail' || acc.provider === 'gmail') && acc.credentials?.oauth === 'google') {
      console.log('✅ Gmail OAuth detected, attempting Gmail API...');
      try {
        console.log('🚀 Using Gmail API...');
        const auth = getAuthenticatedClient();
        const gmail = google.gmail({ version: 'v1', auth });
        // List latest messages
        const list = await gmail.users.messages.list({ userId: 'me', maxResults: 100, q: folder && folder !== 'INBOX' ? `label:${folder}` : undefined });
        const ids = list.data.messages || [];
        const emails = await Promise.all(ids.slice(0, 100).map(async (m) => {
          try {
            const msg = await gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'metadata', metadataHeaders: ['From','Subject','Date'] });
            const headers = msg.data.payload?.headers || [] as any[];
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
          } catch (e) {
            console.log('Erreur email Gmail:', e);
            return null;
          }
        }));
        const validEmails = emails.filter(e => e !== null);
        return NextResponse.json({ success: true, emails: validEmails, account: { email: acc.email, provider: acc.provider?.name || 'Gmail', unreadCount: validEmails.filter(e => e.unread).length }, folder, total: validEmails.length });
      } catch (e: any) {
        console.error('❌ Gmail API Error:', e);
        const msg = e?.message || 'Erreur Gmail API';
        const status = msg.includes('Utilisateur non authentifié') ? 401 : 500;
        return NextResponse.json({ success: false, error: msg }, { status });
      }
    }

    console.log('📧 Using IMAP fallback...');
    // Else IMAP - retour temporaire aux emails de test
    const testEmails = [
      {
        id: '1',
        subject: 'Bienvenue dans ICONES BOX!',
        from: 'system@iconesbox.com',
        fromName: 'Système ICONES BOX',
        date: new Date().toISOString(),
        snippet: 'Votre système de collaboration et email est maintenant opérationnel.',
        unread: true,
        hasAttachments: false
      },
      {
        id: '2', 
        subject: 'Collaboration intégrée ✨',
        from: 'collab@iconesbox.com',
        fromName: 'Équipe Collaboration',
        date: new Date(Date.now() - 3600000).toISOString(),
        snippet: 'Toutes les fonctionnalités de collaboration sont maintenant disponibles.',
        unread: false,
        hasAttachments: true
      },
      {
        id: '3',
        subject: 'Nouvelle réquisition approuvée',
        from: 'workflow@iconesbox.com',
        fromName: 'Système Workflow',
        date: new Date(Date.now() - 7200000).toISOString(),
        snippet: 'Votre réquisition "ordi" a été approuvée définitivement.',
        unread: true,
        hasAttachments: false
      }
    ];

    console.log('📨 Returning test emails:', testEmails.length, 'emails');

    return NextResponse.json({
      success: true,
      emails: testEmails,
      account: { 
        email: acc.email, 
        provider: acc.provider?.name || 'Gmail', 
        unreadCount: testEmails.filter(e => e.unread).length 
      },
      folder,
      total: testEmails.length
    });
  } catch (error: any) {
    console.error('💥 Global error in email/emails:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Erreur serveur' }, { status: 500 });
  }
}
