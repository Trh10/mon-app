import { NextRequest } from 'next/server';
import { EmailClient } from '@/lib/email/imap-client';

export async function POST(request: NextRequest) {
  try {
    const { email, password, provider } = await request.json();

    console.log(`📧 Tentative connexion IMAP: ${provider} - ${email}`);

    if (!email || !password || !provider) {
      return Response.json(
        { error: 'Email, mot de passe et provider requis' }, 
        { status: 400 }
      );
    }

    const client = new EmailClient({ email, password, provider });
    
    const emails = await client.getEmails('INBOX', 20);
    
    console.log(`✅ ${emails.length} emails récupérés`);
    
    return Response.json({ emails });

  } catch (error: any) {
    console.error('❌ Erreur IMAP:', error.message);
    
    let errorMessage = 'Erreur de connexion email';
    
    if (error.message.includes('Invalid credentials')) {
      errorMessage = 'Identifiants incorrects. Vérifiez votre email/mot de passe.';
    } else if (error.message.includes('AUTHENTICATIONFAILED')) {
      errorMessage = 'Authentification échouée. Pour Gmail, utilisez un App Password.';
    } else if (error.message.includes('ENOTFOUND')) {
      errorMessage = 'Serveur email introuvable. Vérifiez votre connexion internet.';
    }
    
    return Response.json({ 
      error: errorMessage,
      details: error.message 
    }, { status: 500 });
  }
}