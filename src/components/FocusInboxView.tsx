"use client";

import { useEffect, useMemo, useState } from "react";
import type { Email } from "@/lib/types";

type Props = {
  currentFolder: string;
  onClose: () => void;
  emailCredentials?: any;
  userInfo?: any;
};

export function FocusInboxView({ currentFolder, onClose, emailCredentials, userInfo }: Props) {
  const [items, setItems] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = String(userInfo?.provider || emailCredentials?.provider || "auto").toLowerCase();

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const folder = "INBOX";
        const res = await fetch("/api/email/universal-connect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${btoa(JSON.stringify(emailCredentials || {}))}`
          },
          body: JSON.stringify({ ...(emailCredentials || {}), folder, userName: userInfo?.userName || "User", timestamp: new Date().toISOString(), forceRefresh: false })
        });
        const data = await res.json().catch(()=>({}));
        if (!ignore) {
          if (res.ok) setItems(data.emails || []);
          else setError(data?.error || data?.message || "Erreur chargement Focus.");
        }
      } catch (e: any) {
        if (!ignore) setError(e?.message || "Erreur réseau Focus.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [emailCredentials, userInfo]);

  const highlighted = useMemo(() => {
    const urgentWords = ["urgent", "asap", "deadline", "immédiat", "important", "payment", "paiement"];
    function score(e: Email) {
      let s = 0;
      if (e.unread || !e.read) s += 2;
      const low = `${e.subject} ${e.snippet}`.toLowerCase();
      for (const w of urgentWords) if (low.includes(w)) s += 3;
      const age = Date.now() - new Date(e.date).getTime();
      if (age < 48 * 3600 * 1000) s += 1;
      return s;
    }
    return [...items].sort((a,b)=>score(b)-score(a)).slice(0, 50);
  }, [items]);

  return (
    <div className="h-screen w-full bg-white">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="font-semibold">Mode Focus • {provider.toUpperCase()}</div>
        <button onClick={onClose} className="px-3 py-1.5 rounded border hover:bg-gray-50 text-sm">Fermer</button>
      </div>

      {loading && <div className="p-3 text-sm">Chargement…</div>}
      {error && <div className="p-3 text-sm text-red-600">{error}</div>}
      {!loading && !error && highlighted.length === 0 && <div className="p-3 text-sm">Aucun message à afficher.</div>}

      <ul className="divide-y">
        {highlighted.map((m) => (
          <li key={m.id} className="p-3 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="font-medium truncate">{m.subject}</div>
              <div className="text-xs text-gray-500">{new Date(m.date).toLocaleString()}</div>
            </div>
            <div className="text-xs text-gray-600 truncate">{m.fromName || m.from}</div>
            <div className="text-xs text-gray-500 truncate">{m.snippet}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FocusInboxView;