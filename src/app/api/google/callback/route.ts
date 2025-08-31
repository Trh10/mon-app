import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { serialize } from 'cookie';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  console.log("--- Début du callback Google ---");

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_BASE_URL } = process.env;

  // Étape 1: Vérifier les variables d'environnement
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !NEXT_PUBLIC_BASE_URL) {
    console.error("❌ ERREUR FATALE: Une ou plusieurs variables d'environnement Google sont manquantes.");
    console.error(`- GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID ? 'Trouvé' : 'MANQUANT'}`);
    console.error(`- GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET ? 'Trouvé' : 'MANQUANT'}`);
    console.error(`- NEXT_PUBLIC_BASE_URL: ${NEXT_PUBLIC_BASE_URL ? 'Trouvé' : 'MANQUANT'}`);
    return NextResponse.json({ error: "Erreur de configuration du serveur." }, { status: 500 });
  }
  console.log("✅ Étape 1: Variables d'environnement vérifiées.");

  // Étape 2: Récupérer le code d'autorisation
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    console.error("❌ ERREUR: Aucun 'code' trouvé dans les paramètres de l'URL.");
    return NextResponse.redirect(new URL('/?oauth=google_error&reason=no_code', req.url));
  }
  console.log("✅ Étape 2: Code d'autorisation reçu de Google.");

  try {
    // Étape 3: Initialiser le client OAuth2
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      `${NEXT_PUBLIC_BASE_URL}/api/google/callback`
    );
    console.log("✅ Étape 3: Client OAuth2 initialisé.");

    // Étape 4: Échanger le code contre des jetons
    console.log("⏳ Étape 4: Échange du code contre des jetons...");
    const { tokens } = await oauth2Client.getToken(code);
    console.log("✅ Étape 4: Jetons reçus !");

    if (!tokens.access_token) {
      console.error("❌ ERREUR: Pas de 'access_token' dans la réponse de Google.");
      throw new Error('access_token manquant');
    }
    if (!tokens.refresh_token) {
      console.warn("⚠️ ATTENTION: Pas de 'refresh_token' dans la réponse. La reconnexion sera nécessaire plus tard.");
      // On continue même sans refresh_token pour cette session
    }

    // Étape 5: Créer le cookie
    const cookieValue = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token, // Peut être undefined, c'est ok
      expiry_date: tokens.expiry_date,
    });

    const cookie = serialize('google-tokens', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      path: '/',
      sameSite: 'lax',
    });
    console.log("✅ Étape 5: Cookie préparé.");

    // Étape 6: Rediriger avec le cookie
    const response = NextResponse.redirect(new URL('/', req.url));
    response.headers.set('Set-Cookie', cookie);
    console.log("✅ Étape 6: Redirection vers l'accueil avec le cookie.");
    console.log("--- Fin du callback Google (Succès) ---");
    return response;

  } catch (error) {
    console.error("❌ ERREUR pendant le traitement du callback Google :", error);
    console.log("--- Fin du callback Google (Échec) ---");
    return NextResponse.redirect(new URL('/?oauth=google_error&reason=token_exchange_failed', req.url));
  }
}