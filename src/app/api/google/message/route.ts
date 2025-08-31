import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/google-auth';

// Fonction pour trouver une valeur dans les en-têtes
const getHeader = (headers: any[], name: string) => headers.find(h => h.name === name)?.value || '';

// Fonction pour décoder le corps du message
function decodeBase64Url(data: string): string {
  if (!data) return '';
  // Remplace les caractères base64url par les caractères base64 standard
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get('id');

  if (!messageId) {
    return NextResponse.json({ error: 'ID de message manquant' }, { status: 400 });
  }

  try {
    const auth = getAuthenticatedClient();
    const gmail = google.gmail({ version: 'v1', auth });

    const msgResponse = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const { payload, internalDate } = msgResponse.data;
    if (!payload || !payload.headers) {
      throw new Error("La structure de l'email est invalide.");
    }

    // --- C'EST ICI QUE LA MAGIE OPÈRE ---
    // On simplifie l'objet avant de le renvoyer

    // 1. Extraire le corps du message (en texte brut de préférence)
    let bodyData = '';
    let bodyHtmlData = '';
    if (payload.parts) {
      const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
      if (textPart && textPart.body?.data) {
        bodyData = textPart.body.data;
      }
      const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
      if (htmlPart && htmlPart.body?.data) {
        bodyHtmlData = htmlPart.body.data;
      }
    } else if (payload.body?.data) {
      // Si pas de 'parts', le corps est directement dans 'body'
      bodyData = payload.body.data;
    }

    // 2. Créer un objet simple et propre
    const cleanEmail = {
      id: msgResponse.data.id,
      subject: getHeader(payload.headers, 'Subject'),
      from: getHeader(payload.headers, 'From'),
      to: getHeader(payload.headers, 'To'),
      date: internalDate ? new Date(parseInt(internalDate, 10)).toISOString() : new Date().toISOString(),
      snippet: msgResponse.data.snippet,
      body: decodeBase64Url(bodyData),
      bodyHtml: decodeBase64Url(bodyHtmlData)
    };

    return NextResponse.json(cleanEmail); // On renvoie l'objet simplifié

  } catch (error: any) {
    console.error(`Erreur dans /api/google/message: ${error.message}`);
    return NextResponse.json({ error: `Non autorisé: ${error.message}` }, { status: 401 });
  }
}