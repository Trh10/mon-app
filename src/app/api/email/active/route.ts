import { NextRequest, NextResponse } from 'next/server';
import { listAccounts } from '@/lib/emailAccountsDb';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.organizationId || !session.userId) return NextResponse.json({ success: false, error: 'Unauthorized', hasActiveAccount: false, activeAccount: null }, { status: 401 });
    const data = await listAccounts(session);
    const activeAccount = (data.accounts || []).find(acc => acc.id === data.activeAccount) || null;

    return NextResponse.json({
      success: true,
      hasActiveAccount: !!activeAccount,
      activeAccount,
      totalAccounts: (data.accounts || []).length
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération du compte actif',
      hasActiveAccount: false,
      activeAccount: null
    }, { status: 500 });
  }
}
