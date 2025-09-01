import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Fonction pour trouver une valeur dans les en-têtes
const getHeader = (headers: any[], name: string) => headers.find(h => h.name === name)?.value || '';

// Fonction pour décoder le corps du message
function decodeBase64Url(data: string): string {
  if (!data) return '';
  try {
    // Remplace les caractères base64url par les caractères base64 standard
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  } catch (error) {
    console.error('Erreur de décodage base64:', error);
    return '';
  }
}

// Fonction pour extraire le contenu du message
function extractMessageBody(payload: any): { text: string; html: string } {
  let text = '';
  let html = '';

  if (payload.parts) {
    // Message avec plusieurs parties
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text = decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html = decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'multipart/alternative' && part.parts) {
        // Récursivement chercher dans les sous-parties
        const subContent = extractMessageBody(part);
        if (subContent.text) text = subContent.text;
        if (subContent.html) html = subContent.html;
      }
    }
  } else if (payload.body?.data) {
    // Message simple
    if (payload.mimeType === 'text/html') {
      html = decodeBase64Url(payload.body.data);
    } else {
      text = decodeBase64Url(payload.body.data);
    }
  }

  return { text, html };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get('id');

  if (!messageId) {
    return NextResponse.json({ error: 'ID de message manquant' }, { status: 400 });
  }

  try {
    // Récupérer le token depuis les cookies
    const cookieStore = cookies();
    const tokenCookie = cookieStore.get('google-tokens');
    
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tokens = JSON.parse(tokenCookie.value);
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth });

    const msgResponse = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const { payload, internalDate, threadId, labelIds } = msgResponse.data;
    if (!payload || !payload.headers) {
      throw new Error("La structure de l'email est invalide.");
    }

    // Extraire le contenu du message
    const { text, html } = extractMessageBody(payload);

    // Créer un objet simple et propre
    const cleanEmail = {
      id: msgResponse.data.id,
      threadId: threadId,
      subject: getHeader(payload.headers, 'Subject'),
      from: getHeader(payload.headers, 'From'),
      to: getHeader(payload.headers, 'To'),
      cc: getHeader(payload.headers, 'Cc'),
      date: internalDate ? new Date(parseInt(internalDate, 10)).toISOString() : new Date().toISOString(),
      snippet: msgResponse.data.snippet,
      body: text || html, // Préférer le texte, sinon HTML
      bodyHtml: html,
      bodyText: text,
      unread: labelIds?.includes('UNREAD') || false,
      labels: labelIds || []
    };

    return NextResponse.json(cleanEmail);

  } catch (error: any) {
    console.error(`Erreur dans /api/google/message: ${error.message}`);
    return NextResponse.json({ error: `Erreur: ${error.message}` }, { status: 500 });
  }
}