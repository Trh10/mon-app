import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/presence/heartbeat
 * Met à jour le timestamp updatedAt de l'utilisateur pour indiquer qu'il est actif
 * Appelé automatiquement par le frontend toutes les 2 minutes
 */
export async function POST(req: NextRequest) {
  try {
    // Récupérer l'utilisateur depuis la session
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('user-session');
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    
    let session;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }
    
    if (!session?.id) {
      return NextResponse.json({ error: 'ID utilisateur manquant' }, { status: 401 });
    }
    
    // Mettre à jour le timestamp updatedAt
    await prisma.user.update({
      where: { id: session.id },
      data: { updatedAt: new Date() }
    });
    
    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      message: 'Présence mise à jour'
    });
    
  } catch (error: any) {
    console.error('[Heartbeat] Erreur:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error.message 
    }, { status: 500 });
  }
}
