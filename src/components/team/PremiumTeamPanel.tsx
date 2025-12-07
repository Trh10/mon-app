"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Search,
  Users,
  Crown,
  Briefcase,
  UserCheck,
  User,
  Phone,
  Video,
  MessageCircle,
  Mail,
  Clock,
  ChevronRight,
  Sparkles,
  Shield,
  Star,
  ClipboardList,
} from "lucide-react";
import { useCodeAuth } from "@/components/auth/CodeAuthContext";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  level: number;
  levelName: string;
  companyId: string;
  companyCode: string;
  companyName: string;
  isOnline: boolean;
  lastLoginAt?: string;
  createdAt: string;
  permissions: string[];
}

interface GroupedMembers {
  level: number;
  levelName: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  members: TeamMember[];
}

const LEVEL_CONFIG: Record<number, { name: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string }> = {
  10: {
    name: "Direction Générale",
    icon: <Crown className="w-5 h-5" />,
    color: "text-amber-500",
    bgColor: "bg-gradient-to-r from-amber-500/10 to-yellow-500/10",
    borderColor: "border-amber-500/30",
  },
  8: {
    name: "Administration & Finance",
    icon: <Briefcase className="w-5 h-5" />,
    color: "text-blue-500",
    bgColor: "bg-gradient-to-r from-blue-500/10 to-cyan-500/10",
    borderColor: "border-blue-500/30",
  },
  5: {
    name: "Assistants",
    icon: <UserCheck className="w-5 h-5" />,
    color: "text-emerald-500",
    bgColor: "bg-gradient-to-r from-emerald-500/10 to-green-500/10",
    borderColor: "border-emerald-500/30",
  },
  3: {
    name: "Employés",
    icon: <User className="w-5 h-5" />,
    color: "text-slate-500",
    bgColor: "bg-gradient-to-r from-slate-500/10 to-gray-500/10",
    borderColor: "border-slate-500/30",
  },
};

function getConfig(level: number) {
  if (level >= 10) return LEVEL_CONFIG[10];
  if (level >= 8) return LEVEL_CONFIG[8];
  if (level >= 5) return LEVEL_CONFIG[5];
  return LEVEL_CONFIG[3];
}

interface PremiumTeamPanelProps {
  onClose: () => void;
  onStartPrivateChat?: (member: TeamMember) => void;
  onStartCall?: (member: TeamMember, type: "audio" | "video") => void;
  onAssignTask?: (member: TeamMember) => void;
}

export type { TeamMember };

