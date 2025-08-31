import { google } from 'googleapis';
import type { NextApiRequest, NextApiResponse } from 'next';

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_BASE_URL } = process.env;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !NEXT_PUBLIC_BASE_URL) {
    return res.status(500).json({ error: 'Variables d\'environnement manquantes' });
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${NEXT_PUBLIC_BASE_URL}/api/google/callback` // URL de redirection
  );

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Important pour obtenir un refresh_token
    prompt: 'consent',     // Force la demande de consentement à chaque fois
    scope: scopes,
  });

  res.redirect(url);
}