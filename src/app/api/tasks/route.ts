import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonSafe } from "@/lib/json";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.organizationId) {
      return NextResponse.json({ error: "Session requise" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    
    const where: any = { organizationId: session.organizationId };
    if (userIdParam) {
      where.userId = Number(userIdParam);
    }
    
    const items = await prisma.task.findMany({ 
      where, 
      orderBy: { createdAt: "desc" } 
    });
    
    return NextResponse.json(jsonSafe(items));
  } catch (e: any) {
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
    const { title, description, dueAt, metadata = {} } = body;
    
    const task = await prisma.task.create({ 
      data: { 
        organizationId: session.organizationId,
        userId: session.userId ?? null, 
        title, 
        description, 
        dueAt: dueAt ? new Date(dueAt) : null, 
        metadata 
      } 
    });
    
    return NextResponse.json(jsonSafe(task), { status: 201 });
  } catch (e: any) {
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
    const { id, status } = body;
    
    // Vérifier que la tâche appartient à l'org
    const task = await prisma.task.updateMany({
      where: { 
        id: BigInt(id),
        organizationId: session.organizationId
      },
      data: { status }
    });
    
    if (task.count === 0) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 });
    }
    
    // Log dans TaskRun
    await prisma.taskRun.create({
      data: {
        taskId: BigInt(id),
        runType: "manual",
        result: "ok",
        message: `Statut changé vers: ${status}`
      }
    });
    
    const updatedTask = await prisma.task.findUnique({ where: { id: BigInt(id) } });
    return NextResponse.json(jsonSafe(updatedTask));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
