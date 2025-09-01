import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { serialize } from 'cookie';
import type { NextRequest } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

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

export async function GET(req: NextRequest) {
  console.log("--- Début du callback Google ---");

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_BASE_URL } = process.env;

  // Étape 1: Vérifier les variables d'environnement
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !NEXT_PUBLIC_BASE_URL) {
    console.error("❌ ERREUR FATALE: Une ou plusieurs variables d'environnement Google sont manquantes.");
    return NextResponse.json({ error: "Erreur de configuration du serveur." }, { status: 500 });
  }
  console.log("✅ Étape 1: Variables d'environnement vérifiées.");

  // Étape 2: Récupérer le code d'autorisation
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    console.error("❌ ERREUR: Aucun 'code' trouvé dans les paramètres de l'URL.");
    return NextResponse.redirect(new URL('/?oauth=google_error&reason=no_code', req.url));
  }
  console.log("✅ Étape 2: Code d'autorisation reçu de Google.");

  try {
    // Étape 3: Initialiser le client OAuth2
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      `${NEXT_PUBLIC_BASE_URL}/api/google/callback`
    );
    console.log("✅ Étape 3: Client OAuth2 initialisé.");

    // Étape 4: Échanger le code contre des jetons
    console.log("⏳ Étape 4: Échange du code contre des jetons...");
    const { tokens } = await oauth2Client.getToken(code);
    console.log("✅ Étape 4: Jetons reçus !");

    if (!tokens.access_token) {
      console.error("❌ ERREUR: Pas de 'access_token' dans la réponse de Google.");
      throw new Error('access_token manquant');
    }

    // Étape 5: Récupérer les infos utilisateur et persister directement
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const me = await oauth2.userinfo.get();
    const email = me.data.email || '';
    const name = me.data.name || 'Gmail';

    if (!email) {
      throw new Error('Email utilisateur non trouvé');
    }

    // Calculer les non-lus Gmail
    let unreadCount = 0;
    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const label = await gmail.users.labels.get({ userId: 'me', id: 'INBOX' });
      unreadCount = (label.data.messagesUnread as number) || 0;
    } catch {
      // ignore
    }

    // Persister le compte directement
    const store = loadAccounts();
    const type = 'gmail';
    const existing = store.accounts.find((a) => a.email === email && a.provider?.id === type);
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
    } else {
      store.accounts.push(account);
    }
    // Forcer le compte Gmail en tant que compte actif pour éviter de rester sur l'IMAP
    store.activeAccount = accountId;
    saveAccounts(store);

    // Étape 6: Créer le cookie et rediriger
  const cookieValue = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });
  const useSecure = (process.env.NEXT_PUBLIC_BASE_URL || '').startsWith('https');
    console.log("✅ Étape 6: Cookie préparé et compte persisté.");

    const response = NextResponse.redirect(new URL('/?gmail_connected=success', req.url));
    // Définir les 2 cookies pour compatibilité en utilisant l'API cookies()
    response.cookies.set({
      name: 'google-tokens',
      value: cookieValue,
      httpOnly: true,
      secure: useSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set({
      name: 'pepite_google_tokens',
      value: cookieValue,
      httpOnly: true,
      secure: useSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    console.log("✅ Étape 7: Redirection vers l'accueil avec succès Gmail.");
    console.log("--- Fin du callback Google (Succès) ---");
    return response;

  } catch (error) {
    console.error("❌ ERREUR pendant le traitement du callback Google :", error);
    console.log("--- Fin du callback Google (Échec) ---");
    return NextResponse.redirect(new URL('/?oauth=google_error&reason=token_exchange_failed', req.url));
  }
}