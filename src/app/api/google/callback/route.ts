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
    
    // Si la session n'a pas d'organizationId/userId, essayer de les récupérer depuis le cookie user-session
    let orgId = session.organizationId;
    let usrId = session.userId;
    
    if (!orgId || !usrId) {
      try {
        const userSessionCookie = req.cookies.get('user-session')?.value;
        if (userSessionCookie) {
          const userData = JSON.parse(userSessionCookie);
          const companyCode = userData.companyCode || userData.company || 'default';
          
          // Créer ou trouver l'organisation
          const { prisma } = await import('@/lib/db');
          let org = await prisma.organization.findFirst({ where: { slug: companyCode.toLowerCase() } });
          if (!org) {
            org = await prisma.organization.create({
              data: { slug: companyCode.toLowerCase(), name: companyCode }
            });
          }
          orgId = org.id;
          
          // Créer ou trouver l'utilisateur
          const externalId = userData.id;
          let user = await prisma.user.findFirst({ 
            where: { OR: [{ externalId }, { organizationId: orgId, name: userData.name }] }
          });
          if (!user) {
            user = await prisma.user.create({
              data: {
                organizationId: orgId,
                externalId,
                name: userData.name,
                displayName: userData.name,
                role: userData.level >= 10 ? 'admin' : 'user'
              }
            });
          }
          usrId = user.id;
          console.log(`✅ Session récupérée depuis cookie: orgId=${orgId}, userId=${usrId}`);
        }
      } catch (e) {
        console.error('Erreur récupération session depuis cookie:', e);
      }
    }
    
    if (orgId && usrId) {
      const sessionData = { organizationId: orgId, userId: usrId } as any;
      const created = await upsertAccount(sessionData, {
        email,
        provider: { id: 'gmail', name, type: 'gmail', icon: '📧', color: 'bg-red-500' },
        providerId: 'gmail',
        providerName: name,
        isConnected: true,
        unreadCount,
        connectedAt: new Date().toISOString(),
        credentials: { email, oauth: 'google' }
      });
      await setActiveAccount(sessionData, created.id);
      console.log(`✅ Compte Gmail ${email} enregistré avec succès`);
    } else {
      console.warn('⚠️ Session incomplète, compte Gmail non persisté en BDD mais cookie créé');
    }

    // Étape 6: Créer le cookie et rediriger
    const cookieValue = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      email: email, // Ajouter l'email pour référence
    });
    // En localhost, toujours secure=false
    const isLocalhost = req.url.includes('localhost') || req.url.includes('127.0.0.1');
    const useSecure = !isLocalhost && (process.env.NODE_ENV === 'production');
    console.log(`✅ Étape 6: Cookie préparé. isLocalhost=${isLocalhost}, secure=${useSecure}`);

    const response = NextResponse.redirect(new URL('/?gmail_connected=success', req.url));
    
    // Définir les deux cookies pour compatibilité
    const cookieOptions = {
      httpOnly: true,
      secure: useSecure,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 jours
    };
    
    response.cookies.set({ name: COOKIE_GOOGLE_PRIMARY, value: cookieValue, ...cookieOptions });
    response.cookies.set({ name: 'pepite_google_tokens', value: cookieValue, ...cookieOptions });
    
    console.log("✅ Étape 7: Cookies créés:", COOKIE_GOOGLE_PRIMARY, "et pepite_google_tokens");
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