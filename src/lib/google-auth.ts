import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Cette fonction sera utilisée par TOUTES les routes API
export function getAuthenticatedClient() {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get('google-tokens');

  if (!tokenCookie) {
    throw new Error('Not Authenticated: No token cookie found.');
  }

  try {
    const { access_token } = JSON.parse(tokenCookie.value);
    if (!access_token) {
      throw new Error('Not Authenticated: Invalid token in cookie.');
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token });
    return oauth2Client;

  } catch (e) {
    throw new Error('Not Authenticated: Cookie parsing failed.');
  }
}