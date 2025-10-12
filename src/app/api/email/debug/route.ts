export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { listAccounts } from '@/lib/emailAccountsDb';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
  const session = await getSession(new Request('http://local') as any);
  const store = session.organizationId && session.userId ? await listAccounts(session) : { accounts: [], activeAccount: null };
    const c = cookies();
  const raw = c.get('oauth_google_tokens')?.value || c.get('pepite_google_tokens')?.value;
    let tokenInfo: any = null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        tokenInfo = {
          hasAccessToken: !!parsed.access_token,
          hasRefreshToken: !!parsed.refresh_token,
          expiryDate: parsed.expiry_date || null,
          scopeFragment: parsed.scope ? String(parsed.scope).split(' ').slice(0,3) : []
        };
      } catch {
        tokenInfo = { parseError: true };
      }
    }
    return NextResponse.json({
      ok: true,
      activeAccount: store.activeAccount,
      accounts: (store.accounts as any[]).map((a: any) => ({
        id: a.id,
        email: a.email,
        provider: a.provider?.id || a.provider,
        oauth: a.credentials?.oauth,
        hasPassword: !!a.credentials?.password,
        hasImapServer: !!a.credentials?.imapServer
      })),
      googleToken: tokenInfo
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'debug_error' }, { status: 500 });
  }
}