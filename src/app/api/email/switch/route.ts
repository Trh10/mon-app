import { NextRequest, NextResponse } from 'next/server';
import { setActiveAccount, listAccounts } from '@/lib/emailAccountsDb';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.organizationId || !session.userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { accountId } = await request.json();
    const changed = await setActiveAccount(session, accountId);
    if (!changed) return NextResponse.json({ success: false, error: 'Compte non trouvé' }, { status: 404 });
    const data = await listAccounts(session);
    const account = (data.accounts || []).find(a => a.id === accountId);
    
    return NextResponse.json({
      success: true,
      activeAccount: accountId,
      message: `Basculé vers ${account?.email || accountId}`
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erreur lors du changement de compte'
    }, { status: 500 });
  }
}
