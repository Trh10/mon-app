import { NextRequest, NextResponse } from "next/server";
import { hub } from "../../../../lib/realtime/hub";
import { addAudit } from "../../../../lib/audit/store";
import { addChatMessage, dmRoom } from "../../../../lib/realtime/chatStore";

// Définition locale des rôles/permissions
type Role = "chef" | "manager" | "assistant" | "employe";
type Action =
  | "send_chat"
  | "update_cursor"
  | "assign_role"
  | "view_audit"
  | "manage_project";

const roleMatrix: Record<Role, Action[]> = {
  chef: ["send_chat", "update_cursor", "assign_role", "view_audit", "manage_project"],
  manager: ["send_chat", "update_cursor", "assign_role", "view_audit"],
  assistant: ["send_chat", "update_cursor", "view_audit"],
  employe: ["send_chat", "update_cursor"],
};

function can(role: Role, action: Action) {
  return roleMatrix[role]?.includes(action) ?? false;
}

function actionFromEvent(event: string): Action | null {
  switch (event) {
    case "chat": return "send_chat";
    case "dm": return "send_chat"; // DM = chat privé
    case "cursor": return "update_cursor";
    case "assign_role": return "assign_role";
    case "audit:view": return "view_audit";
    case "project:manage": return "manage_project";
    default: return null;
  }
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { room = "default", event, payload = {}, user } = body || {};
    if (!event || !user?.id || !user?.name || !user?.role) {
      return NextResponse.json({ error: "Missing event or user" }, { status: 400 });
    }

    const action = actionFromEvent(event);
    if (action && !can(user.role as Role, action)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = Date.now();

    // Chat public (room)
    if (event === "chat") {
      const id = String(payload?.id || `${now}-${Math.random().toString(36).slice(2, 8)}`);
      const text = String(payload?.text || "").slice(0, 2000);
      const replyTo = payload?.replyTo ? String(payload.replyTo) : undefined;
      const reactions = payload?.reactions || {};
      
      addChatMessage(room, { 
        id, 
        room, 
        user, 
        text, 
        ts: now, 
        replyTo,
        reactions 
      });

      hub.broadcast(room, "chat", { 
        user, 
        payload: { id, text, replyTo, reactions }, 
        ts: now 
      });

      addAudit({
        ts: now, room, event: "chat", user,
        payload: { id, text, replyTo },
        summary: `${user.name} a envoyé un message: "${text.slice(0, 60)}"`,
      });
      return NextResponse.json({ ok: true });
    }

    // Réactions sur les messages
    if (event === "reaction") {
      const messageId = String(payload?.messageId || "");
      const emoji = String(payload?.emoji || "");
      const action = String(payload?.action || "add"); // "add" ou "remove"
      
      if (!messageId || !emoji) {
        return NextResponse.json({ error: "Missing messageId or emoji" }, { status: 400 });
      }

      hub.broadcast(room, "reaction", { 
        user, 
        payload: { messageId, emoji, action }, 
        ts: now 
      });

      addAudit({
        ts: now, room, event: "reaction", user,
        payload: { messageId, emoji, action },
        summary: `${user.name} a ${action === "add" ? "ajouté" : "retiré"} la réaction ${emoji}`,
      });
      return NextResponse.json({ ok: true });
    }

    // Indicateurs de frappe
    if (event === "typing") {
      const typing = Boolean(payload?.typing);
      
      // Diffuser seulement aux autres utilisateurs (pas à soi-même)
      hub.broadcast(room, "typing", { 
        user, 
        payload: { typing }, 
        ts: now 
      });
      
      // Pas d'audit pour les indicateurs de frappe (trop verbeux)
      return NextResponse.json({ ok: true });
    }

    // Chat privé (DM)
    if (event === "dm") {
      const toUserId = String(payload?.toUserId || "");
      const id = String(payload?.id || `${now}-${Math.random().toString(36).slice(2, 8)}`);
      const text = String(payload?.text || "").slice(0, 2000);
      if (!toUserId || !text) {
        return NextResponse.json({ error: "Missing toUserId or text" }, { status: 400 });
      }
      const dmKey = dmRoom(user.id, toUserId);

      addChatMessage(dmKey, { id, room: dmKey, user, text, ts: now });

      // Diffusion dans la room DM (si l’autre a ouvert la même conversation)
      hub.broadcast(dmKey, "dm", { user, payload: { id, text, toUserId }, ts: now });
      // Et diffusion sur le canal personnel du destinataire (pour notification/consommation hors DM ouvert)
      hub.broadcast(`user:${toUserId}`, "dm", { user, payload: { id, text, toUserId }, ts: now });

      addAudit({
        ts: now, room: dmKey, event: "dm", user,
        payload: { id, text, toUserId },
        summary: `${user.name} a envoyé un message privé à ${toUserId}: "${text.slice(0, 60)}"`,
      });
      return NextResponse.json({ ok: true });
    }

    // Autres événements
    const envelope = { user, payload, ts: now };
    hub.broadcast(room, event, envelope);
    addAudit({
      ts: envelope.ts,
      room,
      event,
      user,
      payload: sanitizePayload(event, payload),
      summary: summarize(event, user, payload),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}

function sanitizePayload(event: string, payload: any) {
  if (event === "chat") {
    return { id: payload?.id, text: String(payload?.text || "").slice(0, 300) };
  }
  if (event === "cursor") return { x: Number(payload?.x), y: Number(payload?.y) };
  return payload ?? {};
}

function summarize(event: string, user: any, payload: any) {
  if (event === "chat") return `${user.name} a envoyé un message: "${String(payload?.text || "").slice(0, 60)}"`;
  if (event === "cursor") return `${user.name} a bougé son curseur`;
  return `${user.name} a effectué l'action "${event}"`;
}