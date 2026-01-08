"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { getRealtimeClient, getStableUserId } from "@/lib/realtime/provider";
import { useCodeAuth } from "@/components/auth/CodeAuthContext";

type Member = { id: string; name: string; role: string };

export default function OnlineUsersBadge({ className = "" }: { className?: string }) {
  const { user } = useCodeAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const rt = getRealtimeClient();
  const connectedRef = useRef(false);

  const self = useMemo(() => {
    const id = user?.id || getStableUserId();
    const name = user?.name || "Anonyme";
    const role = (user?.role as any) || "employe";
    return { id, name, role };
  }, [user?.id, user?.name, user?.role]);

  // Utiliser exactement la même room que CollabPanel/Sidebar
  const room = useMemo(() => `company:${user?.companyId || user?.company || "default"}:main`, [user?.companyId, user?.company]);

  useEffect(() => {
    // Se connecter une seule fois
    if (!connectedRef.current) {
      rt.connect(room, self.id, self.name, self.role);
      connectedRef.current = true;
    }
    
    const handlePresence = (d: any) => {
      console.log("[OnlineUsersBadge] Presence update:", d);
      if (d?.members && Array.isArray(d.members)) {
        setMembers(d.members.filter((m: any) => m?.id && m?.name));
      }
    };
    
    const offState = rt.on("presence:state", handlePresence);
    const offJoin = rt.on("presence:join", handlePresence);
    const offLeave = rt.on("presence:leave", handlePresence);
    
    return () => { offState(); offJoin(); offLeave(); };
  }, [room, self.id, self.name, self.role, rt]);

  // Toujours compter au moins 1 (soi-même)
  const count = Math.max(members.length, 1);

  return (
    <div 
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors ${className}`} 
      title={`${count} utilisateur${count > 1 ? 's' : ''} en ligne`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-sm font-semibold">{count}</span>
      <span className="text-xs text-white/70 hidden sm:inline">en ligne</span>
      
      {/* Tooltip avec liste des membres */}
      {showTooltip && members.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 p-2">
          <div className="text-xs text-gray-400 mb-2">Utilisateurs connectés:</div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm text-white p-1 rounded hover:bg-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="truncate">{m.name}</span>
                {m.id === self.id && <span className="text-xs text-emerald-400">(vous)</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
