"use client";

import { useEffect, useState } from "react";

type Role = "chef" | "manager" | "assistant" | "employe";
type Member = { id: string; name: string; role: Role; title: string; email: string };

export default function MemberPicker({
  onSelect,
  onClose,
  title = "Choisir un destinataire",
}: {
  onSelect: (m: Member) => void;
  onClose: () => void;
  title?: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/team/directory", { cache: "no-store" });
      const data = await res.json();
      setMembers(data?.items || []);
    })();
  }, []);

  const filtered = members.filter((m) => {
    const s = q.toLowerCase().trim();
    if (!s) return true;
    return [m.name, m.email, m.title, m.role].some((x) => String(x).toLowerCase().includes(s));
  });

  return (
    <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onClose}>
      <div
        className="absolute left-1/2 top-16 -translate-x-1/2 w-[420px] bg-white rounded-lg shadow-xl border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="px-2 py-1 rounded hover:bg-gray-100">✕</button>
        </div>
        <div className="p-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par nom, email, rôle…"
            className="w-full border rounded px-2 py-1 mb-2"
          />
          <ul className="max-h-72 overflow-auto">
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => { onSelect(m); onClose(); }}
                  className="w-full text-left p-2 rounded hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                  <div className="flex-1">
                    <div className="font-medium">{m.name} <span className="text-xs text-gray-500">· {m.role}</span></div>
                    <div className="text-xs text-gray-500">{m.title} — {m.email}</div>
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="text-sm text-gray-500 p-2">Aucun résultat</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}