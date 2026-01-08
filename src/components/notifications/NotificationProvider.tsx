"use client";

import { createContext, useContext, useCallback, useState } from "react";
import NotificationToast from "./NotificationToast";

export type NotificationType = "email" | "chat" | "task";

interface NotificationContextType {
  playNotification: (type: NotificationType) => void;
  isEnabled: boolean;
  toggleNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("notifications-enabled") !== "false";
    }
    return true;
  });

  const playNotification = useCallback((type: NotificationType) => {
    if (!isEnabled) return;

    try {
      const audio = new Audio(`/sounds/${type}.mp3`);
      audio.volume = 0.5;
      audio.play().catch(err => {
        console.warn(`Impossible de jouer le son ${type}:`, err);
      });
    } catch (error) {
      console.warn(`Erreur audio ${type}:`, error);
    }
  }, [isEnabled]);

  const toggleNotifications = useCallback(() => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    if (typeof window !== "undefined") {
      localStorage.setItem("notifications-enabled", String(newState));
    }
  }, [isEnabled]);

  return (
    <NotificationContext.Provider value={{
      playNotification,
      isEnabled,
      toggleNotifications
    }}>
      {children}
      {/* Toast notifications en haut à droite */}
      <NotificationToast />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification doit être utilisé dans NotificationProvider");
  }
  return context;
}
