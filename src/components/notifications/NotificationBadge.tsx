"use client";

import { useState, useEffect } from "react";
import { getNotificationManager, type Notification } from "../../lib/notifications/manager";

interface NotificationBadgeProps {
  className?: string;
  showZero?: boolean;
  maxCount?: number;
  type?: "all" | "chat" | "mention" | "file" | "task";
}

export default function NotificationBadge({ 
  className = "", 
  showZero = false, 
  maxCount = 99,
  type = "all" 
}: NotificationBadgeProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationManager = getNotificationManager();

  useEffect(() => {
    const unsubscribe = notificationManager.subscribe(setNotifications);
    return unsubscribe;
  }, [notificationManager]);

  const getCount = () => {
    if (type === "all") {
      return notificationManager.getUnreadCount();
    }
    return notifications.filter(n => !n.read && n.type === type).length;
  };

  const count = getCount();

  if (count === 0 && !showZero) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <span 
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full ${className}`}
      title={`${count} notification${count > 1 ? 's' : ''} non lue${count > 1 ? 's' : ''}`}
    >
      {displayCount}
    </span>
  );
}

// Badge pour le bouton global de collaboration
export function GlobalNotificationBadge({ className = "" }: { className?: string }) {
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const notificationManager = getNotificationManager();

  useEffect(() => {
    const unsubscribe = notificationManager.subscribe(() => {
      const newCount = notificationManager.getUnreadCount();
      if (newCount > count) {
        // Nouvelle notification - déclencher l'animation
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000);
      }
      setCount(newCount);
    });
    return unsubscribe;
  }, [notificationManager, count]);

  if (count === 0) return null;

  return (
    <span 
      className={`
        absolute -top-1 -right-1 inline-flex items-center justify-center 
        min-w-[18px] h-[18px] px-1 text-xs font-bold text-white 
        bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg
        ${isAnimating ? 'animate-bounce' : ''}
        ${className}
      `}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
