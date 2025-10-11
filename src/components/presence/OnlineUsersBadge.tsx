"use client";

import { useEffect, useMemo, useState } from "react";
import { getRealtimeClient, getStableUserId } from "@/lib/realtime/provider";
import { useCodeAuth } from "@/components/auth/CodeAuthContext";

type Member = { id: string; name: string; role: string };

export default function OnlineUsersBadge({ className = "" }: { className?: string }) {
  const { user } = useCodeAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const rt = getRealtimeClient();

  const self = useMemo(() => {
    const id = user?.id || getStableUserId();
    const name = user?.name || "Anonyme";
    const role = (user?.role as any) || "employe";
    return { id, name, role };
  }, [user?.id, user?.name, user?.role]);

  // Utiliser exactement la même room que CollabPanel/Sidebar
  const room = useMemo(() => `company:${user?.companyId || user?.company || "default"}:main`, [user?.companyId, user?.company]);

  useEffect(() => {
    rt.connect(room, self.id, self.name, self.role);
    const offState = rt.on("presence:state", (d: any) => setMembers(d.members || []));
    const offJoin = rt.on("presence:join", (d: any) => setMembers(d.members || []));
    const offLeave = rt.on("presence:leave", (d: any) => setMembers(d.members || []));
    return () => { offState(); offJoin(); offLeave(); /* ne pas disconnect pour laisser les autres widgets */ };
  }, [room, self.id, self.name, self.role]);

  const count = members.length;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 text-white ${className}`} title="Utilisateurs en ligne">
      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
      <span className="text-sm font-medium">{count}</span>
    </div>
  );
}
