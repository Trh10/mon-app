import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session.organizationId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const meetingId = params.id; // Meeting.id est une String (cuid())
  const db = prisma as any;
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting || meeting.organizationId !== session.organizationId) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  }
  return NextResponse.json({ success: true, meeting });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(req);
    if (!session.organizationId) {
      return NextResponse.json({ error: 'Session requise' }, { status: 401 });
    }

    const meetingId = params.id; // String id

    // Récupérer la réunion
  const db = prisma as any;
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting || meeting.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Réunion non trouvée' }, { status: 404 });
    }

    // Supprimer le fichier physique si présent (chemin public)
    const metadata = meeting.metadata && typeof meeting.metadata === 'object' ? (meeting.metadata as any) : {};
    if (metadata.filePath) {
      const fullPath = join(process.cwd(), 'public', metadata.filePath.replace(/^\/+/, ''));
      try {
        await unlink(fullPath);
      } catch (e) {
        // Ignorer si déjà supprimé
      }
    }

    // Supprimer l'entrée de la base de données
  const db2 = prisma as any;
  await db2.meeting.delete({ where: { id: meetingId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete meeting error:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la suppression' }, { status: 500 });
  }
}
