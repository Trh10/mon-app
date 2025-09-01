import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { cookies } from 'next/headers';

const ACCOUNTS_FILE = join(process.cwd(), 'data', 'email-accounts.json');

export async function GET() {
  const cookieStore = cookies();
  const token1 = cookieStore.get('google-tokens');
  const token2 = cookieStore.get('pepite_google_tokens');

  let accounts: any[] = [];
  let activeAccount: string | null = null;
  if (existsSync(ACCOUNTS_FILE)) {
    try {
      const raw = readFileSync(ACCOUNTS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      accounts = parsed.accounts || [];
      activeAccount = parsed.activeAccount || null;
    } catch {}
  }

  return NextResponse.json({
    hasGoogleCookie: !!token1 || !!token2,
    cookieNames: [token1?.name, token2?.name].filter(Boolean),
    activeAccount,
    accountsCount: accounts.length,
    activeProvider: accounts.find((a) => a.id === activeAccount)?.provider?.id || null,
  });
}
