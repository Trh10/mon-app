import { NextRequest, NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { upsertAccount, setActiveAccount } from '@/lib/emailAccountsDb';
import { getSession } from '@/lib/session';

type AccountsData = { accounts: any[]; activeAccount: string | null };

function getProviderIcon(providerType: string): string {
  const icons: Record<string, string> = {
    gmail: '📧',
    outlook: '📘',
    yahoo: '🟣',
    imap: '⚙️',
    exchange: '🏢'
  };
  return icons[providerType] || '📧';
}

function getProviderColor(providerType: string): string {
  const colors: Record<string, string> = {
    gmail: 'bg-red-500',
    outlook: 'bg-blue-500',
    yahoo: 'bg-purple-500',
    imap: 'bg-gray-500',
    exchange: 'bg-green-500'
  };
  return colors[providerType] || 'bg-gray-500';
}

type ImapConnectInput = { email: string; password: string; imapHost: string; imapPort?: number; secure?: boolean };

async function connectViaIMAP({ email, password, imapHost, imapPort = 993, secure = true }: ImapConnectInput) {
  const client = new ImapFlow({ host: imapHost, port: imapPort, secure, auth: { user: email, pass: password } });
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const unseen = await client.search({ seen: false });
      const unreadCount = Array.isArray(unseen) ? unseen.length : 0;
      return { success: true as const, unreadCount };
    } finally {
      lock.release();
    }
  } catch (err: any) {
    return { success: false as const, error: err?.message || 'Échec de connexion IMAP' };
  } finally {
    try { await client.logout(); } catch {}
  }
}

async function tryMultipleImapServers(email: string, password: string, domain: string) {
  // Liste des serveurs à essayer pour différents domaines
  const serverPatterns = [
    // Patterns spécifiques
    ...(domain.includes('infomaniak') || domain === 'allinonerdc.com' ? [
      'mail.infomaniak.com',
      'imap.infomaniak.com'
    ] : []),
    ...(domain.includes('allinonerdc') ? [
      'mail.allinonerdc.com',
      'imap.allinonerdc.com',
      'mail.infomaniak.com',
      'imap.infomaniak.com'
    ] : []),
    // Patterns génériques
    `mail.${domain}`,
    `imap.${domain}`,
    `smtp.${domain}`,
    domain
  ];

  for (const host of serverPatterns) {
    console.log(`🔄 Essai IMAP: ${host}:993 (SSL)`);
    const result = await connectViaIMAP({ email, password, imapHost: host, imapPort: 993, secure: true });
    if (result.success) {
      console.log(`✅ Connexion réussie avec ${host}`);
      return { success: true, unreadCount: result.unreadCount, finalHost: host, finalPort: 993, finalSecure: true };
    }
    
    // Essayer aussi sans SSL sur port 143
    console.log(`🔄 Essai IMAP: ${host}:143 (no SSL)`);
    const resultNoSSL = await connectViaIMAP({ email, password, imapHost: host, imapPort: 143, secure: false });
    if (resultNoSSL.success) {
      console.log(`✅ Connexion réussie avec ${host}:143 (no SSL)`);
      return { success: true, unreadCount: resultNoSSL.unreadCount, finalHost: host, finalPort: 143, finalSecure: false };
    }
  }

  return { success: false, error: `Aucun serveur IMAP trouvé pour ${domain}. Serveurs testés: ${serverPatterns.join(', ')}` };
}

