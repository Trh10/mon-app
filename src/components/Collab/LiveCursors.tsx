"use client";

import { useEffect, useRef, useState } from "react";
import { getRealtimeClient } from "../../lib/realtime/provider";

// Type local
type Role = "chef" | "manager" | "assistant" | "employe";

type Cursor = {
  userId: string;
  name: string;
  role: Role;
  x: number; // 0..1
  y: number; // 0..1
};

function hashColor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 80% 45%)`;
}

export default function LiveCursors({
  roomId,
  userId,
  userName,
  role = "employe" as Role,
}: {
  roomId: string;
  userId: string;
  userName: string;
  role?: Role;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rt = getRealtimeClient();
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const [self, setSelf] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  useEffect(() => {
    rt.setUser({ id: userId, name: userName, role });

    const offPresence = rt.subscribe(`room:${roomId}`, "presence", (msg) => {
      const type = msg?.type;
      const members = (msg?.members || []) as Array<{ id: string; name: string; role: Role }>;
      if (type === "state" || type === "join" || type === "leave") {
        setCursors((prev) => {
          const next: Record<string, Cursor> = {};
          for (const m of members) {
            if (m.id === userId) continue;
            next[m.id] = prev[m.id] || { userId: m.id, name: m.name, role: m.role, x: 0.5, y: 0.5 };
          }
          return next;
        });
      }
    });

    const offCursor = rt.subscribe(`room:${roomId}`, "cursor", (env) => {
      const u = env?.user;
      const p = env?.payload;
      if (!u?.id || u.id === userId) return;
      setCursors((prev) => ({
        ...prev,
        [u.id]: {
          userId: u.id,
          name: u.name,
          role: u.role,
          x: Number(p?.x ?? 0.5),
          y: Number(p?.y ?? 0.5),
        },
      }));
    });

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(async () => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
        setSelf({ x, y }); // Affichage local immédiat
        await rt.sendCursor(`room:${roomId}`, x, y); // Envoi aux autres
      });
    };
    const el = containerRef.current;
    el?.addEventListener("mousemove", onMove);

    return () => {
      offPresence?.();
      offCursor?.();
      el?.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [roomId, role, rt, userId, userName]);

  return (
    <div ref={containerRef} style={{ position: "relative", border: "1px solid #e5e7eb", borderRadius: 8, height: 280, userSelect: "none" }}>
      <div style={{ position: "absolute", inset: 0, padding: 8, color: "#6b7280", pointerEvents: "none" }}>
        Bouge ta souris ici pour partager ta position.
        {Object.keys(cursors).length === 0 ? " (Tu vois ton curseur « Moi » même si tu es seul)" : " Les autres verront ton curseur et tu verras les leurs."}
      </div>

      {/* Ton propre curseur (local preview) */}
      <div
        style={{
          position: "absolute",
          left: `${self.x * 100}%`,
          top: `${self.y * 100}%`,
          transform: "translate(-2px, -18px)",
          pointerEvents: "none",
        }}
      >
        <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "10px solid #2563eb", filter: "drop-shadow(0 1px 1px rgba(0,0,0,.2))" }} />
        <div style={{ background: "#2563eb", color: "white", padding: "2px 6px", borderRadius: 6, fontSize: 12, marginTop: 2, whiteSpace: "nowrap" }}>
          Moi · {role}
        </div>
      </div>

      {/* Cursors des autres */}
      {Object.values(cursors).map((c) => {
        const color = hashColor(c.userId);
        return (
          <div key={c.userId} style={{ position: "absolute", left: `${c.x * 100}%`, top: `${c.y * 100}%`, transform: "translate(-2px, -18px)", pointerEvents: "none" }}>
            <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `10px solid ${color}`, filter: "drop-shadow(0 1px 1px rgba(0,0,0,.2))" }} />
            <div style={{ background: color, color: "white", padding: "2px 6px", borderRadius: 6, fontSize: 12, marginTop: 2, whiteSpace: "nowrap" }}>
              {c.name} · {c.role}
            </div>
          </div>
        );
      })}
    </div>
  );
}