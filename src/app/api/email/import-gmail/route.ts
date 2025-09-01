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

export async function POST() {
  try {
    // Essayer de récupérer l'email Gmail depuis Google Auth
    let email = '';
    let name = 'Gmail';
    let unreadCount = 0;
    
    try {
      // Utiliser l'authentification Google existante
      const auth = getAuthenticatedClient();
      const gmail = google.gmail({ version: 'v1', auth });
      
      // Récupérer le profil utilisateur
      const profile = await gmail.users.getProfile({ userId: 'me' });
      email = profile.data.emailAddress || 'gmail-user@gmail.com';
      
      // Compter les emails non lus
      const list = await gmail.users.messages.list({ 
        userId: 'me', 
        maxResults: 100,
        q: 'is:unread'
      });
      unreadCount = list.data.messages?.length || 0;
      
      console.log(`✅ Gmail détecté: ${email} (${unreadCount} non lus)`);
    } catch (e: any) {
      console.log('⚠️ Impossible de récupérer Gmail:', e.message);
      return NextResponse.json({ 
        success: false, 
        error: 'Aucun compte Gmail authentifié trouvé. Connectez-vous d\'abord avec Google.' 
      }, { status: 404 });
    }
    
    if (!email) {
      return NextResponse.json({ success: false, error: 'Aucun compte Gmail actif détecté' }, { status: 404 });
    }
    
    const store = loadAccounts();
    const type = 'gmail';
    const existing = store.accounts.find((a) => a.provider?.id === type);
    const accountId = existing?.id || Math.random().toString(36).slice(2);
    const account = {
      id: accountId,
      email,
      provider: { id: type, name, type, icon: '📧', color: 'bg-red-500' },
      isConnected: true,
      unreadCount,
      connectedAt: new Date().toISOString(),
      credentials: { email, oauth: 'google' }
    };

    if (existing) {
      Object.assign(existing, account);
      console.log('✅ Compte Gmail existant mis à jour');
    } else {
      store.accounts.push(account);
      console.log('✅ Nouveau compte Gmail ajouté');
    }
    if (!store.activeAccount) store.activeAccount = accountId;
    saveAccounts(store);

    return NextResponse.json({ success: true, accountId, email });
  } catch (e: any) {
    const msg = e?.message || 'Erreur lors de la récupération du compte Gmail';
    console.log('❌ Erreur import Gmail:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
