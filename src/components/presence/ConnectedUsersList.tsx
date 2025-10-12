"use client";
import { useEffect, useState } from "react";
import { getRealtimeClient } from "@/lib/realtime/provider";

type Member = { id: string; name: string; role: string };

export default function ConnectedUsersList({ room, self }: { room: string; self: Member }) {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    const rt = getRealtimeClient();
    rt.connect(room, self.id, self.name, self.role);

    const offState = rt.on("presence:state", (d) => setMembers(d.members || []));
    const offJoin = rt.on("presence:join", (d) => setMembers(d.members || []));
    const offLeave = rt.on("presence:leave", (d) => setMembers(d.members || []));

    return () => { offState(); offJoin(); offLeave(); rt.disconnect(); };
  }, [room, self.id, self.name, self.role]);

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {members.map((m) => (
        <span key={m.id} className="px-2 py-1 rounded bg-green-100 border">{m.name} • {m.role}</span>
      ))}
      {members.length === 0 && <span className="text-gray-500">Aucun membre en ligne</span>}
    </div>
  );
}
