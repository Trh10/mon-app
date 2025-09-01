import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/google-auth';

const ACCOUNTS_FILE = join(process.cwd(), 'data', 'email-accounts.json');

type AccountsData = {
  accounts: any[];
  activeAccount: string | null;
};

function loadAccounts(): AccountsData {
  try {
    if (!existsSync(ACCOUNTS_FILE)) return { accounts: [], activeAccount: null };
    const raw = readFileSync(ACCOUNTS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { accounts: [], activeAccount: null };
  }
}

function saveAccounts(data: AccountsData) {
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2));
}

function getProviderIcon() {
  return '📧';
}
function getProviderColor() {
  return 'bg-red-500';
}

export async function POST() {
  try {
    // Ensure we have a Google OAuth2 client from cookie tokens
    const auth = getAuthenticatedClient();
    const oauth2 = google.oauth2({ auth, version: 'v2' });
    const me = await oauth2.userinfo.get();
    const email = me.data.email || '';
    const name = me.data.name || 'Gmail';

    if (!email) {
      return NextResponse.json({ success: false, error: 'Utilisateur Google non authentifié' }, { status: 401 });
    }

    // Try to get unread count from Gmail labels (INBOX)
    let unreadCount = 0;
    try {
      const gmail = google.gmail({ version: 'v1', auth });
      const label = await gmail.users.labels.get({ userId: 'me', id: 'INBOX' });
      unreadCount = (label.data.messagesUnread as number) || 0;
    } catch {
      // ignore
    }

    const store = loadAccounts();
    const type = 'gmail';
    const existing = store.accounts.find((a) => a.email === email && a.provider?.id === type);
    const accountId = existing?.id || Math.random().toString(36).slice(2);
    const account = {
      id: accountId,
      email,
      provider: { id: type, name, type, icon: getProviderIcon(), color: getProviderColor() },
      isConnected: true,
      unreadCount,
      connectedAt: new Date().toISOString(),
      credentials: { email, oauth: 'google' }
    };

    if (existing) {
      Object.assign(existing, account);
    } else {
      store.accounts.push(account);
    }
    if (!store.activeAccount) store.activeAccount = accountId;
    saveAccounts(store);

  return NextResponse.json({ success: true, accountId, unreadCount, email });
  } catch (e: any) {
    const msg = e?.message || 'Erreur lors de l\'enregistrement du compte Gmail';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
