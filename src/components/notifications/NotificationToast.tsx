"use client";

import { useEffect, useState } from "react";
import { getNotificationManager, Notification } from "../../lib/notifications/manager";
import { X, Bell, MessageCircle, CheckSquare, Calendar, Mail, Phone, AlertCircle, ChevronRight } from "lucide-react";

const typeIcons: Record<string, any> = {
  chat: MessageCircle,
  mention: Bell,
  file: Mail,
  task: CheckSquare,
  call: Phone,
  system: AlertCircle,
  meeting: Calendar,
  email: Mail,
};

const typeColors: Record<string, string> = {
  chat: "bg-blue-500",
  mention: "bg-purple-500",
  file: "bg-green-500",
  task: "bg-orange-500",
  call: "bg-red-500",
  system: "bg-gray-500",
  meeting: "bg-cyan-500",
  email: "bg-indigo-500",
};

export default function NotificationToast() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);
  const manager = getNotificationManager();

  useEffect(() => {
    const unsub = manager.subscribe((notifs) => {
      setNotifications(notifs);
      // Montrer uniquement les notifications non lues et récentes (moins de 30s)
      const now = Date.now();
      const recent = notifs.filter(n => !n.read && now - n.timestamp < 30000);
      setVisibleNotifications(recent.slice(0, 5)); // Max 5 toasts
    });
    return unsub;
  }, [manager]);

  const handleDismiss = (id: string) => {
    manager.markAsRead(id);
    setVisibleNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClick = (notif: Notification) => {
    manager.markAsRead(notif.id);
    setVisibleNotifications(prev => prev.filter(n => n.id !== notif.id));
    
    // Actions selon le type
    if (notif.type === "chat" && notif.data?.roomId) {
      // Ouvrir le chat via BroadcastChannel
      try {
        const bc = new BroadcastChannel("chat-control");
        bc.postMessage({ type: "open-chat", roomId: notif.data.roomId });
        bc.close();
      } catch {}
    }
  };

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full pointer-events-none">
      {visibleNotifications.map((notif) => {
        const Icon = typeIcons[notif.type] || Bell;
        const color = typeColors[notif.type] || "bg-gray-500";
        
        return (
          <div
            key={notif.id}
            className="pointer-events-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-in-right"
            style={{
              animation: "slideInRight 0.3s ease-out"
            }}
          >
            <div className="flex items-start gap-3 p-4">
              {/* Icon */}
              <div className={`flex-shrink-0 w-10 h-10 ${color} rounded-full flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleClick(notif)}>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {notif.title}
                  </h4>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatTime(notif.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                  {notif.message}
                </p>
                {notif.priority === "urgent" && (
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    Urgent
                  </span>
                )}
              </div>
              
              {/* Close button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDismiss(notif.id); }}
                className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            {/* Click to view indicator */}
            <div 
              className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => handleClick(notif)}
            >
              <span className="text-xs text-gray-500 dark:text-gray-400">Cliquez pour voir</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        );
      })}
      
      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "À l'instant";
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)}min`;
  return new Date(timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
