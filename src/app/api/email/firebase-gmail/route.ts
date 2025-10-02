import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Firebase Admin retiré pour compatibilité sans config. On suppose un access_token Gmail direct.

export async function POST(request: NextRequest) {
  try {
    const { access_token, uid, folder = 'INBOX' } = await request.json();

    if (!access_token || !uid) {
      return NextResponse.json({ error: 'Token d\'accès et UID requis' }, { status: 400 });
    }

  // Vérification Firebase désactivée (pas d'admin SDK en build). On fait confiance au client en mode dev.

    // Configuration OAuth2 pour accéder à Gmail
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: access_token
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Récupération des messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: [folder],
      maxResults: 50
    });

    const messages = response.data.messages || [];
    const emails = [];

    // Récupération des détails (limité pour les performances)
    for (const message of messages.slice(0, 20)) {
      try {
        const msgDetail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date']
        });

        const headers = msgDetail.data.payload?.headers || [];
        const subjectHeader = headers.find(h => h.name === 'Subject');
        const fromHeader = headers.find(h => h.name === 'From');
        const dateHeader = headers.find(h => h.name === 'Date');

        const email = {
          id: message.id,
          subject: subjectHeader?.value || 'Sans sujet',
          from: fromHeader?.value || 'Expéditeur inconnu',
          fromName: extractName(fromHeader?.value || ''),
          date: dateHeader?.value ? new Date(dateHeader.value).toISOString() : new Date().toISOString(),
          snippet: msgDetail.data.snippet || '',
          unread: msgDetail.data.labelIds?.includes('UNREAD') || false,
          hasAttachments: false // Simplifié pour les performances
        };

        emails.push(email);
      } catch (msgError) {
        console.error(`Erreur message ${message.id}:`, msgError);
      }
    }

    return NextResponse.json({
      success: true,
      emails,
      stats: {
        total: emails.length,
        unread: emails.filter(e => e.unread).length,
        provider: 'firebase_gmail',
        folder
      }
    });

  } catch (error: any) {
    console.error('Erreur Firebase Gmail:', error);
    return NextResponse.json(
      { error: 'Erreur Firebase Gmail', message: error.message },
      { status: 500 }
    );
  }
}

function extractName(fromValue: string): string {
  const match = fromValue.match(/^(.+?)\s*<.+>$/);
  return match ? match[1].replace(/"/g, '').trim() : fromValue;
}