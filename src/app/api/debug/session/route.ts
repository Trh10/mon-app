import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  
  // Lire tous les cookies pertinents
  const allCookies: Record<string, string | undefined> = {};
  for (const name of ['user-session', 'pepite_google_tokens', 'oauth_google_tokens', 'icones-session', 'organizationId']) {
    allCookies[name] = cookieStore.get(name)?.value ? 'EXISTS' : 'MISSING';
  }
  
  // Lire le user-session en détail
  let userSession = null;
  try {
    const raw = cookieStore.get('user-session')?.value;
    if (raw) userSession = JSON.parse(raw);
  } catch {}
  
  // Vérifier Prisma
  let prismaStatus = 'OK';
  let orgsCount = 0;
  let usersCount = 0;
  let emailAccountsCount = 0;
  try {
    orgsCount = await prisma.organization.count();
    usersCount = await prisma.user.count();
    emailAccountsCount = await prisma.emailAccount.count();
  } catch (e: any) {
    prismaStatus = 'ERROR: ' + e.message;
  }
  
  // Lire le token Google
  let googleToken = null;
  try {
    const raw = cookieStore.get('pepite_google_tokens')?.value;
    if (raw) {
      const parsed = JSON.parse(raw);
      googleToken = {
        hasAccessToken: !!parsed.access_token,
        hasRefreshToken: !!parsed.refresh_token,
        expiryDate: parsed.expiry_date
      };
    }
  } catch {}
  
  return NextResponse.json({
    cookies: allCookies,
    userSession: userSession ? {
      id: userSession.id,
      name: userSession.name,
      companyCode: userSession.companyCode,
      companyId: userSession.companyId,
      role: userSession.role
    } : null,
    googleToken,
    prisma: {
      status: prismaStatus,
      organizations: orgsCount,
      users: usersCount,
      emailAccounts: emailAccountsCount
    }
  });
}
