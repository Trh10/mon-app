import { NextRequest, NextResponse } from "next/server";
import { hub } from "../../../../lib/realtime/hub";
import { addChatMessage, dmRoom } from "../../../../lib/realtime/chatStore";
import { prisma } from "@/lib/db";
import { jsonSafe } from "@/lib/json";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { room = "default", event, payload = {}, user } = body || {};
    
    if (!event || !user?.id || !user?.name || !user?.role) {
      return NextResponse.json({ error: "Missing event or user" }, { status: 400 });
    }

    const now = Date.now();
    const session = await getSession(req);
    // Fallback: si la session n'est pas encore attachée (ex: après redeploy),
    // tenter d'inférer organizationId via userId présent dans payload.user
    let organizationId = session.organizationId;
    let dbUserId = session.userId;
    if (!organizationId && user?.id) {
      try {
        const u = await prisma.user.findFirst({ where: { id: Number(user.id) }, select: { id: true, organizationId: true } });
        if (u) { organizationId = u.organizationId; dbUserId = u.id; }
      } catch {}
    }

    // Chat public (room)
    if (event === "chat") {
      const id = String(payload?.id || `${now}-${Math.random().toString(36).slice(2, 8)}`);
      const text = String(payload?.text || "").slice(0, 2000);
      const replyTo = payload?.replyTo ? String(payload.replyTo) : undefined;
      const reactions = payload?.reactions || {};
      
      // Stocker dans le store mémoire
      addChatMessage(room, { 
        id, 
        room, 
        user, 
        text, 
        ts: now, 
        replyTo,
        reactions 
      });

      // Broadcast temps réel
      hub.broadcast(room, "chat", { 
        user, 
        payload: { id, text, replyTo, reactions }, 
        ts: now 
      });

      // Persister dans PostgreSQL si organisation connue
      if (organizationId) {
        try {
          await prisma.message.create({
            data: {
              organizationId: organizationId,
              userId: dbUserId ?? null,
              kind: 'user',
              // 'room' est déjà préfixé par le client (ex: 'room:general')
              channel: room,
              content: text,
              metadata: jsonSafe({ id, replyTo, user })
            }
          });
        } catch (dbError) {
          console.error("Failed to persist chat message:", dbError);
        }
      }

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

      // Stocker dans le store mémoire
      addChatMessage(dmKey, { id, room: dmKey, user, text, ts: now });

      // Broadcast dans la room DM
      hub.broadcast(dmKey, "dm", { user, payload: { id, text, toUserId }, ts: now });
      
      // Broadcast aussi sur le canal personnel du destinataire
      hub.broadcast(`user:${toUserId}`, "dm", { user, payload: { id, text, toUserId }, ts: now });

      // Persister dans PostgreSQL
      if (organizationId) {
        try {
          await prisma.message.create({
            data: {
              organizationId: organizationId,
              userId: dbUserId ?? null,
              kind: 'user',
              // dmKey est déjà sous la forme 'dm:a:b'
              channel: dmKey,
              content: text,
              metadata: jsonSafe({ id, toUserId, fromUserId: user.id, user })
            }
          });
        } catch (dbError) {
          console.error("Failed to persist DM:", dbError);
        }
      }

      return NextResponse.json({ ok: true });
    }

    // Réactions
    if (event === "reaction") {
      const messageId = String(payload?.messageId || "");
      const emoji = String(payload?.emoji || "");
      const action = String(payload?.action || "add");
      
      if (!messageId || !emoji) {
        return NextResponse.json({ error: "Missing messageId or emoji" }, { status: 400 });
      }

      hub.broadcast(room, "reaction", { 
        user, 
        payload: { messageId, emoji, action }, 
        ts: now 
      });

      return NextResponse.json({ ok: true });
    }

    // Indicateurs de frappe
    if (event === "typing") {
      const typing = Boolean(payload?.typing);
      
      hub.broadcast(room, "typing", { 
        user, 
        payload: { typing }, 
        ts: now 
      });
      
      return NextResponse.json({ ok: true });
    }

    // Autres événements (par défaut)
    hub.broadcast(room, event, { user, payload, ts: now });
    return NextResponse.json({ ok: true });

  } catch (e: any) {
    console.error("Realtime emit error:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}
