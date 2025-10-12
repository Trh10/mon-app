import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonSafe } from "@/lib/json";
import { getSession } from "@/lib/session";

type Status = "pending" | "in-progress" | "completed" | "cancelled";
type Priority = "low" | "medium" | "high" | "urgent";

function getCompanyId(req: NextRequest): string {
  const url = new URL(req.url);
  return url.searchParams.get("companyId") || "default";
}

function mapStatusToDB(status: Status | undefined): string {
  switch (status) {
    case "in-progress": return "in_progress";
    case "completed": return "done";
    case "cancelled": return "cancelled";
    case "pending":
    default: return "pending";
  }
}

function mapStatusFromDB(status: string | null | undefined): Status {
  switch (status) {
    case "in_progress": return "in-progress";
    case "done": return "completed";
    case "cancelled": return "cancelled";
    case "pending":
    default: return "pending";
  }
}

function shapeTask(t: any, companyId: string) {
  const meta = (t?.metadata as any) || {};
  return {
    id: String(t.id),
    companyId: meta.companyId ?? companyId ?? "default",
    title: t.title,
    description: t.description ?? "",
    assignedTo: meta.assignedTo,
    assignedBy: meta.assignedBy,
    priority: (meta.priority ?? "medium") as Priority,
    status: mapStatusFromDB(t.status),
    isPrivate: !!meta.isPrivate,
    dueDate: t.dueAt ? new Date(t.dueAt).toISOString() : undefined,
    createdAt: new Date(t.createdAt).toISOString(),
    updatedAt: new Date(t.updatedAt).toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session.organizationId) {
    return NextResponse.json(
      { success: false, error: "Organisation non sélectionnée" },
      { status: 401 }
    );
  }
  const companyId = getCompanyId(req);
  const url = new URL(req.url);
  const assignedTo = url.searchParams.get("assignedTo") || undefined;
  const userId = url.searchParams.get("userId") || undefined;
  // Fetch recent tasks; filter in-memory for metadata-based fields
  const tasks = await prisma.task.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const shaped = tasks.map((t: any) => shapeTask(t, companyId));
  const filtered = shaped.filter((t: any) => {
    if (t.companyId !== companyId) return false;
    if (assignedTo && t.assignedTo !== assignedTo) return false;
    if (userId && t.assignedTo !== userId) return false;
    return true;
  });
  return NextResponse.json(jsonSafe({ success: true, tasks: filtered }));
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session.organizationId) {
    return NextResponse.json(
      { success: false, error: "Organisation non sélectionnée" },
      { status: 401 }
    );
  }
  const companyId = getCompanyId(req);
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, error: "Bad JSON" }, { status: 400 });

  const action = body.action || "create";

  switch (action) {
    case "create": {
      if (!body.title) return NextResponse.json({ success: false, error: "Title required" }, { status: 400 });
      const created = await prisma.task.create({
        data: {
          organizationId: session.organizationId,
          userId: session.userId ?? null,
          title: body.title,
          description: body.description || "",
          status: mapStatusToDB("pending"),
          dueAt: body.dueDate ? new Date(body.dueDate) : null,
          metadata: {
            companyId,
            assignedTo: body.assignedTo || null,
            assignedBy: body.assignedBy || null,
            priority: (body.priority || "medium") as Priority,
            isPrivate: !!body.isPrivate,
          },
        },
      });
      return NextResponse.json(jsonSafe({ success: true, task: shapeTask(created, companyId) }));
    }
    case "update": {
      if (!body.id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
      const id = BigInt(body.id);
      const existing = await prisma.task.findUnique({ where: { id } });
      if (!existing || existing.organizationId !== session.organizationId) {
        return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
      }
      const meta = { ...(existing.metadata as any) };
      if (body.assignedTo !== undefined) meta.assignedTo = body.assignedTo;
      if (body.assignedBy !== undefined) meta.assignedBy = body.assignedBy;
      if (body.priority !== undefined) meta.priority = body.priority;
      if (body.isPrivate !== undefined) meta.isPrivate = !!body.isPrivate;
      const updated = await prisma.task.update({
        where: { id },
        data: {
          title: body.title ?? existing.title,
          description: body.description ?? existing.description,
          dueAt: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : existing.dueAt,
          metadata: meta,
        },
      });
      return NextResponse.json(jsonSafe({ success: true, task: shapeTask(updated, companyId) }));
    }
    case "status": {
      if (!body.id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
      const id = BigInt(body.id);
      const existing = await prisma.task.findUnique({ where: { id } });
      if (!existing || existing.organizationId !== session.organizationId) {
        return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
      }
      const updated = await prisma.task.update({
        where: { id },
        data: { status: mapStatusToDB(body.status as Status) },
      });
      return NextResponse.json(jsonSafe({ success: true, task: shapeTask(updated, companyId) }));
    }
    case "cancel": {
      if (!body.id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
      const id = BigInt(body.id);
      const existing = await prisma.task.findUnique({ where: { id } });
      if (!existing || existing.organizationId !== session.organizationId) {
        return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
      }
      const updated = await prisma.task.update({ where: { id }, data: { status: "cancelled" } });
      return NextResponse.json(jsonSafe({ success: true, task: shapeTask(updated, companyId) }));
    }
    case "delete": {
      if (!body.id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
      const id = BigInt(body.id);
      const existing = await prisma.task.findUnique({ where: { id } });
      if (!existing || existing.organizationId !== session.organizationId) {
        return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
      }
      const removed = await prisma.task.delete({ where: { id } });
      return NextResponse.json(jsonSafe({ success: true, removed: shapeTask(removed, companyId) }));
    }
    default:
      return NextResponse.json({ success: false, error: "Unsupported action" }, { status: 400 });
  }
}
