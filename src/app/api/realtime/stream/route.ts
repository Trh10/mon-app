import { NextRequest } from "next/server";
import { hub } from "../../../../lib/realtime/hub";

export const runtime = "nodejs";

function headers() {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const room = url.searchParams.get("room") ?? "default";
  const id = url.searchParams.get("id") ?? ("u-" + Math.random().toString(36).slice(2, 8));
  const name = url.searchParams.get("name") ?? "Anonyme";
  const role = (url.searchParams.get("role") as any) ?? "employe";

  const ts = new TransformStream();
  const writer = ts.writable.getWriter();
  const enc = new TextEncoder();
  const send = (event: string, data: any) => {
    writer.write(enc.encode(`event: ${event}\n`));
    writer.write(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const unsubscribe = hub.addClient(room, id, { id, name, role }, send);
  send("presence:state", { members: hub.members(room) });

  const hb = setInterval(() => send("heartbeat", { t: Date.now() }), 25000);
  const close = () => { clearInterval(hb); try { unsubscribe(); } catch {}; try { writer.close(); } catch {}; };

  // Close on client abort
  (req as any).signal?.addEventListener?.("abort", close);

  return new Response(ts.readable, { headers: headers() });
}
