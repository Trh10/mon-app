"use client";

import { useMemo, useState } from "react";
import { Email } from "@/lib/types";
import { useUI } from "@/store";
import { cn } from "./cn";
import { 
  FileText, Reply, Share2, Sparkles, 
  Mail, Star, Clock, User, Check, CheckCheck,
  AlertCircle, ChevronDown, Search, Filter,
  MoreHorizontal, Archive, Trash2, Tag
} from "lucide-react";

type Props = {
  items: Email[];
  checkedEmails?: Set<string>;
  onToggleCheck?: (id: string) => void;
};

export function EmailList({ items, checkedEmails, onToggleCheck }: Props) {
  const { density, selectedEmailId, setSelectedEmailId } = useUI();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "priority" | "unread">("date");
  const [showFilters, setShowFilters] = useState(false);

  const sorted = useMemo(() => {
    let filtered = [...items];
    
    // Filtre de recherche
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.subject?.toLowerCase().includes(q) ||
        e.fromName?.toLowerCase().includes(q) ||
        e.from?.toLowerCase().includes(q) ||
        e.snippet?.toLowerCase().includes(q)
      );
    }
    
    // Tri
    switch (sortBy) {
      case "priority":
        const order: Record<string, number> = { P1: 0, P2: 1, P3: 2 };
        filtered.sort((a, b) => (order[a.priority || ""] ?? 3) - (order[b.priority || ""] ?? 3));
        break;
      case "unread":
        filtered.sort((a, b) => (b.unread ? 1 : 0) - (a.unread ? 1 : 0));
        break;
      case "date":
      default:
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    
    return filtered;
  }, [items, searchQuery, sortBy]);

  const unreadCount = useMemo(() => items.filter(e => e.unread).length, [items]);
  const checkedCount = checkedEmails?.size || 0;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background subtil */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-48 h-48 bg-blue-500/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Header avec stats */}
      <div className="relative z-10 p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/30">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold">{items.length} emails</h2>
              <p className="text-xs text-white/50">
                {unreadCount > 0 && <span className="text-blue-400">{unreadCount} non lus</span>}
                {checkedCount > 0 && <span className="text-purple-400 ml-2">• {checkedCount} sélectionnés</span>}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-2 rounded-lg border transition-all",
              showFilters 
                ? "bg-purple-500/20 border-purple-400/30 text-purple-300" 
                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
            )}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher dans les emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 transition-all"
          />
        </div>

        {/* Filtres */}
        {showFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
            <span className="text-xs text-white/50">Trier par:</span>
            {[
              { key: "date", label: "Date" },
              { key: "priority", label: "Priorité" },
              { key: "unread", label: "Non lus" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key as any)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                  sortBy === opt.key
                    ? "bg-purple-500/20 text-purple-300 border border-purple-400/30"
                    : "bg-white/5 text-white/60 hover:bg-white/10 border border-transparent"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Liste des emails */}
      <div className="flex-1 overflow-auto relative z-10 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/40 p-8">
            <Mail className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-center">
              {searchQuery ? "Aucun résultat trouvé" : "Aucun email"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {sorted.map((email) => (
              <EmailRow 
                key={email.id} 
                email={email} 
                isSelected={selectedEmailId === email.id}
                isChecked={checkedEmails?.has(email.id) || false}
                onSelect={() => setSelectedEmailId?.(email.id)}
                onToggleCheck={() => onToggleCheck?.(email.id)}
                density={density}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmailRow({ 
  email, 
  isSelected, 
  isChecked,
  onSelect, 
  onToggleCheck,
  density 
}: { 
  email: Email; 
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
  density: string;
}) {
  const [showActions, setShowActions] = useState(false);

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 24) {
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } else if (hours < 48) {
      return "Hier";
    } else {
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    }
  };

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case "P1": return "bg-red-500/20 text-red-300 border-red-400/30";
      case "P2": return "bg-amber-500/20 text-amber-300 border-amber-400/30";
      case "P3": return "bg-emerald-500/20 text-emerald-300 border-emerald-400/30";
      default: return "bg-white/10 text-white/50 border-white/20";
    }
  };

  const paddingClass = density === "ultra" ? "py-2" : density === "dense" ? "py-3" : "py-4";

  return (
    <div
      className={cn(
        "group relative px-4 cursor-pointer transition-all duration-200",
        paddingClass,
        isSelected 
          ? "bg-gradient-to-r from-purple-500/20 to-blue-500/10 border-l-2 border-purple-500" 
          : "hover:bg-white/5 border-l-2 border-transparent",
        isChecked && "bg-purple-500/10"
      )}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="pt-1">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              e.stopPropagation();
              onToggleCheck();
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-500/50 focus:ring-offset-0 cursor-pointer"
          />
        </div>

        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm",
            email.unread 
              ? "bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30" 
              : "bg-white/10"
          )}>
            {(email.fromName || email.from || "?").slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn(
                "font-medium truncate",
                email.unread ? "text-white" : "text-white/70"
              )}>
                {email.fromName || email.from || "Inconnu"}
              </span>
              {email.unread && (
                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {email.priority && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                  getPriorityStyle(email.priority)
                )}>
                  {email.priority}
                </span>
              )}
              <span className="text-xs text-white/40">{formatDate(email.date)}</span>
            </div>
          </div>

          <h3 className={cn(
            "text-sm truncate mb-1",
            email.unread ? "text-white font-medium" : "text-white/80"
          )}>
            {email.subject || "(Sans sujet)"}
          </h3>

          <p className="text-xs text-white/50 truncate">
            {email.snippet || "Pas d'aperçu disponible"}
          </p>
        </div>
      </div>

      {/* Actions au survol */}
      {showActions && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-slate-800/90 backdrop-blur-sm rounded-lg p-1 border border-white/10 shadow-xl">
          <button 
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            title="Lire"
          >
            <FileText className="w-4 h-4 text-white/70" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("app:reply")); onSelect(); }}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            title="Répondre"
          >
            <Reply className="w-4 h-4 text-blue-400" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); }}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            title="Archiver"
          >
            <Archive className="w-4 h-4 text-white/70" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); }}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            title="Plus"
          >
            <MoreHorizontal className="w-4 h-4 text-white/70" />
          </button>
        </div>
      )}
    </div>
  );
}