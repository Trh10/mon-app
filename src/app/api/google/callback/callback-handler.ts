// Helper pour gérer le callback Google et rediriger vers la modale
import { NextResponse } from 'next/server';

export async function handleGoogleCallback(tokens: any, req: any) {
  try {
    // Après avoir reçu les tokens Google, on persiste directement le compte
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/email/connect-google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `google-tokens=${JSON.stringify(tokens)}`
      }
    });

    const data = await response.json();
    
    if (data.success) {
      // Rediriger vers l'accueil avec un paramètre de succès
      return NextResponse.redirect(new URL('/?gmail_connected=success', req.url));
    } else {
      return NextResponse.redirect(new URL('/?gmail_connected=error', req.url));
    }
  } catch (error) {
    console.error('Erreur handleGoogleCallback:', error);
    return NextResponse.redirect(new URL('/?gmail_connected=error', req.url));
  }
}
