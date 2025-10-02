import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { listAccounts } from '@/lib/emailAccountsDb';
import { getSession } from '@/lib/session';

export async function GET() {
  const cookieStore = cookies();
  const token1 = cookieStore.get('oauth_google_tokens');
  const token2 = cookieStore.get('pepite_google_tokens');

  let accounts: any[] = [];
  let activeAccount: string | null = null;
  try {
    const session = await getSession(new Request('http://local') as any);
    if (session.organizationId && session.userId) {
      const store = await listAccounts(session);
      accounts = store.accounts || [];
      activeAccount = store.activeAccount || null;
    }
  } catch {}

  return NextResponse.json({
    hasGoogleCookie: !!token1 || !!token2,
    cookieNames: [token1?.name, token2?.name].filter(Boolean),
    activeAccount,
    accountsCount: accounts.length,
    activeProvider: (accounts.find((a) => a.id === activeAccount) as any)?.provider?.id || null,
  });
}
