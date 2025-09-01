"use client";

import { useEffect, useState } from "react";
import AIPanel from "./IA/AIPanel";
import CollabPanel from "./Collab/CollabPanel";
import FloatingChat from "./Collab/FloatingChat";
import { GlobalNotificationBadge } from "./notifications/NotificationBadge";

export default function AppMounts() {
  const [dev, setDev] = useState(false);
  const [showCollab, setShowCollab] = useState(false);
  const [chatHidden, setChatHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("__float_chat_hidden") === "1";
  });
  
  useEffect(() => { 
    setDev(process.env.NODE_ENV !== "production"); 
  }, []);

  // Écouter les changements d'état du chat
  useEffect(() => {
    const checkChatHidden = () => {
      setChatHidden(localStorage.getItem("__float_chat_hidden") === "1");
    };
    
    const interval = setInterval(checkChatHidden, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <AIPanel />
      
      {/* Bouton de collaboration flottant */}
      <button
        onClick={() => setShowCollab(!showCollab)}
        className="fixed top-4 right-4 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-40"
        title="Ouvrir la collaboration"
      >
        <div className="relative">
          👥
          <GlobalNotificationBadge className="absolute -top-2 -right-2" />
        </div>
      </button>

      {/* Panel de collaboration */}
      {showCollab && (
        <CollabPanel
          roomId="main-workspace"
          userName="Utilisateur"
          role="manager"
          onClose={() => setShowCollab(false)}
        />
      )}

      {/* Chat flottant (toujours disponible) */}
      <FloatingChat
        roomId="main-workspace"
        userId="user-main"
        userName="Utilisateur"
        role="manager"
      />

      {/* Bouton pour rouvrir le chat quand fermé */}
      {chatHidden && (
        <button
          onClick={() => {
            localStorage.setItem("__float_chat_hidden", "0");
            setChatHidden(false);
          }}
          className="fixed right-4 bottom-4 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-30"
          title="Ouvrir le chat"
        >
          💬
        </button>
      )}

      {dev && (
        <div className="fixed left-4 bottom-4 space-y-2">
          <button
            onClick={() => (window as any).__aiOpen?.({ summary: "Test IA (dev)", highlights: ["Point A","Point B"], actions:["Appeler"] })}
            className="block px-2 py-1 text-xs border rounded bg-white shadow"
            title="Tester l'ouverture du panneau IA"
          >
            Test IA
          </button>
          <button
            onClick={() => setShowCollab(true)}
            className="block px-2 py-1 text-xs border rounded bg-white shadow"
            title="Ouvrir collaboration"
          >
            Test Collab
          </button>
        </div>
      )}
    </>
  );
}