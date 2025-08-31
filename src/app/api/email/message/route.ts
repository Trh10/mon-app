import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/google-auth';

// --- NOUVELLE FONCTION "DÉTECTIVE" ---
// Elle cherche récursivement dans toutes les parties de l'email
function findBodyParts(parts: any[]): { text: string; html: string } {
  let text = '';
  let html = '';

  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text = part.body.data;
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      html = part.body.data;
    } else if (part.parts) {
      // Si on trouve des parties imbriquées, on cherche dedans !
      const nested = findBodyParts(part.parts);
      if (nested.text) text = nested.text;
      if (nested.html) html = nested.html;
    }
  }
  return { text, html };
}

// Fonction pour décoder le corps du message
function decodeBase64Url(data: string): string {
  if (!data) return '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

// Fonction pour trouver une valeur dans les en-têtes
const getHeader = (headers: any[], name: string) => headers.find(h => h.name === name)?.value || '';

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

    let bodyData = { text: '', html: '' };
    if (payload.parts) {
      // On utilise notre nouvelle fonction "détective"
      bodyData = findBodyParts(payload.parts);
    } else if (payload.body?.data) {
      // Cas simple où le corps est directement là
      if (payload.mimeType === 'text/plain') {
        bodyData.text = payload.body.data;
      } else if (payload.mimeType === 'text/html') {
        bodyData.html = payload.body.data;
      }
    }

    // On crée l'objet final propre
    const cleanEmail = {
      id: msgResponse.data.id,
      subject: getHeader(payload.headers, 'Subject'),
      from: getHeader(payload.headers, 'From'),
      to: getHeader(payload.headers, 'To'),
      date: internalDate ? new Date(parseInt(internalDate, 10)).toISOString() : new Date().toISOString(),
      snippet: msgResponse.data.snippet,
      // On décode le contenu trouvé
      body: decodeBase64Url(bodyData.text),
      bodyHtml: decodeBase64Url(bodyData.html),
    };

    return NextResponse.json(cleanEmail);

  } catch (error: any) {
    console.error(`Erreur dans /api/google/message: ${error.message}`);
    return NextResponse.json({ error: `Non autorisé: ${error.message}` }, { status: 401 });
  }
}