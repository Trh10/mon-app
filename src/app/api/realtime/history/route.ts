import { NextRequest, NextResponse } from "next/server";
import { listChatMessages } from "../../../../lib/realtime/chatStore";
import { readJSON } from "@/lib/serverlessStorage";
import { getFirestoreIfAvailable } from "../../../../lib/firebase-admin";
import { prisma } from "@/lib/db";
import { jsonSafe } from "@/lib/json";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room") || "default";
  const limit = Number(searchParams.get("limit") || 200);
  const safeLimit = isFinite(limit) ? limit : 200;
  
  const session = await getSession(req);
  
  // Déterminer si c'est un DM ou un room
  // room est déjà préfixé par le client ("room:..." ou "dm:...")
  const channel = room;
  
  // 1) Try Prisma-backed history first (filtré par org si session)
  try {
    const where: any = { channel };
    if (session.organizationId) {
      where.organizationId = session.organizationId;
    }
    
    const items = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: safeLimit,
    });
    if (items && items.length > 0) {
      // Transformer les messages Prisma au format attendu par le client
      const transformed = items.map(msg => {
        const meta = typeof msg.metadata === 'object' ? msg.metadata : {};
        return {
          id: (meta as any).id || msg.id,
          text: msg.content,
          user: (meta as any).user || { id: msg.userId || '', name: 'Utilisateur', role: '' },
          ts: msg.createdAt.getTime(),
          replyTo: (meta as any).replyTo,
          reactions: (meta as any).reactions || {}
        };
      }).reverse();
      return NextResponse.json({ items: jsonSafe(transformed) });
    }
  } catch {}
  const db = getFirestoreIfAvailable();
  if (db) {
    // Essayer d'abord sur le champ "timestamp" (nouveau), sinon fallback "ts"
    let snap;
    try {
      snap = await db
        .collection("realtime_rooms")
        .doc(room)
        .collection("messages")
        .orderBy("timestamp", "desc")
        .limit(safeLimit)
        .get();
    } catch {
      snap = await db
        .collection("realtime_rooms")
        .doc(room)
        .collection("messages")
        .orderBy("ts", "desc")
        .limit(safeLimit)
        .get();
    }
  const items = snap.docs.map((d: { data: () => any }) => d.data());
    return NextResponse.json({ items: items.reverse() });
  }
  const items = listChatMessages(room, safeLimit);
  if (items.length > 0) return NextResponse.json({ items });
  // Fallback: lire depuis le stockage serverless si présent
  try {
    const disk = readJSON<any[]>(`realtime/${room}/messages.json`, []);
    return NextResponse.json({ items: disk.slice(-safeLimit) });
  } catch {
    return NextResponse.json({ items: [] });
  }
}