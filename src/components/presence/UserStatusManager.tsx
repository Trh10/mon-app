"use client";
import { useMemo, useState } from "react";
import { getRealtimeClient } from "@/lib/realtime/provider";

type NewProps = { self: { id: string; name: string; role: string }; room: string };
type LegacyProps = { userId: string; userName: string; roomId: string; onStatusChange?: (s: string)=>void };

export default function UserStatusManager(props: NewProps | LegacyProps) {
  // Normalize props (support both shapes)
  const { self, room } = useMemo(() => {
    if ((props as any).self) {
      const p = props as NewProps;
      return { self: p.self, room: p.room };
    } else {
      const p = props as LegacyProps;
      return { self: { id: p.userId, name: p.userName, role: "employe" }, room: p.roomId };
    }
  }, [props]);
  const [status, setStatus] = useState<"online"|"away"|"busy"|"offline">("online");
  const rt = getRealtimeClient();

  function update(s: "online"|"away"|"busy"|"offline") {
    setStatus(s);
    rt.emit("status", { id: self.id, name: self.name, status: s });
    if ((props as any).onStatusChange) try { (props as any).onStatusChange(s); } catch {}
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">Statut:</span>
      <select className="border rounded px-2 py-1" value={status} onChange={(e)=>update(e.target.value as any)}>
        <option value="online">En ligne</option>
        <option value="away">Absent</option>
        <option value="busy">Occupé</option>
        <option value="offline">Hors ligne</option>
      </select>
    </div>
  );
}
