import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { addSharedFile, uploadsDir } from "../../../../lib/files/store";
import { hub } from "../../../../lib/realtime/hub";
import { addAudit } from "../../../../lib/audit/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    // Métadonnées d’acteur
    const actorId = String(form.get("actorId") || "");
    const actorName = String(form.get("actorName") || "");
    const actorRole = String(form.get("actorRole") || "employe");

    if (!actorId || !actorName) {
      return NextResponse.json({ error: "Missing actor" }, { status: 400 });
    }

    // Contexte
    const scope = (String(form.get("scope") || "room") as "room" | "direct");
    const room = String(form.get("room") || "");
    const toUserId = String(form.get("toUserId") || "");
    const message = form.get("message") ? String(form.get("message")) : undefined;

    const f = form.get("file");
    if (!f || !(f as any).arrayBuffer) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const file = f as File;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const createdAt = Date.now();
    const cleanName = path.basename(file.name || "fichier");
    const id = `f-${createdAt}-${Math.random().toString(36).slice(2, 8)}`;
    const filepath = path.join(uploadsDir(), `${id}__${cleanName}`);

    // Sauvegarde disque
    await fs.promises.writeFile(filepath, buffer);

    const record = addSharedFile({
      id,
      name: cleanName,
      size: buffer.length,
      mime: file.type || "application/octet-stream",
      filepath,
      url: `/api/files/download?id=${encodeURIComponent(id)}`,
      scope,
      room: scope === "room" ? room : undefined,
      toUserId: scope === "direct" ? toUserId : undefined,
      from: { id: actorId, name: actorName },
      message,
      createdAt,
    });

    // Diffusion temps réel
    const envelope = {
      user: { id: actorId, name: actorName, role: actorRole },
      payload: {
        id: record.id,
        name: record.name,
        size: record.size,
        mime: record.mime,
        url: record.url,
        message: record.message,
        scope: record.scope,
        toUserId: record.toUserId,
        room: record.room,
      },
      ts: createdAt,
    };

    if (scope === "room" && room) {
      hub.broadcast(room, "file", envelope);
    } else if (scope === "direct" && toUserId) {
      // Canal direct du destinataire
      hub.broadcast(`user:${toUserId}`, "file", envelope);
      // Optionnel: notifier aussi l’org (remplacer par votre org si besoin)
      hub.broadcast("org:company-1", "file", envelope);
    }

    // Audit
    addAudit({
      ts: createdAt,
      room: scope === "room" ? room : "direct",
      event: "file:upload",
      user: { id: actorId, name: actorName, role: actorRole },
      payload: { fileId: id, name: cleanName, size: buffer.length, scope, toUserId, room },
      summary:
        scope === "room"
          ? `${actorName} a partagé un fichier "${cleanName}" dans ${room}`
          : `${actorName} a envoyé un fichier "${cleanName}" à ${toUserId}`,
    });

    return NextResponse.json({ ok: true, file: record });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}