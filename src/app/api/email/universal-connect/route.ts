import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
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
    
    const { folder = 'INBOX', limit = 25 } = await req.json();

    // Récupérer les messages de Gmail
    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: [folder],
      maxResults: limit,
    });

    const messages = response.data.messages || [];
    
    // Récupérer les détails de chaque message
    const emails = await Promise.all(
      messages.map(async (message) => {
        const messageDetails = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        });

        const headers = messageDetails.data.payload?.headers || [];
        const fromHeader = headers.find(h => h.name === 'From');
        const subjectHeader = headers.find(h => h.name === 'Subject');
        const dateHeader = headers.find(h => h.name === 'Date');

        return {
          id: message.id,
          subject: subjectHeader?.value || 'Sans objet',
          from: fromHeader?.value || 'Expéditeur inconnu',
          fromName: fromHeader?.value?.split('<')[0]?.trim() || 'Expéditeur inconnu',
          date: dateHeader?.value || new Date().toISOString(),
          snippet: messageDetails.data.snippet || '',
          unread: messageDetails.data.labelIds?.includes('UNREAD') || false,
          hasAttachments: false,
          threadId: messageDetails.data.threadId,
        };
      })
    );

    return NextResponse.json({ emails });

  } catch (error: any) {
    console.error("Erreur dans universal-connect:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}