import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token, folder = 'INBOX' } = await request.json();

    if (!access_token) {
      return NextResponse.json({ error: 'Token d\'accès requis' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token,
      refresh_token
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

    // Récupération des détails de chaque message
    for (const message of messages.slice(0, 20)) { // Limiter à 20 pour les performances
      try {
        const msgDetail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full'
        });

        const headers = msgDetail.data.payload?.headers || [];
        const subjectHeader = headers.find(h => h.name === 'Subject');
        const fromHeader = headers.find(h => h.name === 'From');
        const dateHeader = headers.find(h => h.name === 'Date');

        // Extraction du corps du message
        let body = '';
        if (msgDetail.data.payload?.body?.data) {
          body = Buffer.from(msgDetail.data.payload.body.data, 'base64').toString();
        } else if (msgDetail.data.payload?.parts) {
          const textPart = msgDetail.data.payload.parts.find(
            part => part.mimeType === 'text/plain' || part.mimeType === 'text/html'
          );
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString();
          }
        }

        const email = {
          id: message.id,
          subject: subjectHeader?.value || 'Sans sujet',
          from: fromHeader?.value || 'Expéditeur inconnu',
          fromName: extractName(fromHeader?.value || ''),
          date: dateHeader?.value ? new Date(dateHeader.value).toISOString() : new Date().toISOString(),
          snippet: msgDetail.data.snippet || '',
          unread: !msgDetail.data.labelIds?.includes('UNREAD'),
          hasAttachments: msgDetail.data.payload?.parts?.some(part => 
            part.filename && part.filename.length > 0
          ) || false,
          body: body.substring(0, 500) // Limiter la taille
        };

        emails.push(email);
      } catch (msgError) {
        console.error(`Erreur récupération message ${message.id}:`, msgError);
      }
    }

    return NextResponse.json({
      success: true,
      emails,
      stats: {
        total: emails.length,
        unread: emails.filter(e => e.unread).length,
        provider: 'gmail_oauth',
        folder
      }
    });

  } catch (error: any) {
    console.error('Erreur Gmail OAuth:', error);
    return NextResponse.json(
      { error: 'Erreur Gmail', message: error.message },
      { status: 500 }
    );
  }
}

function extractName(fromValue: string): string {
  const match = fromValue.match(/^(.+?)\s*<.+>$/);
  return match ? match[1].replace(/"/g, '').trim() : fromValue;
}