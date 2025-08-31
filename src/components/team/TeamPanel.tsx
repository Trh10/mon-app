"use client";

import { useEffect, useMemo, useState } from "react";
import { getRealtimeClient, getStableUserId } from "../../lib/realtime/provider";
import UserDrawer from "./UserDrawer";

type Role = "chef" | "manager" | "assistant" | "employe";
type Member = { id: string; name: string; role: Role; title: string; email: string; avatar?: string };

export default function TeamPanel({
  orgId = "company-1",
  currentUserName = "Moi",
  currentUserRole = "manager" as Role,
  onClose,
}: {
  orgId?: string;
  currentUserName?: string;
  currentUserRole?: Role;
  onClose: () => void;
}) {
  const rt = getRealtimeClient();
  const myId = useMemo(() => getStableUserId(), []);
  const room = `org:${orgId}`;

  const [directory, setDirectory] = useState<Member[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Member | null>(null);

  useEffect(() => {
    rt.setUser({ id: myId, name: currentUserName, role: currentUserRole });
    const offPresence = rt.subscribe(room, "presence", (msg) => {
      const members = (msg?.members || []) as Array<{ id: string }>;
      setOnlineIds(new Set(members.map((m) => m.id)));
    });
    return () => offPresence?.();
  }, [currentUserName, currentUserRole, myId, room, rt]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/team/directory", { cache: "no-store" });
      const data = await res.json();
      setDirectory(data?.items || []);
    })();
  }, []);

  const filtered = directory.filter((m) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return [m.name, m.email, m.title, m.role].some((x) => String(x).toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-white border-l border-gray-300 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="font-semibold">Équipe</div>
        <button onClick={onClose} className="px-2 py-1 rounded-md hover:bg-gray-100">✕</button>
      </div>

      <div className="p-3 border-b">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email, rôle, poste…"
          className="w-full border rounded-md px-2 py-1"
        />
      </div>

      <div className="p-3 overflow-auto">
        {filtered.length === 0 ? (
          <div className="text-sm text-gray-500">Aucun membre.</div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((m) => {
              const online = onlineIds.has(m.id);
              return (
                <li key={m.id}>
                  <button
                    onClick={() => setActive(m)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-left"
                  >
                    <span className={`w-2 h-2 rounded-full ${online ? "bg-green-500" : "bg-gray-300"}`} title={online ? "En ligne" : "Hors ligne"} />
                    <div className="flex-1">
                      <div className="font-medium">{m.name} <span className="text-xs text-gray-500">· {m.role}</span></div>
                      <div className="text-xs text-gray-500">{m.title} — {m.email}</div>
                    </div>
                    {online && <span className="text-xs text-green-600">En ligne</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {active && (
        <UserDrawer
          member={active}
          online={onlineIds.has(active.id)}
          onClose={() => setActive(null)}
          currentUser={{ id: myId, name: currentUserName, role: currentUserRole }}
        />
      )}
    </div>
  );
}