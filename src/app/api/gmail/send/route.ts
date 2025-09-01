import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { to, subject, content, replyToMessageId, threadId } = await request.json();

    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: "Paramètres manquants (to, subject, content)" },
        { status: 400 }
      );
    }

    // Construire l'email au format RFC 2822
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36)}`;
    
    let emailContent = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      content,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      content.replace(/\n/g, '<br>'),
      '',
      `--${boundary}--`
    ].join('\n');

    // Si c'est une réponse, ajouter les headers
    if (replyToMessageId) {
      emailContent = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `In-Reply-To: ${replyToMessageId}`,
        `References: ${replyToMessageId}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 7bit',
        '',
        content,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 7bit',
        '',
        content.replace(/\n/g, '<br>'),
        '',
        `--${boundary}--`
      ].join('\n');
    }

    // Encoder en base64url
    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log('[Gmail Send] Envoi email vers:', to);

    // Envoyer via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail,
        threadId: threadId || undefined
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Gmail Send] Erreur Gmail API:', response.status, errorData);
      
      return NextResponse.json(
        { error: `Erreur Gmail ${response.status}`, details: errorData },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('[Gmail Send] Email envoyé avec succès:', result.id);

    return NextResponse.json({
      success: true,
      messageId: result.id,
      threadId: result.threadId,
      message: "Email envoyé avec succès !"
    });

  } catch (error: any) {
    console.error('[Gmail Send] Erreur:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi", details: error.message },
      { status: 500 }
    );
  }
}