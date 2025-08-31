"use client";

import { useMemo } from "react";
import { Email } from "@/lib/email-types";
import { useUI } from "@/store";
import { cn } from "./cn";
import { FileText, Reply, Share2, Sparkles, Minus } from "lucide-react";

export function EmailList({ items }: { items: Email[] }) {
  const { density } = useUI();
  const sorted = useMemo(() => {
    const order = { high: 0, normal: 1, low: 2, P1: 0, P2: 1, P3: 2 } as any;
    return [...items].sort((a, b) => {
      const aPriority = a.priority || 'normal';
      const bPriority = b.priority || 'normal';
      return (order[aPriority] || 1) - (order[bPriority] || 1);
    });
  }, [items]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b border-[var(--border)]">
        <div className="text-sm text-[var(--muted)]">Tri: Priorité ▼</div>
        <MiniToggle />
      </div>
      <div className="flex-1 overflow-auto">
        <ul className={cn("divide-y divide-[var(--border)]", rowHeightClass(density))}>
          {sorted.map((e) => (
            <EmailRow key={e.id} email={e} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function rowHeightClass(density: "compact" | "dense" | "ultra") {
  switch (density) {
    case "compact":
      return "text-sm [&_li]:py-2";
    case "dense":
      return "text-[13px] [&_li]:py-1.5";
    case "ultra":
      return "text-[12px] [&_li]:py-1";
    default:
      return "text-sm [&_li]:py-2";
  }
}

function EmailRow({ email }: { email: Email }) {
  const { setSelectedEmailId, selectedEmailId } = useUI();

  const checked = selectedEmailId === email.id;

  const onToggleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (!checked) {
      console.debug("[EmailList] select for summary:", email.id);
      setSelectedEmailId?.(email.id);
    } else {
      console.debug("[EmailList] already selected:", email.id);
      setSelectedEmailId?.(null);
    }
  };

  const onRead = () => {
    setSelectedEmailId?.(email.id);
  };
  const onSummary = () => {
    setSelectedEmailId?.(email.id);
  };
  const onReply = () => {
    setSelectedEmailId?.(email.id);
    window.dispatchEvent(new CustomEvent("pepite:reply"));
  };
  const onForward = () => {
    setSelectedEmailId?.(email.id);
    window.dispatchEvent(new CustomEvent("pepite:forward"));
  };

  return (
    <li className={cn("row hover:bg-gray-50", checked && "bg-purple-50/50")}>
      {/* Colonne gauche: encoche + badges */}
      <div className="flex items-center gap-2">
        {/* Encoche de sélection (grande/visible pour debug) */}
        <input
          type="checkbox"
          aria-label="Sélectionner cet email pour le résumé"
          title="Sélectionner pour résumé"
          checked={checked}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="h-5 w-5 rounded border border-gray-300 text-purple-600 bg-white ring-1 ring-purple-400 focus:ring-2 focus:ring-purple-500"
        />

        <PriorityBadge p={email.priority} />
        {email.priority === 'high' && <span className="badge border-red-400 text-red-600">Urgent</span>}
      </div>

      {/* Colonne centrale: contenu */}
      <div className="truncate">
        <span className={cn("font-medium", email.unread && "font-semibold")}>{email.fromName}</span>
        <span className="mx-2 text-[var(--muted)]">—</span>
        <span className="truncate">{email.subject}</span>
        <span className="mx-2 text-[var(--muted)]">·</span>
        <span className="text-[var(--muted)] truncate">{email.snippet}</span>
      </div>

      {/* Colonne droite: actions */}
      <div className="flex items-center gap-1">
        <button className="icon-btn" title="Lire" onClick={onRead}>
          <FileText className="w-4 h-4" />
        </button>
        <button className="icon-btn" title="Résumer" onClick={onSummary}>
          <Sparkles className="w-4 h-4 text-primary" />
        </button>
        <button className="icon-btn" title="Répondre" onClick={onReply}>
          <Reply className="w-4 h-4" />
        </button>
        <button className="icon-btn" title="Transférer" onClick={onForward}>
          <Share2 className="w-4 h-4" />
        </button>
        <button className="icon-btn" title="Réduire la ligne">
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}

function PriorityBadge({ p }: { p: Email["priority"] }) {
  const map = {
    P1: "bg-red-50 text-red-600 border-red-200",
    P2: "bg-amber-50 text-amber-700 border-amber-200",
    P3: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return <span className={cn("badge", map[p as keyof typeof map])}>{p}</span>;
}

function MiniToggle() {
  const { density, setDensity } = useUI();
  const isMini = density === "ultra";
  
  const toggle = () => {
    setDensity?.(isMini ? "dense" : "ultra");
  };
  
  return (
    <button
      className={cn("btn text-xs", isMini ? "bg-gray-900 text-white hover:bg-gray-800" : "")}
      onClick={toggle}
    >
      {isMini ? "Vue Mini (ON)" : "Vue Mini (OFF)"}
    </button>
  );
}