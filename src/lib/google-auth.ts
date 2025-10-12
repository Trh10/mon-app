import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_GOOGLE_PRIMARY, LEGACY_GOOGLE_COOKIES } from '@/config/branding';

export async function getGoogleAuth(req: NextRequest) {
  const cookieStore = cookies();
  let tokenCookie = cookieStore.get(COOKIE_GOOGLE_PRIMARY);
  if (!tokenCookie) {
    for (const legacy of LEGACY_GOOGLE_COOKIES) {
      const found = cookieStore.get(legacy);
      if (found) { tokenCookie = found; break; }
    }
  }

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
  let tokenCookie = cookieStore.get(COOKIE_GOOGLE_PRIMARY);
  if (!tokenCookie) {
    for (const legacy of LEGACY_GOOGLE_COOKIES) {
      const found = cookieStore.get(legacy);
      if (found) { tokenCookie = found; break; }
    }
  }

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

// Purge des cookies tokens (invalid_grant etc.)
export function purgeGoogleTokens() {
  try {
    const cookieStore = cookies();
    cookieStore.delete(COOKIE_GOOGLE_PRIMARY);
    for (const legacy of LEGACY_GOOGLE_COOKIES) {
      cookieStore.delete(legacy);
    }
  } catch (e) {
    console.warn('Impossible de supprimer les cookies Google:', e);
  }
}

/**
 * Wrapper utilitaire pour effectuer un appel Google et normaliser l'erreur invalid_grant.
 * Utilisation:
 *   return safeGoogleCall(async () => { ... votre logique ... });
 */
export async function safeGoogleCall<T>(fn: () => Promise<T>) {
  try {
    const data = await fn();
    return { ok: true as const, data };
  } catch (error: any) {
    const msg = error?.message || '';
    if (/invalid_grant|unauthorized_client|invalid_credentials/i.test(msg)) {
      purgeGoogleTokens();
      return { ok: false as const, invalidGrant: true, error: 'invalid_grant', message: 'Session Google expirée - reconnectez-vous.' };
    }
    return { ok: false as const, error: msg || 'Erreur Google inconnue' };
  }
}