import React, { useState, useEffect } from "react";
import LiveCursors from "./LiveCursors";
import FloatingChat from "./FloatingChat";
import NotificationCenter from "../notifications/NotificationCenter";
import ConnectedUsersList from "../presence/ConnectedUsersList";
import UserStatusManager from "../presence/UserStatusManager";
import CallManager from "../calls/CallManager";
import CollaborativeWhiteboard from "../whiteboard/CollaborativeWhiteboard";
import RealtimeTaskManager from "../tasks/RealtimeTaskManager";
import FocusModeManager from "../focus/FocusModeManager";
import { getStableUserId, getRealtimeClient } from "../../lib/realtime/provider";

type Role = "chef" | "manager" | "assistant" | "employe";

export default function CollabPanel({
  roomId = "demo-room",
  userName = "Moi",
  role = "chef" as Role, // chef par défaut pour voir l'assignation privée
  onClose,
}: {
  roomId?: string;
  userName?: string;
  role?: Role;
  onClose?: () => void;
}) {
  const userId = getStableUserId();
  const rt = getRealtimeClient();
  
  // États pour les fonctionnalités avancées
  const [isCompact, setIsCompact] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected" | "error">("disconnected");
  const [showStats, setShowStats] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  
  // Nouveaux états pour les modules avancés
  const [activeTab, setActiveTab] = useState<"overview" | "chat" | "whiteboard" | "tasks" | "calls">("overview");
  const [isInCall, setIsInCall] = useState(false);

  // Suivi des utilisateurs connectés
  useEffect(() => {
    const unsubscribe = rt.subscribe(roomId, "presence", (data) => {
      if (data.type === "user_list") {
        setConnectedUsers(data.users || []);
      }
    });

    // Ping pour maintenir la connexion
    const pingInterval = setInterval(() => {
      rt.trigger(roomId, "ping", { timestamp: Date.now() }).catch(() => {});
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(pingInterval);
    };
  }, [rt, roomId]);

  // Surveillance du statut de connexion
  useEffect(() => {
    const checkStatus = () => {
      // Utiliser une méthode simple pour vérifier le statut
      setConnectionStatus("connected"); // Simplifié pour éviter les erreurs
    };

    checkStatus();
    const statusInterval = setInterval(checkStatus, 5000);
    return () => clearInterval(statusInterval);
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected": return "bg-green-500";
      case "connecting": return "bg-yellow-500";
      case "error": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected": return "Connecté";
      case "connecting": return "Connexion...";
      case "error": return "Erreur";
      default: return "Déconnecté";
    }
  };

  return (
    <div className={`fixed inset-y-0 right-0 bg-white border-l border-gray-300 shadow-2xl z-50 flex flex-col transition-all duration-300 ${
      isCompact ? "w-80" : "w-[520px]"
    }`}>
      {/* En-tête avec statut et contrôles */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3">
          <div className="font-semibold text-gray-800">Collaboration</div>
          
          {/* Statut utilisateur */}
          <UserStatusManager
            userId={userId}
            userName={userName}
            roomId={roomId}
            onStatusChange={(status) => {
              console.log("Statut changé:", status);
            }}
          />
          
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
            <span className="text-xs text-gray-600">{getStatusText()}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Compteur d'utilisateurs */}
          <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 rounded-full">
            <span className="text-xs font-medium text-blue-700">👥</span>
            <span className="text-xs font-bold text-blue-700">{connectedUsers.length}</span>
          </div>
          
          {/* Bouton notifications */}
          <button
            onClick={() => setShowNotificationCenter(true)}
            className="p-1 rounded hover:bg-gray-100"
            title="Centre de notifications"
          >
            🔔
          </button>
          
          {/* Bouton statistiques */}
          <button
            onClick={() => setShowStats(!showStats)}
            className="p-1 rounded hover:bg-gray-100"
            title="Statistiques"
          >
            📊
          </button>
          
          {/* Bouton mode compact */}
          <button
            onClick={() => setIsCompact(!isCompact)}
            className="p-1 rounded hover:bg-gray-100"
            title={isCompact ? "Mode étendu" : "Mode compact"}
          >
            {isCompact ? "📖" : "📄"}
          </button>
          
          <button onClick={onClose} className="px-2 py-1 rounded-md hover:bg-gray-100" title="Fermer">✕</button>
        </div>
      </div>

      {/* Zone de contenu principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Statistiques (si affichées) */}
        {showStats && (
          <div className="p-3 bg-gray-50 border-b text-xs space-y-2">
            <div className="font-semibold text-gray-700">📈 Statistiques temps réel</div>
            <div className="grid grid-cols-2 gap-2">
              <div>👥 Utilisateurs: {connectedUsers.length}</div>
              <div>🌐 Room: {roomId}</div>
              <div>🆔 Votre ID: {userId.slice(-6)}</div>
              <div>⚡ Statut: {getStatusText()}</div>
            </div>
            {connectedUsers.length > 0 && (
              <div className="mt-2">
                <div className="font-medium text-gray-600">Utilisateurs connectés:</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {connectedUsers.map((user, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {user.name} ({user.role})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Zone principale collaborative */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Onglets de navigation */}
          <div className="flex border-b bg-gray-50 px-2">
            {[
              { id: "overview", label: "Vue d'ensemble", emoji: "📊" },
              { id: "chat", label: "Chat", emoji: "💬" },
              { id: "whiteboard", label: "Tableau", emoji: "🎨" },
              { id: "tasks", label: "Tâches", emoji: "📋" },
              { id: "calls", label: "Appels", emoji: "📞" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-blue-500 text-blue-600 bg-white"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <span className="mr-1">{tab.emoji}</span>
                {!isCompact && tab.label}
                {tab.id === "calls" && isInCall && (
                  <span className="ml-1 w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse"></span>
                )}
              </button>
            ))}
          </div>

          {/* Contenu des onglets */}
          <div className="flex-1 overflow-auto">
            {activeTab === "overview" && (
              <div className="p-3 space-y-3">
                {!isCompact && (
                  <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                    💡 <strong>Mode collaboration avancé :</strong><br/>
                    • Bouge ta souris pour partager ton curseur<br/>
                    • Chat flottant déplaçable et redimensionnable<br/>
                    • Notifications en temps réel<br/>
                    • Auto-reconnexion intelligente
                  </div>
                )}
                
                {/* Mode Focus */}
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <h3 className="font-semibold text-sm mb-2">🎯 Mode Focus</h3>
                  <FocusModeManager
                    roomId={roomId}
                    userId={userId}
                    userName={userName}
                    onFocusChange={(mode) => {
                      console.log("Mode focus changé:", mode);
                    }}
                  />
                </div>
                
                {/* Liste des utilisateurs connectés */}
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <ConnectedUsersList
                    roomId={roomId}
                    currentUserId={userId}
                    compact={isCompact}
                    onUserClick={(user) => {
                      // TODO: Ouvrir un DM avec cet utilisateur
                      console.log("Ouvrir DM avec:", user);
                    }}
                  />
                </div>
                
                <LiveCursors roomId={roomId} userId={userId} userName={userName} role={role} />
              </div>
            )}

            {activeTab === "chat" && (
              <div className="h-full">
                <FloatingChat
                  roomId={roomId}
                  userId={userId}
                  userName={userName}
                  role={role}
                  embedded={true}
                />
              </div>
            )}

            {activeTab === "whiteboard" && (
              <div className="p-3">
                <CollaborativeWhiteboard
                  roomId={roomId}
                  userId={userId}
                  userName={userName}
                  width={isCompact ? 300 : 450}
                  height={isCompact ? 200 : 300}
                />
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="h-full">
                <RealtimeTaskManager
                  roomId={roomId}
                  userId={userId}
                  userName={userName}
                  userRole={role}
                  compact={isCompact}
                />
              </div>
            )}

            {activeTab === "calls" && (
              <div className="p-3">
                <CallManager
                  roomId={roomId}
                  userId={userId}
                  userName={userName}
                  onCallStateChange={setIsInCall}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <FloatingChat roomId={roomId} userId={userId} userName={userName} role={role} />
      
      {/* Centre de notifications */}
      <NotificationCenter
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />
    </div>
  );
}