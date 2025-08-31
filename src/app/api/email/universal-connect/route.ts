import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/google-auth'; // Utiliser la nouvelle fonction
import { getGmailEmails } from '@/lib/email/gmail-client';

export async function POST(req: Request) {
  try {
    const auth = getAuthenticatedClient(); // Obtenir le client authentifié
    const accessToken = (await auth.getAccessToken()).token;

    if (!accessToken) {
        throw new Error("Impossible d'obtenir l'access token depuis le client authentifié.");
    }
    
    const { folder = 'INBOX', limit = 25 } = await req.json();

    const emails = await getGmailEmails(accessToken, limit, folder);
    return NextResponse.json({ emails });

  } catch (error: any) {
    console.error("Erreur dans universal-connect:", error.message);
    return NextResponse.json({ error: error.message }, { status: error.message.includes('Not Authenticated') ? 401 : 500 });
  }
}