import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonSafe } from "@/lib/json";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    // Essayer de récupérer l'organizationId
    let organizationId = session.organizationId;
    
    // Si pas de session, essayer depuis les cookies
    if (!organizationId) {
      const orgIdCookie = request.cookies.get('organizationId')?.value;
      if (orgIdCookie) {
        organizationId = parseInt(orgIdCookie, 10);
      }
    }
    
    // Si toujours pas d'organization, prendre la première par défaut
    if (!organizationId) {
      const firstOrg = await prisma.organization.findFirst();
      if (firstOrg) {
        organizationId = firstOrg.id;
      }
    }
    
    if (!organizationId) {
      return NextResponse.json({ items: [], total: 0 }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    const status = searchParams.get("status");
    const week = searchParams.get("week");
    
    const where: any = { organizationId: organizationId };
    
    if (userIdParam) {
      where.userId = Number(userIdParam);
    }
    
    if (status) {
      where.status = status;
    }
    
    // Filtrer par semaine courante
    if (week === 'current') {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      where.OR = [
        { createdAt: { gte: startOfWeek, lte: endOfWeek } },
        { dueAt: { gte: startOfWeek, lte: endOfWeek } },
        { status: { in: ['pending', 'in_progress'] } }
      ];
    }
    
    const items = await prisma.task.findMany({ 
      where, 
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });
    
    // Ajouter les champs manquants avec des valeurs par défaut
    const enrichedItems = items.map((item: any) => ({
      ...item,
      progress: item.metadata?.progress || 0,
      priority: item.metadata?.priority || 'normal',
      assignedById: item.metadata?.assignedById || null,
      assignedBy: null
    }));
    
    return NextResponse.json(jsonSafe(enrichedItems));
  } catch (e: any) {
    console.error('GET /api/tasks error:', e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.organizationId) {
      return NextResponse.json({ error: "Session requise" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, 
      description, 
      dueAt, 
      priority = 'normal',
      assignToUserId,
      metadata = {} 
    } = body;
    
    if (!title?.trim()) {
      return NextResponse.json({ error: "Titre requis" }, { status: 400 });
    }
    
    // Stocker progress et priority dans metadata
    const enrichedMetadata = {
      ...metadata,
      progress: 0,
      priority,
      assignedById: session.userId
    };
    
    const task = await prisma.task.create({ 
      data: { 
        organizationId: session.organizationId,
        userId: assignToUserId ? Number(assignToUserId) : (session.userId ?? null),
        title: title.trim(),
        description: description?.trim() || null,
        dueAt: dueAt ? new Date(dueAt) : null,
        metadata: enrichedMetadata
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });
    
    // Enrichir la réponse avec les champs virtuels
    const enrichedTask = {
      ...task,
      progress: enrichedMetadata.progress,
      priority: enrichedMetadata.priority,
      assignedById: enrichedMetadata.assignedById,
      assignedBy: null
    };
    
    return NextResponse.json(jsonSafe(enrichedTask), { status: 201 });
  } catch (e: any) {
    console.error('POST /api/tasks error:', e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.organizationId) {
      return NextResponse.json({ error: "Session requise" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, progress, title, description, priority, dueAt, assignToUserId } = body;
    
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    
    // Récupérer la tâche actuelle
    const currentTask = await prisma.task.findFirst({
      where: { id: BigInt(id), organizationId: session.organizationId }
    });
    
    if (!currentTask) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 });
    }
    
    const currentMetadata = (currentTask.metadata as any) || {};
    const updateData: any = { updatedAt: new Date() };
    const newMetadata = { ...currentMetadata };
    
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) {
      const newProgress = Math.min(100, Math.max(0, Number(progress)));
      newMetadata.progress = newProgress;
      // Si progress = 100, marquer comme done
      if (newProgress === 100) {
        updateData.status = 'done';
      } else if (newProgress > 0 && updateData.status !== 'done') {
        updateData.status = 'in_progress';
      }
    }
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (priority !== undefined) newMetadata.priority = priority;
    if (dueAt !== undefined) updateData.dueAt = dueAt ? new Date(dueAt) : null;
    if (assignToUserId !== undefined) updateData.userId = assignToUserId ? Number(assignToUserId) : null;
    
    updateData.metadata = newMetadata;
    
    await prisma.task.update({
      where: { id: BigInt(id) },
      data: updateData
    });
    
    const updatedTask = await prisma.task.findUnique({ 
      where: { id: BigInt(id) },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });
    
    // Enrichir la réponse
    const enrichedTask = {
      ...updatedTask,
      progress: newMetadata.progress || 0,
      priority: newMetadata.priority || 'normal',
      assignedById: newMetadata.assignedById || null,
      assignedBy: null
    };
    
    return NextResponse.json(jsonSafe(enrichedTask));
  } catch (e: any) {
    console.error('PATCH /api/tasks error:', e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.organizationId) {
      return NextResponse.json({ error: "Session requise" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    
    await prisma.taskRun.deleteMany({
      where: { taskId: BigInt(id) }
    });
    
    const result = await prisma.task.deleteMany({
      where: { 
        id: BigInt(id),
        organizationId: session.organizationId
      }
    });
    
    if (result.count === 0) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('DELETE /api/tasks error:', e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
