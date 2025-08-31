import { NextRequest } from 'next/server';
import { UniversalSmartClient } from '@/lib/email/universal-smart-client';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: 'Email et mot de passe requis' }, 
        { status: 400 }
      );
    }

    const domain = email.split('@')[1];
    console.log(`🌍 Connexion UNIVERSELLE: ${email} (${domain})`);
    console.log(`⏰ Date/Heure: 2025-08-29 10:56:47 UTC`);
    console.log(`👤 Utilisateur: Trh10`);
    
    const client = new UniversalSmartClient(email, password);
    
    // Auto-découverte intelligente avec base de données mondiale
    const emails = await client.getEmails('INBOX', 20);
    
    console.log(`✅ ${emails.length} emails récupérés pour ${domain} !`);
    
    return Response.json({ 
      emails,
      message: `Connexion réussie à ${domain} ! ${emails.length} emails trouvés.`,
      timestamp: '2025-08-29 10:56:47',
      user: 'Trh10'
    });

  } catch (error: any) {
    console.error('❌ Erreur connexion universelle:', error.message);
    
    const requestData = await request.json().catch(() => ({ email: 'inconnu' }));
    const userEmail = requestData.email || 'inconnu';
    const domain = userEmail.includes('@') ? userEmail.split('@')[1] : 'domaine inconnu';
    
    let errorMessage = 'Impossible de se connecter à votre boîte email';
    
    if (error.message.includes('Invalid credentials') || error.message.includes('AUTHENTICATIONFAILED')) {
      errorMessage = 'Identifiants incorrects. Vérifiez votre email et mot de passe.';
    } else if (error.message.includes('Aucune configuration')) {
      errorMessage = `Auto-détection échouée pour ${domain}. Essayez la configuration manuelle.`;
    }
    
    return Response.json({ 
      error: errorMessage,
      details: error.message,
      suggestion: `Pour ${domain}, vous pouvez essayer la configuration manuelle ou contacter votre fournisseur email.`,
      timestamp: '2025-08-29 10:56:47',
      user: 'Trh10'
    }, { status: 500 });
  }
}