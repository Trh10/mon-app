"use client";

import { useState, useEffect } from "react";
import { getRealtimeClient } from "../../lib/realtime/provider";
import UserStatusManager, { UserStatus, STATUS_CONFIG } from "./UserStatusManager";

type Role = "chef" | "manager" | "assistant" | "employe";

interface ConnectedUser {
  id: string;
  name: string;
  role: Role;
  status: UserStatus;
  lastSeen: number;
  isTyping?: boolean;
}

interface ConnectedUsersListProps {
  roomId: string;
  currentUserId: string;
  onUserClick?: (user: ConnectedUser) => void;
  compact?: boolean;
}

export default function ConnectedUsersList({ 
  roomId, 
  currentUserId, 
  onUserClick, 
  compact = false 
}: ConnectedUsersListProps) {
  const [users, setUsers] = useState<ConnectedUser[]>([]);
  const [showAll, setShowAll] = useState(false);
  const rt = getRealtimeClient();

  useEffect(() => {
    const unsubscribePresence = rt.subscribe(roomId, "presence", (data) => {
      if (data.type === "user_list") {
        setUsers(data.users || []);
      } else if (data.type === "user_joined") {
        setUsers(prev => {
          const existing = prev.find(u => u.id === data.user.id);
          if (existing) {
            return prev.map(u => u.id === data.user.id ? { ...u, ...data.user, status: "online" } : u);
          }
          return [...prev, { ...data.user, status: "online" as UserStatus, lastSeen: Date.now() }];
        });
      } else if (data.type === "user_left") {
        setUsers(prev => prev.filter(u => u.id !== data.user.id));
      }
    });

    const unsubscribeTyping = rt.subscribe(roomId, "typing", (data) => {
      const userId = data.user?.id;
      if (userId && userId !== currentUserId) {
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, isTyping: data.payload?.isTyping } : u
        ));
      }
    });

    return () => {
      unsubscribePresence();
      unsubscribeTyping();
    };
  }, [roomId, currentUserId, rt]);

  const getRoleIcon = (role: Role) => {
    const icons = { chef: "👑", manager: "📊", assistant: "🤝", employe: "👤" };
    return icons[role] || "👤";
  };

  const getStatusColor = (status: UserStatus) => {
    return STATUS_CONFIG[status]?.color || STATUS_CONFIG.offline.color;
  };

  const getStatusText = (status: UserStatus) => {
    const texts = {
      online: "En ligne",
      away: "Absent",
      busy: "Occupé", 
      offline: "Hors ligne"
    };
    return texts[status] || texts.offline;
  };

  const displayUsers = showAll ? users : users.slice(0, compact ? 3 : 6);
  const hiddenCount = users.length - displayUsers.length;

  if (users.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <div className="text-2xl mb-2">👥</div>
        <div className="text-sm">Aucun utilisateur connecté</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 text-sm">
          👥 Connectés ({users.length})
        </h3>
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showAll ? "Réduire" : `+${hiddenCount} autres`}
          </button>
        )}
      </div>

      <div className="space-y-1">
        {displayUsers.map((user) => (
          <div
            key={user.id}
            onClick={() => onUserClick?.(user)}
            className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 ${
              onUserClick ? "cursor-pointer" : ""
            } ${compact ? "text-sm" : ""}`}
          >
            {/* Avatar et statut */}
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div 
                className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`}
                title={getStatusText(user.status)}
              ></div>
            </div>

            {/* Informations utilisateur */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900 truncate">
                  {user.name}
                </span>
                <span className="text-lg" title={`Rôle: ${user.role}`}>
                  {getRoleIcon(user.role)}
                </span>
              </div>
              
              {user.isTyping ? (
                <div className="text-xs text-blue-600 italic">
                  En train d'écrire...
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  {getStatusText(user.status)}
                </div>
              )}
            </div>

            {/* Actions rapides */}
            {onUserClick && user.id !== currentUserId && (
              <div className="text-xs text-gray-400">
                💬
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Statistiques */}
      {!compact && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>
              🟢 En ligne: {users.filter(u => u.status === "online").length}
            </div>
            <div>
              ⚡ Actifs: {users.filter(u => u.isTyping).length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
