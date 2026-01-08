"use client";

import { useEffect, useRef } from "react";
import { rtClient, getStableUserId } from "@/lib/realtime/provider";
import { getNotificationManager } from "@/lib/notifications/manager";
import { useCodeAuth } from "@/components/auth/CodeAuthContext";

/**
 * Hook qui écoute les messages en temps réel et génère des notifications.
 * À utiliser dans un composant de haut niveau (layout ou App).
 */
export function useChatNotifications() {
  const { user } = useCodeAuth();
  const connectedRef = useRef(false);
  const notificationManager = getNotificationManager();
  
  const userId = user?.id || getStableUserId();
  const userName = user?.name || "Utilisateur";
  const companyId = user?.companyId || user?.company || "default";

  useEffect(() => {
    if (typeof window === "undefined" || connectedRef.current) return;
    
    // Se connecter au flux temps réel pour la room de l'entreprise
    const roomId = `company:${companyId}:main`;
    
    // On ne connecte pas ici car c'est fait dans CollabPanel
    // On écoute juste les événements
    
    // Écouter les messages de chat public
    const offChat = rtClient.on("chat", (data: any) => {
      if (data?.payload?.text && data?.user?.id) {
        const isMe = String(data.user.id) === String(userId);
        
        // Ne pas notifier pour ses propres messages
        if (!isMe) {
          const senderName = data.user.name || "Quelqu'un";
          const messageText = data.payload.text;
          
          // Vérifier si l'utilisateur est mentionné
          const isMentioned = messageText.toLowerCase().includes(`@${userName.toLowerCase()}`) ||
                             messageText.includes(`@${userId}`);
          
          if (isMentioned) {
            notificationManager.addMentionNotification(messageText, senderName, roomId);
          } else {
            notificationManager.addChatNotification(messageText, senderName, roomId);
          }
        }
      }
    });
    
    // Écouter les DM
    const offDM = rtClient.on("dm", (data: any) => {
      if (data?.payload?.text && data?.user?.id) {
        const isMe = String(data.user.id) === String(userId);
        const toUserId = data.payload.toUserId;
        
        // Notifier seulement si c'est pour moi et pas de moi
        if (!isMe && String(toUserId) === String(userId)) {
          const senderName = data.user.name || "Quelqu'un";
          const messageText = data.payload.text;
          
          notificationManager.addNotification({
            type: "chat",
            title: `💬 Message privé de ${senderName}`,
            message: messageText.slice(0, 100),
            priority: "high",
            userName: senderName,
            roomId: `dm:${data.user.id}`
          });
        }
      }
    });
    
    connectedRef.current = true;
    
    return () => {
      offChat();
      offDM();
      connectedRef.current = false;
    };
  }, [userId, userName, companyId, notificationManager]);
}

export default useChatNotifications;
