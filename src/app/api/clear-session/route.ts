import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Sessions et cookies nettoyés'
    });

    // Supprimer tous les cookies de session
    const cookiesToClear = [
      'user-session',
      'google-auth',
      'email-credentials', 
      'gmail-token',
      'oauth-token',
      'access-token',
      'refresh-token'
    ];

    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true
      });
    });

    return response;

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erreur nettoyage session'
    }, { status: 500 });
  }
}