function formatImapError(err: any, providerType: string) {
  const msg = String(err?.message || 'Échec de connexion IMAP');
  if (/ENOTFOUND|getaddrinfo/i.test(msg)) return 'Nom d\'hôte IMAP introuvable. Vérifiez le serveur (ex: imap.domaine.com).';
  if (/ETIMEDOUT|Timeout/i.test(msg)) return 'Délai dépassé lors de la connexion IMAP. Vérifiez le port/SSL et la connectivité.';
  if (/AUTH|Invalid credentials|AUTHENTICATIONFAILED/i.test(msg)) {
    if (providerType === 'gmail') return 'Authentification échouée. Pour Gmail, activez IMAP et utilisez un mot de passe d\'application (2FA).';
    return 'Authentification échouée. Vérifiez email/mot de passe (ou utilisez un mot de passe d\'application si requis).';
  }
  if (/handshake|certificate|self signed/i.test(msg)) return 'Erreur TLS/SSL lors du handshake. Essayez un autre port (993 SSL ou 143 STARTTLS).';
  if (/Command failed/i.test(msg)) {
    if (providerType === 'gmail') return 'Commande IMAP refusée par Gmail. Souvent lié à l\'authentification (mot de passe d\'application requis).';
    return 'Commande IMAP refusée par le serveur. Vérifiez les identifiants et les paramètres.';
  }
  return msg;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.organizationId || !session.userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { provider, credentials } = await request.json();
    const type = String(provider?.type || '').toLowerCase();
    const email = String(credentials?.email || '');
    const password = String(credentials?.password || '');
    if (!email || !password) return NextResponse.json({ success: false, error: 'Email et mot de passe requis' }, { status: 400 });

    // Map provider -> IMAP host avec auto-détection
    let imapHost = '';
    let displayName = provider?.name || provider?.type || 'Email';
    
    if (type === 'gmail') { 
      imapHost = 'imap.gmail.com'; 
      displayName = 'Gmail'; 
    }
    else if (type === 'outlook') { 
      imapHost = 'outlook.office365.com'; 
      displayName = 'Outlook'; 
    }
    else if (type === 'yahoo') { 
      imapHost = 'imap.mail.yahoo.com'; 
      displayName = 'Yahoo'; 
    }
    else if (type === 'imap') { 
      // Auto-détection avec essais multiples
      const domain = email.split('@')[1];
      if (!domain) return NextResponse.json({ success: false, error: 'Domaine email invalide' }, { status: 400 });
      
      console.log(`🔍 Auto-détection IMAP pour domaine: ${domain}`);
      const multiResult = await tryMultipleImapServers(email, password, domain);
      if (!multiResult.success) {
        return NextResponse.json({ success: false, error: multiResult.error }, { status: 401 });
      }
      
      // Utiliser les paramètres qui ont fonctionné et persister directement
      const finalHost = multiResult.finalHost!;
      const finalPort = multiResult.finalPort!;
      const finalSecure = multiResult.finalSecure!;
      displayName = `${domain} (${finalHost})`;
      
      const created = await upsertAccount(session, {
        email,
        provider: { id: type, name: displayName, type, icon: getProviderIcon(type), color: getProviderColor(type) },
        providerId: type,
        providerName: displayName,
        isConnected: true,
        unreadCount: multiResult.unreadCount || 0,
        connectedAt: new Date().toISOString(),
        credentials: { email, password, imapServer: finalHost, imapPort: finalPort, useSSL: finalSecure }
      });
      await setActiveAccount(session, created.id);

      return NextResponse.json({ success: true, accountId: created.id, unreadCount: created.unreadCount });
    }
    else {
      return NextResponse.json({ success: false, error: 'Provider non supporté' }, { status: 400 });
    }
    
    if (!imapHost) return NextResponse.json({ success: false, error: 'Impossible de déterminer le serveur IMAP' }, { status: 400 });

    // Real auth pour Gmail/Outlook/Yahoo (providers prédéfinis)
    const imapPort = 993;
    const secure = true;
    const auth = await connectViaIMAP({ email, password, imapHost, imapPort, secure });
    if (!auth.success) {
      const friendly = formatImapError({ message: auth.error }, type);
      return NextResponse.json({ success: false, error: friendly }, { status: 401 });
    }

    const created = await upsertAccount(session, {
      email,
      provider: { id: type, name: displayName, type, icon: getProviderIcon(type), color: getProviderColor(type) },
      providerId: type,
      providerName: displayName,
      isConnected: true,
      unreadCount: auth.unreadCount || 0,
      connectedAt: new Date().toISOString(),
      credentials: { email, password, imapServer: imapHost, imapPort, useSSL: secure }
    });
    await setActiveAccount(session, created.id);

    return NextResponse.json({ success: true, accountId: created.id, unreadCount: created.unreadCount });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Erreur de connexion' }, { status: 500 });
  }
}
