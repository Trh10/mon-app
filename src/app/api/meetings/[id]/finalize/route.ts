import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { hub } from '@/lib/realtime/hub';
const db: any = prisma as any;

// Naive action extractor: look for lines starting with markers and parse @userId and due dates like 2025-09-30
function extractActions(notes: string): { title: string; assignedTo?: string; dueDate?: string }[] {
  const actions: { title: string; assignedTo?: string; dueDate?: string }[] = [];
  const html = String(notes || '');
  // Remove HTML tags and decode a few common entities for robustness
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ');
  const lines = text.split(/\r?\n|(?<=\.)\s+(?=[A-ZÀ-ÖØ-Þ])/); // split on newlines or sentence boundaries
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^(todo|action)\s*:|^-\s+/i.test(trimmed)) {
      let title = trimmed.replace(/^(todo|action)\s*:\s*/i, '').replace(/^[-*]\s*/, '').trim();
      let assignedTo: string | undefined;
      let dueDate: string | undefined;
      // @user: extract id between @ and space or end
      const at = title.match(/@([a-zA-Z0-9_-]{6,})/);
      if (at) {
        assignedTo = at[1];
        title = title.replace(at[0], '').trim();
      }
      const due = title.match(/\b(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?\b/);
      if (due) {
        dueDate = due[2] ? `${due[1]} ${due[2]}` : due[1];
        title = title.replace(due[0], '').trim();
      }
      if (title) actions.push({ title, assignedTo, dueDate });
    }
  }
  return actions;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session.organizationId || !session.userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
  const isPrivileged = session.userRole === 'admin' || session.userRole === 'manager';
  if (!isPrivileged) return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
  const m = await db.meeting.findUnique({ where: { id: params.id } });
  if (!m || m.organizationId !== session.organizationId) return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
  if (m.status === 'finalized') return NextResponse.json({ success: true, meeting: m, message: 'Déjà finalisé' });

  const actions = extractActions(m.notes);
  const createdTaskIds: string[] = [];

  // Create tasks via hub broadcast-compatible API by calling the local route handler
  const hdrs = headers();
  const cookieHeader = hdrs.get('cookie') || '';
  const tasksUrl = new URL('/api/team/tasks', req.url).toString();
  for (const a of actions) {
  const assignedTo = a.assignedTo || (Array.isArray(m.participants) ? (m.participants as any)[0]?.id : undefined) || String(session.userId);
    try {
      const res = await fetch(tasksUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cookie': cookieHeader },
        body: JSON.stringify({
          action: 'create',
          data: {
            title: a.title,
            description: `Meeting: ${m.title}`,
            assignedTo,
            priority: 'medium',
            isPrivate: false,
            dueDate: a.dueDate,
          }
        })
      });
      const data = await res.json();
      if (res.ok && data?.task?.id) createdTaskIds.push(data.task.id);
    } catch {}
  }

  const updated = await db.meeting.update({ where: { id: m.id }, data: { status: 'finalized', extractedActions: actions as any, tasksCreated: createdTaskIds as any } });

  // Broadcast a DM summary to each participant (DM room + canal personnel)
  try {
    const summary = `Compte rendu: ${m.title} — ${actions.length} action(s) créée(s).`;
    const participants: any[] = Array.isArray(m.participants) ? (m.participants as any) : [];
    for (const p of participants) {
      if (!p?.id) continue;
      if (String(p.id) === String(session.userId)) continue; // éviter l'auto-notif
      const dmRoomId = [String(session.userId), String(p.id)].sort().join(':');
      const msgId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      // Room DM
      hub.broadcast(`dm:${dmRoomId}`, 'dm', {
        user: { id: session.userId, name: session.userName || 'Utilisateur' },
        payload: { id: msgId, text: summary },
        ts: Date.now(),
      });
      // Canal personnel de l'utilisateur (pour les notifications inbox)
      hub.broadcast(`user:${p.id}`, 'dm', {
        user: { id: session.userId, name: session.userName || 'Utilisateur' },
        payload: { id: msgId, text: summary },
        ts: Date.now(),
      });
    }
  } catch {}

  return NextResponse.json({ success: true, meeting: updated, createdTasks: createdTaskIds });
}
