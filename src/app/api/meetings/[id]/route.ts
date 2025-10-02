import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { hub } from '@/lib/realtime/hub';
const db: any = prisma as any;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(_req);
  if (!session.organizationId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
  const m = await db.meeting.findUnique({ where: { id: params.id } });
  if (!m || m.organizationId !== session.organizationId) return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
  const isPrivileged = session.userRole === 'admin' || session.userRole === 'manager';
  return NextResponse.json({ success: true, meeting: m, canManage: isPrivileged });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(request);
  if (!session.organizationId || !session.userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
  const isPrivileged = session.userRole === 'admin' || session.userRole === 'manager';
  if (!isPrivileged) return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
  const m = await db.meeting.findUnique({ where: { id: params.id } });
  if (!m || m.organizationId !== session.organizationId) return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const patch: any = {};
  if (typeof body.title === 'string') patch.title = String(body.title).trim();
  if (typeof body.notes === 'string') patch.notes = String(body.notes);
  if (Array.isArray(body.participants)) patch.participants = body.participants.filter((p: any) => p && p.id && p.name).map((p: any) => ({ id: String(p.id), name: String(p.name) }));
  const updated = await db.meeting.update({ where: { id: params.id }, data: patch });

  try {
    const summary = `Réunion mise à jour: ${updated.title}`;
    const participants: any[] = Array.isArray(updated.participants) ? (updated.participants as any) : [];
    for (const p of participants) {
      if (!p?.id) continue;
      if (String(p.id) === String(session.userId)) continue;
      const dmRoomId = [String(session.userId), String(p.id)].sort().join(':');
      const msgId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      hub.broadcast(`dm:${dmRoomId}`, 'dm', {
        user: { id: session.userId, name: session.userName || 'Utilisateur' },
        payload: { id: msgId, text: summary },
        ts: Date.now(),
      });
      hub.broadcast(`user:${p.id}`, 'dm', {
        user: { id: session.userId, name: session.userName || 'Utilisateur' },
        payload: { id: msgId, text: summary },
        ts: Date.now(),
      });
    }
  } catch {}

  return NextResponse.json({ success: true, meeting: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session.organizationId || !session.userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
  const isPrivileged = session.userRole === 'admin' || session.userRole === 'manager';
  if (!isPrivileged) return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
  const m = await db.meeting.findUnique({ where: { id: params.id } });
  if (!m || m.organizationId !== session.organizationId) return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
  await db.meeting.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
