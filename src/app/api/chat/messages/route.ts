import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/chat/messages
 * Envoyer un nouveau message
 * Body: { room, text, recipientId? }
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
    
    const { room, text, recipientId } = await req.json();
    
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 });
    }
    
    // Créer le message dans la base
    const message = await prisma.message.create({
      data: {
        organizationId: session.organizationId,
        userId: session.id,
        kind: recipientId ? 'dm' : 'chat',
        channel: room || 'general',
        content: text.trim(),
        metadata: recipientId ? { recipientId, recipientRoom: `dm:${Math.min(session.id, recipientId)}:${Math.max(session.id, recipientId)}` } : undefined
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, role: true }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: {
        id: String(message.id),
        text: message.content,
        room: message.channel,
        ts: message.createdAt.getTime(),
        user: {
          id: String(message.user?.id || session.id),
          name: message.user?.displayName || message.user?.name || session.name,
          role: message.user?.role || session.role
        }
      }
    });
    
  } catch (error: any) {
    console.error('[Chat] Erreur envoi:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * GET /api/chat/messages
 * Récupérer les messages d'une room
 * Query: room, limit, recipientId (pour DM)
 */
export async function GET(req: NextRequest) {
  try {
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
    
    const { searchParams } = new URL(req.url);
    const room = searchParams.get('room') || 'general';
    const limit = Math.min(Number(searchParams.get('limit') || '100'), 500);
    const recipientId = searchParams.get('recipientId');
    
    let whereClause: any = {
      organizationId: session.organizationId
    };
    
    if (recipientId) {
      // Messages privés entre deux utilisateurs
      const minId = Math.min(session.id, Number(recipientId));
      const maxId = Math.max(session.id, Number(recipientId));
      const dmRoom = `dm:${minId}:${maxId}`;
      
      whereClause.OR = [
        { channel: dmRoom },
        { 
          kind: 'dm',
          metadata: { path: ['recipientRoom'], equals: dmRoom }
        }
      ];
    } else {
      // Messages de la room publique
      whereClause.channel = room;
      whereClause.kind = { not: 'dm' };
    }
    
    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, displayName: true, role: true }
        }
      }
    });
    
    const formattedMessages = messages.map(m => ({
      id: String(m.id),
      text: m.content,
      room: m.channel,
      ts: m.createdAt.getTime(),
      user: {
        id: String(m.user?.id || 0),
        name: m.user?.displayName || m.user?.name || 'Utilisateur',
        role: m.user?.role || 'Employé'
      }
    }));
    
    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      count: formattedMessages.length
    });
    
  } catch (error: any) {
    console.error('[Chat] Erreur lecture:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
