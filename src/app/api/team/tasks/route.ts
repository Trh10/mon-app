import { NextRequest, NextResponse } from "next/server";
import { listTasksByUser, addTask } from "../../../../lib/tasks/store";
import { addAudit } from "../../../../lib/audit/store";
import { hub } from "../../../../lib/realtime/hub";
import { dmRoom } from "../../../../lib/realtime/chatStore";

// Type local pour éviter les soucis d'import
type Role = "chef" | "manager" | "assistant" | "employe";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || "";
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  return NextResponse.json({ items: listTasksByUser(userId) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // actor = l'utilisateur qui effectue l'action (ex: chef ou employé)
    const actor = body?.actor as { id: string; name: string; role: Role } | undefined;
    const assigneeId = String(body?.userId || "");
    const title = String(body?.title || "").trim();
    const project = String(body?.project || "").trim();
    const dueDate = body?.dueDate ? String(body.dueDate) : ""; // "YYYY-MM-DD"
    const dueTime = body?.dueTime ? String(body.dueTime) : ""; // "HH:mm"
    const dueText = body?.dueText ? String(body.dueText) : ""; // "lundi", "demain 14:00", "14h"

    if (!actor?.id || !actor?.name || !actor?.role) {
      return NextResponse.json({ error: "Missing actor" }, { status: 400 });
    }
    // Autorisation:
    // - chef: peut assigner à n'importe qui
    // - autre rôle: uniquement à lui-même
    const isChef = actor.role === "chef";
    const isSelf = actor.id === assigneeId;
    if (!isChef && !isSelf) {
      return NextResponse.json({ error: "Forbidden: only chef can assign to others" }, { status: 403 });
    }
    if (!assigneeId || !title || !project) {
      return NextResponse.json({ error: "Missing userId/title/project" }, { status: 400 });
    }

    const dueAt = parseDue({ dueDate, dueTime, dueText });

    const task = addTask({
      userId: assigneeId,
      title,
      project,
      createdBy: { id: actor.id, name: actor.name },
      dueAt,
    });

    const now = Date.now();

    // Audit
    addAudit({
      ts: now,
      room: "team",
      event: "task:create",
      user: { id: actor.id, name: actor.name, role: actor.role },
      payload: { taskId: task.id, assigneeId, title, project, dueAt },
      summary: `${actor.name} a assigné "${title}" (${project}) à ${assigneeId}${dueAt ? ` (échéance ${new Date(dueAt).toLocaleString()})` : ""}`,
    });

    // Diffusion temps réel au canal privé chef<->assignee et au canal personnel du destinataire
    const dmKey = dmRoom(actor.id, assigneeId);
    const envelope = {
      user: { id: actor.id, name: actor.name, role: actor.role },
      payload: { task },
      ts: now,
    };
    hub.broadcast(dmKey, "task", envelope);
    hub.broadcast(`user:${assigneeId}`, "task", envelope);

    return NextResponse.json({ ok: true, task });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}

// Parsing simple d'échéances en français
function parseDue({
  dueDate,
  dueTime,
  dueText,
}: {
  dueDate?: string;
  dueTime?: string;
  dueText?: string;
}): number | null {
  const now = new Date();
  const toTs = (d: Date) => d.getTime();

  // 1) Champs structurés
  if (dueDate || dueTime) {
    const d = new Date();
    if (dueDate) {
      const [y, m, dd] = dueDate.split("-").map((n) => parseInt(n, 10));
      d.setFullYear(y, (m || 1) - 1, dd || 1);
    }
    if (dueTime) {
      const mtch = dueTime.match(/^(\d{1,2})(?::(\d{2}))?$/);
      if (mtch) {
        const hh = Math.min(23, parseInt(mtch[1], 10));
        const mm = Math.min(59, parseInt(mtch[2] || "0", 10));
        d.setHours(hh, mm, 0, 0);
      }
    } else {
      d.setHours(17, 0, 0, 0);
    }
    return toTs(d);
  }

  // 2) Texte libre simple
  const txt = (dueText || "").toLowerCase().trim();
  if (!txt) return null;

  const timeMatch = txt.match(/\b(\d{1,2})(?:[:h](\d{2}))?\b/);
  const days = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  const dayIdx = days.findIndex((d) => txt.includes(d));

  const d = new Date();
  d.setSeconds(0, 0);

  if (txt.includes("aujourd")) {
    // aujourd'hui
  } else if (txt.includes("apres") || txt.includes("après")) {
    d.setDate(d.getDate() + 2);
  } else if (txt.includes("demain")) {
    d.setDate(d.getDate() + 1);
  } else if (dayIdx >= 0) {
    const today = now.getDay();
    let delta = dayIdx - today;
    if (delta <= 0) delta += 7;
    d.setDate(d.getDate() + delta);
  }

  if (timeMatch) {
    const hh = Math.min(23, parseInt(timeMatch[1], 10));
    const mm = Math.min(59, parseInt(timeMatch[2] || "0", 10));
    d.setHours(hh, mm, 0, 0);
  } else {
    d.setHours(17, 0, 0, 0);
  }
  return toTs(d);
}