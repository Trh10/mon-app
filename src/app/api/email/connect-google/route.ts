import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/google-auth';
import { upsertAccount, setActiveAccount } from '@/lib/emailAccountsDb';
import { getSession } from '@/lib/session';

export async function POST() {
  try {
    // Ensure we have a Google OAuth2 client from cookie tokens
    const auth = getAuthenticatedClient();
    const oauth2 = google.oauth2({ auth, version: 'v2' });
    const me = await oauth2.userinfo.get();
    const email = me.data.email || '';
    const name = me.data.name || 'Gmail';

    if (!email) {
      return NextResponse.json({ success: false, error: 'Utilisateur Google non authentifié' }, { status: 401 });
    }

    // Try to get unread count from Gmail labels (INBOX)
    let unreadCount = 0;
    try {
      const gmail = google.gmail({ version: 'v1', auth });
      const label = await gmail.users.labels.get({ userId: 'me', id: 'INBOX' });
      unreadCount = (label.data.messagesUnread as number) || 0;
    } catch {
      // ignore
    }

    const session = await getSession(new Request('http://local') as any);
    if (!session.organizationId || !session.userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const created = await upsertAccount(session, {
      email,
      provider: { id: 'gmail', name, type: 'gmail', icon: '📧', color: 'bg-red-500' },
      providerId: 'gmail',
      providerName: name,
      isConnected: true,
      unreadCount,
      connectedAt: new Date().toISOString(),
      credentials: { email, oauth: 'google' }
    });
    await setActiveAccount(session, created.id);

  return NextResponse.json({ success: true, accountId: created.id, unreadCount, email });
  } catch (e: any) {
    const msg = e?.message || 'Erreur lors de l\'enregistrement du compte Gmail';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
