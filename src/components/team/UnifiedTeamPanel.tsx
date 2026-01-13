"use client";

import React, { useState, useEffect } from "react";
import { getTeamSyncManager, TeamMember, UserStatus } from "../../lib/realtime/syncManager";
import { getRealtimeClient } from "../../lib/realtime/provider";

type Role = "chef" | "manager" | "assistant" | "employe";

interface UnifiedTeamPanelProps {
  currentUser: { id: string; name: string; role: Role };
  onUserSelect?: (user: TeamMember) => void;
  onStatusChange?: (status: UserStatus) => void;
}

const STATUS_CONFIG = {
  online: { label: "En ligne", color: "bg-green-500", emoji: "🟢" },
  away: { label: "Absent", color: "bg-yellow-500", emoji: "🟡" },
  busy: { label: "Occupé", color: "bg-red-500", emoji: "🔴" },
  offline: { label: "Hors ligne", color: "bg-gray-400", emoji: "⚫" }
};

const ROLE_ICONS: Record<string, string> = {
  // Nouveaux rôles
  "Directeur Général": "👑",
  "Administration": "📋",
  "Finance": "💰",
  "Comptable": "📊",
  "Assistant": "🤝",
  "Assistante": "🤝",
  "Employé": "👤",
  // Anciens rôles
  chef: "👑",
  manager: "📊", 
  assistant: "🤝",
  employe: "👤",
  admin: "👑"
};

export default function UnifiedTeamPanel({ 
  currentUser, 
  onUserSelect, 
  onStatusChange 
}: UnifiedTeamPanelProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [currentStatus, setCurrentStatus] = useState<UserStatus>("online");
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [filter, setFilter] = useState<"all" | "online" | "busy">("all");
  
  const syncManager = getTeamSyncManager();

  useEffect(() => {
    // Initialiser le gestionnaire de synchronisation
    syncManager.initialize(currentUser, {
      onTeamUpdate: (members) => {
        setTeamMembers(members);
      },
      onStatusUpdate: (userId, status) => {
        if (userId === currentUser.id) {
          setCurrentStatus(status);
          onStatusChange?.(status);
        }
      },
      onTypingUpdate: (users) => {
        setTypingUsers(users);
      },
      onUnreadUpdate: (counts) => {
        setUnreadCounts(new Map(counts));
      }
    });

    return () => {
      syncManager.destroy();
    };
  }, [currentUser, syncManager, onStatusChange]);

  const handleStatusChange = (newStatus: UserStatus) => {
    setCurrentStatus(newStatus);
    syncManager.changeStatus(newStatus);
    setShowStatusMenu(false);
  };

  const handleUserClick = (user: TeamMember) => {
    if (user.id === currentUser.id) return;
    
    // Marquer les DM comme lus
    syncManager.markDmAsRead(user.id);
    onUserSelect?.(user);
  };

  const filteredMembers = teamMembers.filter(member => {
    switch (filter) {
      case "online": return member.status === "online";
      case "busy": return member.status === "busy";
      default: return true;
    }
  });

  const onlineCount = teamMembers.filter(m => m.status === "online").length;
  const totalUnread = Array.from(unreadCounts.values()).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* En-tête avec statut personnel */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-lg">👥</span>
            Équipe Synchronisée
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {totalUnread}
              </span>
            )}
          </h3>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {onlineCount} en ligne
            </span>
          </div>
        </div>

        {/* Statut personnel */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors w-full"
          >
            <div className={`w-3 h-3 rounded-full ${STATUS_CONFIG[currentStatus].color}`}></div>
            <span className="text-sm font-medium flex-1 text-left">
              Mon statut: {STATUS_CONFIG[currentStatus].label}
            </span>
            <span className="text-xs text-gray-400">▼</span>
          </button>

          {showStatusMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-2">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status as UserStatus)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors ${
                      currentStatus === status ? "bg-blue-50 text-blue-700" : "text-gray-700"
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                    <span className="flex-1 text-left">{config.label}</span>
                    {currentStatus === status && <span className="text-blue-500">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex gap-1">
          {[
            { key: "all", label: "Tous", count: teamMembers.length },
            { key: "online", label: "En ligne", count: onlineCount },
            { key: "busy", label: "Occupés", count: teamMembers.filter(m => m.status === "busy").length }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === key 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Liste des membres */}
      <div className="max-h-96 overflow-y-auto">
        {filteredMembers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="text-2xl mb-2">👻</div>
            <div className="text-sm">Aucun membre trouvé</div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredMembers.map((member) => {
              const unreadCount = unreadCounts.get(member.id) || 0;
              const isTyping = typingUsers.includes(member.id);
              const isCurrentUser = member.id === currentUser.id;

              return (
                <div
                  key={member.id}
                  onClick={() => handleUserClick(member)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                    isCurrentUser 
                      ? "bg-blue-50 border border-blue-200" 
                      : "hover:bg-gray-50"
                  } ${unreadCount > 0 ? "bg-orange-50 border-l-4 border-orange-400" : ""}`}
                >
                  {/* Avatar avec statut */}
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div 
                      className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${STATUS_CONFIG[member.status].color}`}
                    ></div>
                  </div>

                  {/* Infos utilisateur */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {member.name}
                        {isCurrentUser && <span className="text-xs text-blue-600 ml-1">(vous)</span>}
                      </span>
                      <span className="text-sm" title={`Rôle: ${member.role}`}>
                        {ROLE_ICONS[member.role]}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {isTyping ? (
                        <span className="text-blue-600 italic flex items-center gap-1">
                          <span className="animate-pulse">●</span>
                          En train d'écrire...
                        </span>
                      ) : (
                        <span>
                          {STATUS_CONFIG[member.status].label}
                          {member.lastSeen && (
                            <span className="ml-1">
                              • {new Date(member.lastSeen).toLocaleTimeString()}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Indicateurs */}
                  <div className="flex flex-col items-end gap-1">
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                    
                    {!isCurrentUser && member.status === "online" && (
                      <div className="text-xs text-green-600">
                        💬
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Statistiques en bas */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-600">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="font-semibold text-green-600">{onlineCount}</div>
            <div>En ligne</div>
          </div>
          <div>
            <div className="font-semibold text-blue-600">{typingUsers.length}</div>
            <div>Écrivent</div>
          </div>
          <div>
            <div className="font-semibold text-orange-600">{totalUnread}</div>
            <div>Non lus</div>
          </div>
        </div>
      </div>

      {/* Overlay pour fermer le menu statut */}
      {showStatusMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowStatusMenu(false)}
        />
      )}
    </div>
  );
}
