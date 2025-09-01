"use client";

import { useState, useEffect } from "react";
import { getRealtimeClient } from "../../lib/realtime/provider";

export type UserStatus = "online" | "away" | "busy" | "offline";

interface UserStatusManagerProps {
  userId: string;
  userName: string;
  roomId: string;
  initialStatus?: UserStatus;
  onStatusChange?: (status: UserStatus) => void;
}

const STATUS_CONFIG = {
  online: { 
    label: "En ligne", 
    color: "bg-green-500", 
    emoji: "🟢",
    description: "Disponible pour collaborer"
  },
  away: { 
    label: "Absent", 
    color: "bg-yellow-500", 
    emoji: "🟡",
    description: "Absent temporairement"
  },
  busy: { 
    label: "Occupé", 
    color: "bg-red-500", 
    emoji: "🔴",
    description: "Ne pas déranger"
  },
  offline: { 
    label: "Hors ligne", 
    color: "bg-gray-400", 
    emoji: "⚫",
    description: "Non disponible"
  }
};

export default function UserStatusManager({
  userId,
  userName,
  roomId,
  initialStatus = "online",
  onStatusChange
}: UserStatusManagerProps) {
  const [currentStatus, setCurrentStatus] = useState<UserStatus>(initialStatus);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [awayTimer, setAwayTimer] = useState<NodeJS.Timeout | null>(null);
  const rt = getRealtimeClient();

  // Auto-détection d'inactivité
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    
    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      
      // Si l'utilisateur était away, le remettre online
      if (currentStatus === "away") {
        changeStatus("online");
      }
      
      // Programmer la mise en away après 5 minutes d'inactivité
      inactivityTimer = setTimeout(() => {
        if (currentStatus === "online") {
          changeStatus("away");
        }
      }, 5 * 60 * 1000); // 5 minutes
    };

    // Événements à surveiller pour détecter l'activité
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    // Démarrer le timer initial
    resetTimer();

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, [currentStatus]);

  // Synchroniser le statut avec les autres utilisateurs
  const changeStatus = async (newStatus: UserStatus) => {
    setCurrentStatus(newStatus);
    onStatusChange?.(newStatus);
    
    try {
      await rt.trigger(roomId, "user_status", {
        userId,
        userName,
        status: newStatus,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn("Erreur lors de la synchronisation du statut:", error);
    }
  };

  const currentConfig = STATUS_CONFIG[currentStatus];

  return (
    <div className="relative">
      <button
        onClick={() => setShowStatusMenu(!showStatusMenu)}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
        title={`Statut: ${currentConfig.label} - ${currentConfig.description}`}
      >
        <div className={`w-3 h-3 rounded-full ${currentConfig.color}`}></div>
        <span className="text-sm font-medium text-gray-700">{currentConfig.label}</span>
        <span className="text-xs text-gray-400">▼</span>
      </button>

      {showStatusMenu && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-48">
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
              Changer le statut
            </div>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <button
                key={status}
                onClick={() => {
                  changeStatus(status as UserStatus);
                  setShowStatusMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors ${
                  currentStatus === status ? "bg-blue-50 text-blue-700" : "text-gray-700"
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                <div className="flex-1 text-left">
                  <div className="font-medium">{config.label}</div>
                  <div className="text-xs text-gray-500">{config.description}</div>
                </div>
                {currentStatus === status && (
                  <div className="text-blue-500">✓</div>
                )}
              </button>
            ))}
          </div>
          
          <div className="border-t border-gray-100 p-2">
            <div className="text-xs text-gray-500 px-2">
              💡 Votre statut sera automatiquement mis à "Absent" après 5 minutes d'inactivité
            </div>
          </div>
        </div>
      )}

      {/* Clic à l'extérieur pour fermer */}
      {showStatusMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowStatusMenu(false)}
        />
      )}
    </div>
  );
}

export { STATUS_CONFIG };
