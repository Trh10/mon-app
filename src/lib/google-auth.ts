import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export async function getGoogleAuth(req: NextRequest) {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get('google-tokens') || cookieStore.get('pepite_google_tokens');

  if (!tokenCookie) {
    return null;
  }

  try {
    const tokens = JSON.parse(tokenCookie.value);
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials(tokens);
    return auth;
  } catch (error) {
    console.error('Error parsing token cookie:', error);
    return null;
  }
}

// Simple helper used by API routes expecting a ready OAuth2 client or throwing if missing
export function getAuthenticatedClient() {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get('google-tokens') || cookieStore.get('pepite_google_tokens');

  if (!tokenCookie) {
    throw new Error('Utilisateur non authentifié à Google');
  }

  try {
    const tokens = JSON.parse(tokenCookie.value);
    const auth = new (google as any).auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials(tokens);
    return auth;
  } catch (error) {
    throw new Error('Jetons Google invalides');
  }
}