export default function PremiumTeamPanel({ onClose, onStartPrivateChat, onStartCall, onAssignTask }: PremiumTeamPanelProps) {
  const { user } = useCodeAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Charger les membres de l'équipe
  const loadMembers = useCallback(async () => {
    if (!user?.companyCode && !user?.companyId) {
      setError("Veuillez vous connecter pour voir l'équipe");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user.companyCode) params.set("companyCode", user.companyCode);
      else if (user.companyId) params.set("companyId", user.companyId);

      const res = await fetch(`/api/team/all?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setMembers(data.members || []);
        setError(null);
      } else {
        setError(data.error || "Erreur de chargement");
      }
    } catch (err: any) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }, [user?.companyCode, user?.companyId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Filtrer les membres par recherche
  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      m.levelName.toLowerCase().includes(q)
    );
  });

  // Grouper les membres par niveau
  const groupedMembers: GroupedMembers[] = [];
  const levels = [10, 8, 5, 3];

  levels.forEach((level) => {
    const config = LEVEL_CONFIG[level];
    const levelMembers = filteredMembers.filter((m) => {
      if (level === 10) return m.level >= 10;
      if (level === 8) return m.level >= 8 && m.level < 10;
      if (level === 5) return m.level >= 5 && m.level < 8;
      return m.level < 5;
    });

    if (levelMembers.length > 0) {
      groupedMembers.push({
        level,
        levelName: config.name,
        icon: config.icon,
        color: config.color,
        bgColor: config.bgColor,
        borderColor: config.borderColor,
        members: levelMembers,
      });
    }
  });

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto w-full sm:w-[420px] md:w-[480px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col z-50 shadow-2xl">
      {/* Header Premium */}
      <div className="relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-500/20 to-amber-500/20" />
        
        <div className="relative px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  Équipe
                  <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-full font-medium">
                    Premium
                  </span>
                </h2>
                <p className="text-sm text-slate-400">
                  {members.length} membre{members.length > 1 ? "s" : ""} • {members.filter((m) => m.isOnline).length} en ligne
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, rôle, poste..."
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
          />
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-400">Chargement de l'équipe...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 px-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-red-400 text-center">{error}</p>
            <button
              onClick={loadMembers}
              className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
            >
              Réessayer
            </button>
          </div>
        ) : groupedMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Users className="w-16 h-16 text-slate-600 mb-4" />
            <p className="text-slate-400">Aucun membre trouvé</p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {groupedMembers.map((group) => (
              <div key={group.level}>
                {/* Header du groupe */}
                <div className={`flex items-center gap-3 mb-3 px-3 py-2 rounded-xl ${group.bgColor} border ${group.borderColor}`}>
                  <span className={group.color}>{group.icon}</span>
                  <span className={`font-semibold ${group.color}`}>{group.levelName}</span>
                  <span className="ml-auto text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded-full">
                    {group.members.length}
                  </span>
                </div>

                {/* Liste des membres */}
                <div className="space-y-2">
                  {group.members.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className="w-full flex items-center gap-4 p-3 bg-slate-800/30 hover:bg-slate-800/60 rounded-xl transition-all group border border-transparent hover:border-slate-700"
                    >
                      {/* Avatar */}
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                          member.level >= 10
                            ? "bg-gradient-to-br from-amber-500 to-yellow-600"
                            : member.level >= 8
                            ? "bg-gradient-to-br from-blue-500 to-cyan-600"
                            : member.level >= 5
                            ? "bg-gradient-to-br from-emerald-500 to-green-600"
                            : "bg-gradient-to-br from-slate-500 to-gray-600"
                        }`}>
                          {getInitials(member.name)}
                        </div>
                        {/* Indicateur en ligne */}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                          member.isOnline ? "bg-emerald-500" : "bg-slate-600"
                        }`} />
                      </div>

                      {/* Infos */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{member.name}</span>
                          {member.id === user?.id && (
                            <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                              Vous
                            </span>
                          )}
                          {member.level >= 10 && (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <div className="text-sm text-slate-400">{member.role}</div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        {member.isOnline ? (
                          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                            En ligne
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Hors ligne</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal détail membre */}
      {selectedMember && (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-10"
          onClick={() => setSelectedMember(null)}
        >
          <div
            className="w-full sm:w-[400px] bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-3xl sm:rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl ${
                selectedMember.level >= 10
                  ? "bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/25"
                  : selectedMember.level >= 8
                  ? "bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/25"
                  : selectedMember.level >= 5
                  ? "bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/25"
                  : "bg-gradient-to-br from-slate-500 to-gray-600"
              }`}>
                {getInitials(selectedMember.name)}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  {selectedMember.name}
                  {selectedMember.level >= 10 && <Crown className="w-5 h-5 text-amber-500" />}
                </h3>
                <p className="text-slate-400">{selectedMember.role}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedMember.isOnline
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-700 text-slate-400"
                  }`}>
                    {selectedMember.isOnline ? "En ligne" : "Hors ligne"}
                  </span>
                  <span className="text-xs text-slate-500">
                    Niveau {selectedMember.level}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Infos */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 text-slate-300">
                <Briefcase className="w-5 h-5 text-slate-500" />
                <span>{selectedMember.levelName}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <Clock className="w-5 h-5 text-slate-500" />
                <span>Membre depuis {formatDate(selectedMember.createdAt)}</span>
              </div>
              {selectedMember.lastLoginAt && (
                <div className="flex items-center gap-3 text-slate-300">
                  <User className="w-5 h-5 text-slate-500" />
                  <span>Dernière connexion: {formatDate(selectedMember.lastLoginAt)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {selectedMember.id !== user?.id && (
              <div className="grid grid-cols-4 gap-3">
                <button 
                  onClick={() => {
                    if (onStartPrivateChat) {
                      onStartPrivateChat(selectedMember);
                      setSelectedMember(null);
                      onClose();
                    }
                  }}
                  className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-purple-600/30 hover:border-purple-500 border border-transparent rounded-xl transition-all"
                >
                  <MessageCircle className="w-6 h-6 text-purple-400" />
                  <span className="text-xs text-slate-400">Message</span>
                </button>
                <button 
                  onClick={() => {
                    if (onStartCall) {
                      onStartCall(selectedMember, "audio");
                      setSelectedMember(null);
                      onClose();
                    }
                  }}
                  className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-emerald-600/30 hover:border-emerald-500 border border-transparent rounded-xl transition-all"
                >
                  <Phone className="w-6 h-6 text-emerald-400" />
                  <span className="text-xs text-slate-400">Appeler</span>
                </button>
                <button 
                  onClick={() => {
                    if (onStartCall) {
                      onStartCall(selectedMember, "video");
                      setSelectedMember(null);
                      onClose();
                    }
                  }}
                  className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-blue-600/30 hover:border-blue-500 border border-transparent rounded-xl transition-all"
                >
                  <Video className="w-6 h-6 text-blue-400" />
                  <span className="text-xs text-slate-400">Vidéo</span>
                </button>
                <button 
                  onClick={() => {
                    if (onAssignTask) {
                      onAssignTask(selectedMember);
                      setSelectedMember(null);
                    }
                  }}
                  className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-amber-600/30 hover:border-amber-500 border border-transparent rounded-xl transition-all"
                >
                  <ClipboardList className="w-6 h-6 text-amber-400" />
                  <span className="text-xs text-slate-400">Tâche</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
