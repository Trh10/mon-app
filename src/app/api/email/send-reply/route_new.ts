import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { 
      originalEmailId, 
      replyType, 
      subject, 
      content, 
      to, 
      cc 
    } = await req.json();

    // Validation des données requises
    if (!originalEmailId || !replyType || !content) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Simulation d'authentification - remplacer par votre système d'auth
    const sender = {
      email: 'user@example.com',
      name: 'Utilisateur Test'
    };

    // Simulation de récupération de l'email original
    const originalEmail = {
      id: originalEmailId,
      from: 'sender@example.com',
      to: ['user@example.com'],
      cc: ['cc@example.com'],
      subject: 'Email original',
      body: 'Contenu original',
      timestamp: new Date().toISOString()
    };

    // Gérer les destinataires selon le type de réponse
    let recipients: string[] = [];
    let copyRecipients: string[] = [];

    // Traiter les destinataires principaux
    if (to && Array.isArray(to)) {
      recipients = to;
    } else if (to && typeof to === 'string') {
      recipients = [to];
    }

    // Traiter les copies
    if (cc && Array.isArray(cc)) {
      copyRecipients = cc;
    } else if (cc && typeof cc === 'string') {
      copyRecipients = [cc];
    }

    // Déterminer les destinataires selon le type de réponse
    switch (replyType) {
      case 'reply':
        recipients = [originalEmail.from];
        break;
      case 'reply-all':
        recipients = [originalEmail.from];
        copyRecipients = [...(originalEmail.cc || []), ...(originalEmail.to || [])];
        break;
      case 'forward':
        // Pour le transfert, garder les destinataires fournis
        if (recipients.length === 0) {
          recipients = ['destinataire@example.com'];
        }
        break;
    }

    // Supprimer l'expéditeur actuel des destinataires
    if (sender?.email) {
      recipients = recipients.filter(email => 
        email.toLowerCase() !== sender.email.toLowerCase()
      );
      copyRecipients = copyRecipients.filter(email => 
        email.toLowerCase() !== sender.email.toLowerCase()
      );
    }

    // Préparer les données d'envoi
    const emailData = {
      from: sender.email,
      to: recipients,
      cc: copyRecipients,
      subject,
      content,
      originalMessageId: originalEmail.id,
      replyType,
      timestamp: new Date().toISOString()
    };

    // Simuler l'envoi d'email
    const sendResult = await simulateEmailSend(emailData);

    if (sendResult.success) {
      return NextResponse.json({
        success: true,
        messageId: sendResult.messageId,
        message: 'Email envoyé avec succès'
      });
    } else {
      return NextResponse.json(
        { error: sendResult.error },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Erreur envoi email:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// Simulation d'envoi d'email
async function simulateEmailSend(emailData: any) {
  // Validation basique
  if (!emailData.from || !emailData.to || emailData.to.length === 0) {
    return { success: false, error: 'Destinataires manquants' };
  }

  if (!emailData.subject || !emailData.content) {
    return { success: false, error: 'Objet et contenu requis' };
  }

  // Simuler un délai d'envoi
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

  // Simuler quelques cas d'erreur aléatoires (5% de chance)
  if (Math.random() < 0.05) {
    return { 
      success: false, 
      error: 'Erreur temporaire du serveur email' 
    };
  }

  // Succès
  return {
    success: true,
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}
