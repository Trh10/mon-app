"use client";

import { useEffect, useRef } from "react";
import { getRealtimeClient } from "@/lib/realtime/provider";
import { getNotificationManager } from "@/lib/notifications/manager";

/**
 * Hook pour écouter les événements en temps réel et déclencher des notifications
 */
export function useRealtimeNotifications(userId: string, userName: string) {
  const rt = getRealtimeClient();
  const manager = getNotificationManager();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Écouter les messages chat
    const offChat = rt.on("chat", (data: any) => {
      // Ne pas notifier nos propres messages
      if (data?.user?.id === userId) return;
      
      manager.addNotification({
        type: "chat",
        title: "Nouveau message",
        message: `${data?.user?.name || "Quelqu'un"}: ${(data?.payload?.text || "").slice(0, 100)}`,
        priority: "normal",
        userId: data?.user?.id,
        userName: data?.user?.name,
        data: { roomId: data?.room }
      });
    });

    // Écouter les messages privés (DM)
    const offDM = rt.on("dm", (data: any) => {
      if (data?.user?.id === userId) return;
      
      manager.addNotification({
        type: "chat",
        title: "Message privé",
        message: `${data?.user?.name || "Quelqu'un"}: ${(data?.payload?.text || "").slice(0, 100)}`,
        priority: "high",
        userId: data?.user?.id,
        userName: data?.user?.name,
        data: { 
          roomId: data?.room,
          isDM: true,
          fromUserId: data?.user?.id
        }
      });
    });

    // Écouter les tâches assignées
    const offTask = rt.on("task", (data: any) => {
      const task = data?.payload?.task || data?.task;
      if (!task) return;
      
      // Ne pas notifier si c'est nous qui avons créé la tâche
      if (task.createdBy?.id === userId) return;
      
      // Notifier seulement si la tâche nous est assignée
      if (task.userId === userId || task.assigneeId === userId) {
        manager.addNotification({
          type: "task",
          title: "Nouvelle tâche assignée",
          message: `"${task.title}" - ${task.project || "Projet"}`,
          priority: task.dueAt ? "high" : "normal",
          data: { taskId: task.id }
        });
      }
    });

    // Écouter les réunions
    const offMeeting = rt.on("meeting", (data: any) => {
      const meeting = data?.payload || data;
      if (!meeting?.title) return;
      
      manager.addNotification({
        type: "system",
        title: "Nouvelle réunion",
        message: `${meeting.title} - ${meeting.date ? new Date(meeting.date).toLocaleDateString("fr-FR") : ""}`,
        priority: "normal",
        data: { meetingId: meeting.id }
      });
    });

    // Écouter les appels entrants
    const offCall = rt.on("call", (data: any) => {
      if (data?.user?.id === userId) return;
      
      manager.addNotification({
        type: "call",
        title: "Appel entrant",
        message: `${data?.user?.name || "Quelqu'un"} vous appelle`,
        priority: "urgent",
        userId: data?.user?.id,
        userName: data?.user?.name,
        data: { callType: data?.payload?.type || "audio" }
      });
    });

    // Écouter les fichiers partagés
    const offFile = rt.on("file", (data: any) => {
      if (data?.user?.id === userId) return;
      
      const file = data?.payload;
      if (!file?.name) return;
      
      manager.addNotification({
        type: "file",
        title: "Fichier partagé",
        message: `${data?.user?.name || "Quelqu'un"} a partagé "${file.name}"`,
        priority: "normal",
        data: { fileId: file.id, fileUrl: file.url }
      });
    });

    // Écouter les mentions
    const offMention = rt.on("mention", (data: any) => {
      manager.addNotification({
        type: "mention",
        title: "Vous avez été mentionné",
        message: `Par ${data?.user?.name || "quelqu'un"} dans ${data?.payload?.context || "une conversation"}`,
        priority: "high",
        userId: data?.user?.id,
        userName: data?.user?.name,
      });
    });

    return () => {
      offChat();
      offDM();
      offTask();
      offMeeting();
      offCall();
      offFile();
      offMention();
    };
  }, [userId, userName, rt, manager]);
}

export default useRealtimeNotifications;
