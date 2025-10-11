"use client";

import { useEffect, useState } from "react";

interface RealtimeNotification {
  id: string;
  type: "message" | "presence" | "mention";
  title: string;
  message: string;
  timestamp: number;
  userId?: string;
}

export default function RealtimeNotifications({ userId }: { userId?: string }) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);

  // Afficher une notification
  const showNotification = (notif: RealtimeNotification) => {
    setNotifications(prev => [notif, ...prev.slice(0, 4)]); // Max 5 notifications
    
    // Notification navigateur si permission accordée
    if (Notification.permission === "granted") {
      new Notification(notif.title, {
        body: notif.message,
        icon: "/logo.svg",
        badge: "/logo.svg"
      });
    }
    
    // Auto-hide après 5 secondes
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    }, 5000);
  };

  useEffect(() => {
    if (!userId) return;

    // Demander permission pour les notifications navigateur
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Fonction pour créer une notification depuis un événement chat
    const handleNewMessage = (data: any) => {
      if (data.messages && data.messages.length > 0) {
        const lastMessage = data.messages[data.messages.length - 1];
        
        // Ne pas notifier ses propres messages
        if (lastMessage.user.id === userId) return;
        
        showNotification({
          id: `msg-${lastMessage.timestamp || Date.now()}`,
          type: "message",
          title: `💬 ${lastMessage.user.name}`,
          message: lastMessage.text.slice(0, 100) + (lastMessage.text.length > 100 ? "..." : ""),
          timestamp: lastMessage.timestamp || Date.now(),
          userId: lastMessage.user.id
        });
      }
    };

    // Exposer la fonction globalement pour que le SSE puisse l'appeler
    (window as any).showChatNotification = handleNewMessage;

    return () => {
      delete (window as any).showChatNotification;
    };
  }, [userId]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80 max-w-96 pointer-events-auto transform transition-all duration-300 ease-out animate-slide-in"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${
                  notif.type === "message" ? "bg-blue-500" :
                  notif.type === "mention" ? "bg-red-500" :
                  "bg-green-500"
                }`} />
                <span className="font-medium text-gray-900 text-sm">{notif.title}</span>
                <span className="text-xs text-gray-500">
                  {new Date(notif.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-gray-600">{notif.message}</p>
            </div>
            <button
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
              className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Styles à ajouter dans globals.css :
/*
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
*/
