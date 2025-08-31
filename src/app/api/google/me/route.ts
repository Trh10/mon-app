import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/google-auth'; // Utiliser la nouvelle fonction

export async function GET() {
  try {
    const auth = getAuthenticatedClient(); // Obtenir le client authentifié

    const oauth2 = google.oauth2({
      auth, // Passer le client directement
      version: 'v2',
    });

    const { data } = await oauth2.userinfo.get();
    return NextResponse.json(data);

  } catch (error: any) {
    // Si getAuthenticatedClient lève une erreur, on la retourne
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}