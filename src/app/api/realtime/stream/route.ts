import { NextRequest } from "next/server";
import { hub } from "../../../../lib/realtime/hub";

// Définition locale du type Role pour éviter l'import introuvable
type Role = "chef" | "manager" | "assistant" | "employe";

export const runtime = "nodejs";

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room") || "default";
  const id = searchParams.get("id") || `u-${Math.random().toString(36).slice(2, 8)}`;
  const name = searchParams.get("name") || "Anonyme";
  const role = (searchParams.get("role") as Role) || "employe";

  const ts = new TransformStream();
  const writer = ts.writable.getWriter();
  const enc = new TextEncoder();

  const send = async (event: string, data: any) => {
    const line = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(enc.encode(line));
  };

  const clientId = hub.addClient(room, { id, name, role }, send);
  await send("presence", { type: "state", members: hub.members(room) });
  await send("ready", { ok: true, room });

  const heartbeat = setInterval(() => {
    writer.write(enc.encode(`event: ping\ndata: {}\n\n`));
  }, 20000);

  req.signal.addEventListener("abort", () => {
    clearInterval(heartbeat);
    hub.removeClient(room, clientId);
    writer.close().catch(() => {});
  });

  return new Response(ts.readable, { headers: sseHeaders() });
}