"use client";
import React, { useEffect, useState } from "react";
import LiveCursors from "./LiveCursors";
import ChatPanel from "./ChatPanel";
import { GlobalNotificationBadge } from "../notifications/NotificationBadge";
import { getNotificationManager } from "../../lib/notifications/manager";

type Role = "chef" | "manager" | "assistant" | "employe";

// Génération d'un ID utilisateur stable
function getStableUserId() {
  if (typeof window === "undefined") return `u-${Math.random().toString(36).slice(2, 9)}`;
  let id = localStorage.getItem("__collab_uid");
  if (!id) {
    id = `u-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("__collab_uid", id);
  }
  return id;
}

export default function CollabPanelEnhanced({
  roomId = "main",
  initialUser = "Utilisateur",
  initialRole = "employe" as Role,
  onClose,
}: {
  roomId?: string;
  initialUser?: string;
  initialRole?: Role;
  onClose?: () => void;
}) {
  const [userId] = useState(() => getStableUserId());
  const [user, setUser] = useState(initialUser);
  const [role, setRole] = useState<Role>(initialRole);
  const [showNotificationTest, setShowNotificationTest] = useState(false);
  const notificationManager = getNotificationManager();
  const [isCompactMode, setIsCompactMode] = useState(false);

  // Mise à jour du badge de l'onglet - désactivé pour éviter les erreurs
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     notificationManager.updateBadge();
  //   }, 5000);
  //   
  //   return () => clearInterval(interval);
  // }, []);

  // Test des notifications
  const testNotifications = async () => {
    setShowNotificationTest(true);
    notificationManager.addNotification({
      type: "system",
      title: "Test notification",
      message: "Test de notifications fonctionnel",
      priority: "normal"
    });
    setTimeout(() => setShowNotificationTest(false), 10000);
  };

  return (
    <div className={`fixed inset-y-0 right-0 bg-white border-l border-gray-300 shadow-2xl z-50 flex flex-col ${
      isCompactMode ? 'w-[400px]' : 'w-[600px]'
    }`}>
      {/* Header avec contrôles */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="font-semibold text-gray-900">Collaboration temps réel</div>
          <GlobalNotificationBadge />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCompactMode(!isCompactMode)}
            className="px-2 py-1 text-xs rounded-md hover:bg-gray-100"
            title={isCompactMode ? "Mode étendu" : "Mode compact"}
          >
            {isCompactMode ? "⬌" : "⬍"}
          </button>
          <button 
            onClick={onClose} 
            className="px-2 py-1 rounded-md hover:bg-gray-100" 
            title="Fermer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Panneau de notifications - temporairement désactivé */}

      {/* Contrôles utilisateur */}
      <div className="px-4 py-3 bg-gray-50 border-b">
        <div className={`grid gap-3 ${isCompactMode ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Votre nom:
            </label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Votre rôle:
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="employe">👤 Employé</option>
              <option value="assistant">🤝 Assistant</option>
              <option value="manager">👔 Manager</option>
              <option value="chef">👑 Chef</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-gray-500">
            ID: <code className="bg-gray-200 px-1 rounded">{userId.slice(-6)}</code>
          </div>
          <button
            onClick={testNotifications}
            disabled={showNotificationTest}
            className={`px-3 py-1 text-xs rounded-md font-medium ${
              showNotificationTest 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {showNotificationTest ? "Test en cours..." : "🔔 Test notifications"}
          </button>
        </div>

        {showNotificationTest && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            ℹ️ Test des notifications en cours... Vous devriez recevoir 5 notifications différentes.
          </div>
        )}
      </div>

      {/* Zone de collaboration principale */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!isCompactMode && (
          <div className="px-4 py-3 border-b">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Curseurs collaboratifs
            </h4>
            <div className="h-32">
              <LiveCursors roomId={roomId} userId={userId} userName={user} role={role} />
            </div>
          </div>
        )}

        {/* Chat principal */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 border-b bg-gray-50">
            <h4 className="text-sm font-medium text-gray-900">
              Messages et collaboration
            </h4>
            <p className="text-xs text-gray-600 mt-1">
              Chat temps réel, partage de fichiers, assignation de tâches
            </p>
          </div>
          
          <div className="flex-1 p-4">
            <ChatPanel
              roomId={roomId}
              userId={userId}
              user={user}
              role={role}
              height={isCompactMode ? 400 : 300}
            />
          </div>
        </div>
      </div>

      {/* Footer avec stats */}
      <div className="px-4 py-2 border-t bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>🟢 Connecté</span>
            <span>Room: {roomId}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>💬 0 msg</span>
            <span>📎 0 fichiers</span>
            <span>📋 0 tâches</span>
          </div>
        </div>
      </div>

      {/* Raccourcis clavier (affiché en mode compact) */}
      {isCompactMode && (
        <div className="px-4 py-2 bg-blue-50 border-t text-xs text-blue-700">
          <div className="flex justify-between">
            <span>Ctrl+F: Rechercher</span>
            <span>↵: Répondre</span>
            <span>😀: Réactions</span>
          </div>
        </div>
      )}
    </div>
  );
}
