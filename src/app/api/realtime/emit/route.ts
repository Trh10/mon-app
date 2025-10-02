import { NextRequest, NextResponse } from "next/server";
import { hub } from "../../../../lib/realtime/hub";
import { appendJSONArray } from "@/lib/serverlessStorage";
import { prisma } from "@/lib/db";
import { jsonSafe } from "@/lib/json";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.room || !body?.event) {
      return NextResponse.json({ ok: false, error: "Missing room/event" }, { status: 400 });
    }
    
    const session = await getSession(req);
    const payload = body.data ?? {};
    hub.broadcast(body.room, body.event, payload);

    // Persistance: Message en base (Prisma) avec organizationId
    try {
      if (!session.organizationId) {
        // Ne rien faire si aucune organisation n'est dans la session
        // On pourrait aussi logger une erreur ici
        return NextResponse.json({ ok: true, note: "Message broadcasted but not persisted. No organization in session." });
      }

      if (body.event === 'chat' || body.event === 'dm') {
        const content = typeof payload?.text === 'string' ? payload.text : JSON.stringify(payload);
        await prisma.message.create({
          data: {
            organizationId: session.organizationId,
            userId: payload?.userId ?? session.userId ?? null,
            kind: payload?.system ? 'system' : 'user',
            channel: `room:${body.room}`,
            content,
            metadata: jsonSafe({ type: body.event, payload })
          }
        });
        // Le fallback sur disque n'est probablement plus nécessaire, mais on le laisse pour l'instant
        appendJSONArray(`realtime/${body.room}/messages.json`, { type: body.event, payload, ts: Date.now() }, 500);
      }
    } catch (dbError) {
      console.error("Realtime persistence error:", dbError);
      // Ne pas bloquer la réponse même si la DB échoue
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
}
