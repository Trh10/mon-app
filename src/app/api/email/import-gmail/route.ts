import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/google-auth';
import { upsertAccount, setActiveAccount } from '@/lib/emailAccountsDb';
import { getSession } from '@/lib/session';
type AccountsData = { accounts: any[]; activeAccount: string | null };

export async function POST() {
  try {
    // Essayer de récupérer l'email Gmail depuis Google Auth
    let email = '';
    let name = 'Gmail';
    let unreadCount = 0;
    
    try {
      // Utiliser l'authentification Google existante
      const auth = getAuthenticatedClient();
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
      console.log('⚠️ Impossible de récupérer Gmail:', e.message);
      return NextResponse.json({ 
        success: false, 
        error: 'Aucun compte Gmail authentifié trouvé. Connectez-vous d\'abord avec Google.' 
      }, { status: 404 });
    }
    
    if (!email) {
      return NextResponse.json({ success: false, error: 'Aucun compte Gmail actif détecté' }, { status: 404 });
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

    return NextResponse.json({ success: true, accountId: created.id, email });
  } catch (e: any) {
    const msg = e?.message || 'Erreur lors de la récupération du compte Gmail';
    console.log('❌ Erreur import Gmail:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
