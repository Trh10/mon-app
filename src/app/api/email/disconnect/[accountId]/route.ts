import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { removeAccount, listAccounts, setActiveAccount } from '@/lib/emailAccountsDb';

export async function DELETE(request: NextRequest, { params }: { params: { accountId: string } }) {
  try {
    const session = await getSession(request);
    if (!session.organizationId || !session.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const accountId = params.accountId;
    const ok = await removeAccount(session, accountId);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Compte non trouvé' }, { status: 404 });
    }
    // Optionally set a new active if any remains
    const data = await listAccounts(session);
    if (data.accounts.length && !data.activeAccount) {
      await setActiveAccount(session, data.accounts[0].id);
    }
    return NextResponse.json({ success: true, message: 'Compte déconnecté avec succès' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur lors de la déconnexion' }, { status: 500 });
  }
}

