import { NextRequest, NextResponse } from 'next/server';
import { listAccounts, setActiveAccount, upsertAccount } from '@/lib/emailAccountsDb';
import { getSession } from '@/lib/session';
import { ImapFlow } from 'imapflow';

function generateAccountId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function testEmailConnection(provider: any, credentials: any): Promise<{ success: boolean; unreadCount?: number; error?: string }> {
  if (!credentials?.email || !credentials?.password) {
    return { success: false, error: 'Email et mot de passe requis' };
  }
  const type = String(provider?.type || provider?.id || '').toLowerCase();
  // Basic format validations
  if (type === 'gmail' && !credentials.email.endsWith('@gmail.com')) {
    return { success: false, error: 'Adresse Gmail invalide' };
  }
  if (type === 'outlook' && !(credentials.email.includes('@outlook.') || credentials.email.includes('@hotmail.'))) {
    return { success: false, error: 'Adresse Outlook/Hotmail invalide' };
  }

  // If IMAP / manual provider use ImapFlow real connection.
  // For gmail oauth flow (handled elsewhere) we accept here and unreadCount=0.
  if (type === 'gmail' && credentials.oauth === 'google') {
    return { success: true, unreadCount: 0 };
  }

  // Determine probable IMAP host if not provided.
  let host = credentials.imapServer as string | undefined;
  let port = Number(credentials.imapPort) || 993;
  let secure = credentials.useSSL !== false; // default true
  if (!host) {
    const domain = credentials.email.split('@')[1];
    host = type === 'outlook' ? 'outlook.office365.com' : type === 'gmail' ? 'imap.gmail.com' : `imap.${domain}`;
  }

  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: { user: credentials.email, pass: credentials.password }
  });
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
  const unseen = await client.search({ seen: false });
  const unreadCount = Array.isArray(unseen) ? unseen.length : 0;
  return { success: true, unreadCount };
    } finally {
      lock.release();
    }
  } catch (e: any) {
    const msg = e?.message || 'Échec de connexion IMAP';
    return { success: false, error: msg };
  } finally {
    try { await client.logout(); } catch {}
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.organizationId || !session.userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const data = await listAccounts(session);
    return NextResponse.json({
      success: true,
      accounts: data.accounts.map(acc => ({
        id: acc.id,
        email: acc.email,
        provider: acc.provider,
        isConnected: acc.isConnected,
        lastSync: acc.lastSync,
        unreadCount: acc.unreadCount
      })),
      activeAccount: data.activeAccount
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erreur chargement comptes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.organizationId || !session.userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { provider, credentials } = await request.json();
    
    if (!provider || !credentials) {
      return NextResponse.json({
        success: false,
        error: 'Données manquantes'
      }, { status: 400 });
    }
    
  // Tester la connexion réelle (IMAP ou validation basique Gmail OAuth)
  const connectionTest = await testEmailConnection(provider, credentials);
    
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: connectionTest.error
      }, { status: 400 });
    }
    
    // Persist in DB (no duplicate check here; enforced by controller logic if needed)
    const created = await upsertAccount(session, {
      email: String(credentials.email),
      provider,
      providerId: String(provider?.type || provider?.id || 'imap'),
      providerName: String(provider?.name || provider?.type || 'Email'),
      credentials,
      isConnected: true,
      lastSync: new Date().toISOString(),
      unreadCount: connectionTest.unreadCount || 0,
      connectedAt: new Date().toISOString()
    });
    await setActiveAccount(session, created.id);
    
    return NextResponse.json({
      success: true,
      accountId: created.id,
      unreadCount: connectionTest.unreadCount || 0,
      message: 'Compte connecté avec succès'
    });
    
  } catch (error) {
    console.error('Erreur connexion compte:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.organizationId || !session.userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { accountId } = await request.json();
    if (!accountId) return NextResponse.json({ success: false, error: 'ID de compte requis' }, { status: 400 });
    const dbModule = await import('@/lib/emailAccountsDb');
    const ok = await dbModule.removeAccount(session, accountId);
    if (!ok) return NextResponse.json({ success: false, error: 'Compte non trouvé' }, { status: 404 });
    
    return NextResponse.json({
      success: true,
      message: 'Compte supprimé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur suppression compte:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur'
    }, { status: 500 });
  }
}
