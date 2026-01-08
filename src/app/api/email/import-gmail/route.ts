import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/google-auth';
import { upsertAccount, setActiveAccount } from '@/lib/emailAccountsDb';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { COOKIE_GOOGLE_PRIMARY, LEGACY_GOOGLE_COOKIES } from '@/config/branding';
type AccountsData = { accounts: any[]; activeAccount: string | null };

export async function POST(request: NextRequest) {
  try {
    // Essayer de récupérer l'email Gmail depuis Google Auth
    let email = '';
    let name = 'Gmail';
    let unreadCount = 0;
    let auth: any = null;
    
    try {
      // Utiliser l'authentification Google existante
      auth = getAuthenticatedClient();
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
      console.log('⚠️ Impossible de récupérer Gmail via getAuthenticatedClient:', e.message);
      
      // Fallback: essayer de lire directement le cookie Google
      let googleCookie = request.cookies.get(COOKIE_GOOGLE_PRIMARY)?.value;
      if (!googleCookie) {
        for (const legacy of LEGACY_GOOGLE_COOKIES) {
          googleCookie = request.cookies.get(legacy)?.value;
          if (googleCookie) break;
        }
      }
      
      if (googleCookie) {
        try {
          const tokenData = JSON.parse(googleCookie);
          auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
          );
          auth.setCredentials(tokenData);
          const gmail = google.gmail({ version: 'v1', auth });
          const profile = await gmail.users.getProfile({ userId: 'me' });
          email = profile.data.emailAddress || tokenData.email || 'gmail-user@gmail.com';
          const list = await gmail.users.messages.list({ userId: 'me', maxResults: 100, q: 'is:unread' });
          unreadCount = list.data.messages?.length || 0;
          console.log(`✅ Gmail détecté via cookie direct: ${email}`);
        } catch (cookieErr: any) {
          console.log('⚠️ Cookie Google invalide:', cookieErr.message);
          return NextResponse.json({ 
            success: false, 
            error: 'Aucun compte Gmail authentifié trouvé. Connectez-vous d\'abord avec Google.' 
          }, { status: 404 });
        }
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Aucun compte Gmail authentifié trouvé. Connectez-vous d\'abord avec Google.' 
        }, { status: 404 });
      }
    }
    
    if (!email) {
      return NextResponse.json({ success: false, error: 'Aucun compte Gmail actif détecté' }, { status: 404 });
    }
    
    // Récupérer la session depuis les cookies
    const session = await getSession(request);
    let orgId = session.organizationId;
    let usrId = session.userId;
    
    // Fallback: récupérer depuis user-session cookie
    if (!orgId || !usrId) {
      try {
        const userSessionCookie = request.cookies.get('user-session')?.value;
        if (userSessionCookie) {
          const userData = JSON.parse(userSessionCookie);
          const companyCode = userData.companyCode || userData.company || 'default';
          const org = await prisma.organization.findFirst({ where: { slug: companyCode.toLowerCase() } });
          if (org) {
            orgId = org.id;
            const externalId = userData.id;
            const user = await prisma.user.findFirst({ 
              where: { OR: [{ externalId }, { organizationId: orgId, name: userData.name }] }
            });
            if (user) usrId = user.id;
          }
        }
      } catch (e) {
        console.error('Erreur récupération session:', e);
      }
    }
    
    if (!orgId || !usrId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

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

    return NextResponse.json({ success: true, accountId: created.id, email });
  } catch (e: any) {
    const msg = e?.message || 'Erreur lors de la récupération du compte Gmail';
    console.log('❌ Erreur import Gmail:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
