import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
const db: any = prisma as any;

// GET meetings scoped by organization; non-privileged users see finalized or their own
export async function GET() {
  const session = await getSession(new NextRequest(new URL('http://local')) as any);
  if (!session.organizationId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
  // Basic privilege: admins can manage
  const isPrivileged = session.userRole === 'admin' || session.userRole === 'manager';
  const where: any = { organizationId: session.organizationId };
  const all = await db.meeting.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  });
  const filtered = isPrivileged ? all : all.filter((m: any) => m.status === 'finalized' || m.creatorId === session.userId);
  return NextResponse.json({ success: true, items: filtered, canManage: isPrivileged });
}

// Create meeting (admins/managers only)
export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session.organizationId || !session.userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
  const isPrivileged = session.userRole === 'admin' || session.userRole === 'manager';
  if (!isPrivileged) return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const { title, notes, participants } = body || {};
  if (!title) return NextResponse.json({ success: false, error: 'Titre requis' }, { status: 400 });
  const normalizedParticipants = Array.isArray(participants)
    ? participants.filter((p: any) => p && p.id && p.name).map((p: any) => ({ id: String(p.id), name: String(p.name) }))
    : [];
  if (!normalizedParticipants.some((p: any) => p.id === String(session.userId))) {
    normalizedParticipants.push({ id: String(session.userId), name: String(session.userName || 'Utilisateur') });
  }
  const created = await db.meeting.create({
    data: {
      organizationId: session.organizationId,
      creatorId: session.userId,
      title: String(title).trim(),
      notes: String(notes || ''),
      participants: normalizedParticipants,
      status: 'draft',
    },
  });
  return NextResponse.json({ success: true, meeting: created });
}
