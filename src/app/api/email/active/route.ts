import { NextRequest, NextResponse } from 'next/server';
import { listAccounts } from '@/lib/emailAccountsDb';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { COOKIE_GOOGLE_PRIMARY, LEGACY_GOOGLE_COOKIES } from '@/config/branding';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    let orgId = session.organizationId;
    let usrId = session.userId;
    
    // Si la session n'a pas d'organizationId/userId, essayer de les récupérer depuis le cookie user-session
    if (!orgId || !usrId) {
      try {
        const userSessionCookie = request.cookies.get('user-session')?.value;
        if (userSessionCookie) {
          const userData = JSON.parse(userSessionCookie);
          const companyCode = userData.companyCode || userData.company || 'default';
          
          // Trouver l'organisation
          const org = await prisma.organization.findFirst({ where: { slug: companyCode.toLowerCase() } });
          if (org) {
            orgId = org.id;
            
            // Trouver l'utilisateur
            const externalId = userData.id;
            const user = await prisma.user.findFirst({ 
              where: { OR: [{ externalId }, { organizationId: orgId, name: userData.name }] }
            });
            if (user) {
              usrId = user.id;
            }
          }
        }
      } catch (e) {
        console.error('Erreur récupération session:', e);
      }
    }
    
    if (!orgId || !usrId) {
      // Même sans session complète, vérifier s'il y a un cookie Google
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
          const googleEmail = tokenData.email || 'Gmail connecté';
          return NextResponse.json({
            success: true,
            hasActiveAccount: true,
            activeAccount: {
              id: 'google-oauth-direct',
              email: googleEmail,
              provider: { id: 'gmail', name: 'Gmail' },
              providerId: 'gmail',
              providerName: 'Gmail',
              isConnected: true,
              credentials: { oauth: 'google' }
            },
            totalAccounts: 1,
            source: 'google_cookie_direct'
          });
        } catch (e) {
          console.error('Erreur parsing cookie Google:', e);
        }
      }
      
      return NextResponse.json({ success: false, error: 'Unauthorized', hasActiveAccount: false, activeAccount: null }, { status: 401 });
    }
    
    const sessionData = { organizationId: orgId, userId: usrId } as any;
    const data = await listAccounts(sessionData);
    let activeAccount = (data.accounts || []).find(acc => acc.id === data.activeAccount) || null;

    // Si pas de compte actif en BDD, vérifier le cookie Google
    if (!activeAccount) {
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
          const googleEmail = tokenData.email || 'Gmail connecté';
          activeAccount = {
            id: 'google-oauth-direct',
            email: googleEmail,
            provider: { id: 'gmail', name: 'Gmail' },
            providerId: 'gmail',
            providerName: 'Gmail',
            isConnected: true,
            credentials: { oauth: 'google' }
          };
        } catch (e) {
          console.error('Erreur parsing cookie Google:', e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      hasActiveAccount: !!activeAccount,
      activeAccount,
      totalAccounts: Math.max((data.accounts || []).length, activeAccount ? 1 : 0)
    });

  } catch (error: any) {
    console.error('Erreur API email/active:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Erreur lors de la récupération du compte actif',
      hasActiveAccount: false,
      activeAccount: null
    }, { status: 500 });
  }
}
