import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { upsertAccount, setActiveAccount } from '@/lib/emailAccountsDb';
import { getSession } from '@/lib/session';
import { getOAuthClient } from '@/lib/google';
import { COOKIE_GOOGLE_PRIMARY, LEGACY_GOOGLE_COOKIES } from '@/config/branding';

export async function GET(req: NextRequest) {
  console.log("--- Début du callback Google ---");
  // Les variables d'env sont vérifiées dans getOAuthClient(); ici on garde une trace
  console.log("✅ Étape 1: Préparation client OAuth");

  // Étape 2: Récupérer le code d'autorisation
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    console.error("❌ ERREUR: Aucun 'code' trouvé dans les paramètres de l'URL.");
    return NextResponse.redirect(new URL('/?oauth=google_error&reason=no_code', req.url));
  }
  console.log("✅ Étape 2: Code d'autorisation reçu de Google.");

  try {
    // Étape 3: Initialiser le client OAuth2 (utilise redirectUri cohérente)
    const oauth2Client = getOAuthClient();
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

    // Persister le compte dans la base (org/user scope via session)
    const session = await getSession(req);
    if (session.organizationId && session.userId) {
      const created = await upsertAccount(session, {
        email,
        provider: { id: 'gmail', name, type: 'gmail', icon: '📧', color: 'bg-red-500' },
        providerId: 'gmail',
        providerName: name,
        isConnected: true,
        unreadCount,
        connectedAt: new Date().toISOString(),
        credentials: { email, oauth: 'google' }
      });
      await setActiveAccount(session, created.id);
    }

    // Étape 6: Créer le cookie et rediriger
    const cookieValue = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });
    // Déterminer le flag secure à partir de BASE_URL si présent, sinon selon l'URL de la requête
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const useSecure = baseUrl.startsWith('https') || req.url.startsWith('https');
    console.log("✅ Étape 6: Cookie préparé et compte persisté.");

    const response = NextResponse.redirect(new URL('/?gmail_connected=success', req.url));
    // Définir cookies: primaire + un legacy pour compat
    response.cookies.set({
      name: COOKIE_GOOGLE_PRIMARY, // 'oauth_google_tokens'
      value: cookieValue,
      httpOnly: true,
      secure: useSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    // Écrire aussi un cookie legacy attendu par certains anciens chemins
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

  } catch (error: any) {
    const errInfo: any = {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.split('\n').slice(0,4).join(' | ')
    };
    // Certaines libs renvoient error.response.data
    if (error?.response?.data) {
      try {
        errInfo.responseData = typeof error.response.data === 'string'
          ? error.response.data.slice(0,300)
          : JSON.stringify(error.response.data).slice(0,300);
      } catch {}
    }
    console.error("❌ ERREUR pendant le traitement du callback Google :", errInfo);
    console.log("--- Fin du callback Google (Échec) ---");
    return NextResponse.redirect(new URL('/?oauth=google_error&reason=token_exchange_failed', req.url));
  }
}