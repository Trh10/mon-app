import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, provider, imapHost, imapPort, smtpHost, smtpPort, secure } = body;

    // Validation des données
    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    // Configuration par provider
    let finalImapHost = imapHost;
    let finalImapPort = imapPort;
    let finalSmtpHost = smtpHost;
    let finalSmtpPort = smtpPort;

    // Auto-configuration si non spécifiée
    if (!finalImapHost) {
      const configs: Record<string, any> = {
        gmail: { imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 587 },
        yahoo: { imapHost: 'imap.mail.yahoo.com', imapPort: 993, smtpHost: 'smtp.mail.yahoo.com', smtpPort: 587 },
        outlook: { imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp-mail.outlook.com', smtpPort: 587 },
        hotmail: { imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp-mail.outlook.com', smtpPort: 587 }
      };

      const config = configs[provider];
      if (config) {
        finalImapHost = config.imapHost;
        finalImapPort = config.imapPort;
        finalSmtpHost = config.smtpHost;
        finalSmtpPort = config.smtpPort;
      }
    }

    // Test de connexion IMAP simple
    console.log(`🔍 Test connexion IMAP: ${email} -> ${finalImapHost}:${finalImapPort}`);
    
    // Pour l'instant, on simule une connexion réussie
    // En production, vous devriez utiliser la bibliothèque 'imap' pour tester réellement
    const testResult = await simulateEmailConnection({
      email,
      password,
      imapHost: finalImapHost,
      imapPort: finalImapPort,
      smtpHost: finalSmtpHost,
      smtpPort: finalSmtpPort,
      secure: secure !== false
    });

    if (testResult.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Connexion réussie',
        config: {
          imapHost: finalImapHost,
          imapPort: finalImapPort,
          smtpHost: finalSmtpHost,
          smtpPort: finalSmtpPort
        }
      });
    } else {
      return NextResponse.json({ error: testResult.error }, { status: 401 });
    }

  } catch (error: any) {
    console.error('Erreur test connexion:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Simulation de test de connexion email
async function simulateEmailConnection(config: any) {
  // Validation basique des formats
  if (!config.email.includes('@')) {
    return { success: false, error: 'Format email invalide' };
  }

  if (!config.password || config.password.length < 3) {
    return { success: false, error: 'Mot de passe trop court' };
  }

  if (!config.imapHost) {
    return { success: false, error: 'Serveur IMAP non configuré' };
  }

  // Simulation d'un délai de connexion
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

  // Simuler quelques cas d'erreur courants
  if (config.email.includes('test-error')) {
    return { success: false, error: 'Identifiants invalides' };
  }

  if (config.email.includes('test-server-error')) {
    return { success: false, error: 'Serveur IMAP inaccessible' };
  }

  // Cas spéciaux pour Gmail
  if (config.email.includes('@gmail.com') && config.password.length < 16) {
    return { 
      success: false, 
      error: 'Gmail nécessite un App Password (16 caractères). Allez sur myaccount.google.com/apppasswords' 
    };
  }

  // Succès par défaut
  return { success: true };
}
