import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureOrgAndUserFromCookie } from '@/lib/auth/sessionBridge';
import { jsonSafe } from '@/lib/json';

// GET meetings scoped by organization
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    let organizationId = session.organizationId;
    if (!organizationId) {
      const bridged = await ensureOrgAndUserFromCookie(req);
      organizationId = bridged?.organizationId;
    }
    if (!organizationId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const db = prisma as any;
    const meetings = await db.meeting.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      include: {
        organization: {
          select: { name: true }
        }
      }
    });

    // Récupérer le nom de l'utilisateur qui a uploadé
    const userIds = (meetings as any[])
      .map((m: any) => m.metadata && typeof m.metadata === 'object' && 'uploadedBy' in m.metadata ? m.metadata.uploadedBy : null)
      .filter(Boolean) as number[];

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });

    const userMap = new Map(users.map(u => [u.id, u.name || u.email]));

    const items = (meetings as any[]).map((m: any) => {
      const metadata = m.metadata && typeof m.metadata === 'object' ? (m.metadata as any) : {};
      return {
        id: String(m.id),
        title: m.title,
        fileName: metadata.fileName || 'document.pdf',
        fileUrl: metadata.filePath || '',
        fileSize: metadata.fileSize || 0,
        uploadedBy: userMap.get(metadata.uploadedBy) || 'Inconnu',
        uploadedAt: m.createdAt.toISOString()
      };
    });

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error('GET meetings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create meeting (kept for backward compatibility but not used anymore)
export async function POST(request: NextRequest) {
  const session = await getSession(request);
  let organizationId = session.organizationId;
  let userId = session.userId;
  if (!organizationId || !userId) {
    const bridged = await ensureOrgAndUserFromCookie(request);
    if (bridged) { organizationId = bridged.organizationId; userId = bridged.userId ?? undefined; }
  }
  if (!organizationId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { title, notes } = body || {};
  
  if (!title) {
    return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
  }

  const db = prisma as any;
  const created = await db.meeting.create({
    data: {
      organizationId,
      title: String(title).trim(),
      notes: String(notes || ''),
      status: 'draft',
      metadata: jsonSafe({})
    },
  });

  return NextResponse.json({ success: true, meeting: created });
}
