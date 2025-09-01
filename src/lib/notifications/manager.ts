"use client";

// Gestionnaire avancé de notifications
export type NotificationType = "chat" | "mention" | "file" | "task" | "call" | "system";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  timestamp: number;
  read: boolean;
  userId?: string;
  userName?: string;
  roomId?: string;
  data?: any;
}

export interface NotificationSettings {
  enabled: boolean;
  sounds: boolean;
  desktop: boolean;
  soundVolume: number;
  priorities: Record<NotificationPriority, boolean>;
  types: Record<NotificationType, boolean>;
}

class NotificationManager {
  private notifications: Notification[] = [];
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private settings: NotificationSettings;

  constructor() {
    this.settings = this.loadSettings();
    this.requestPermission();
  }

  private loadSettings(): NotificationSettings {
    if (typeof window === "undefined") return this.getDefaultSettings();
    
    try {
      const saved = localStorage.getItem("notification_settings");
      return saved ? { ...this.getDefaultSettings(), ...JSON.parse(saved) } : this.getDefaultSettings();
    } catch {
      return this.getDefaultSettings();
    }
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      sounds: true,
      desktop: true,
      soundVolume: 0.7,
      priorities: { low: true, normal: true, high: true, urgent: true },
      types: { chat: true, mention: true, file: true, task: true, call: true, system: true }
    };
  }

  private saveSettings() {
    if (typeof window !== "undefined") {
      localStorage.setItem("notification_settings", JSON.stringify(this.settings));
    }
  }

  private async requestPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  private playSound(type: NotificationType) {
    if (!this.settings.sounds || typeof window === "undefined") return;
    
    // Sons basiques selon le type
    const frequencies: Record<NotificationType, number> = {
      chat: 800, mention: 1000, file: 600, task: 1200, call: 440, system: 500
    };
    
    try {
      const frequency = frequencies[type];
      const duration = type === "call" ? 500 : 200;
      
      // Bip simple avec Web Audio API
      if (window.AudioContext || (window as any).webkitAudioContext) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(this.settings.soundVolume * 0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration / 1000);
      }
    } catch (error) {
      console.warn("Erreur lecture son:", error);
    }
  }

  private showDesktopNotification(notification: Notification) {
    if (!this.settings.desktop || typeof window === "undefined" || Notification.permission !== "granted") return;
    
    const desktopNotif = new Notification(notification.title, {
      body: notification.message,
      icon: "/favicon.ico",
      tag: notification.id,
      requireInteraction: notification.priority === "urgent"
    });

    desktopNotif.onclick = () => {
      window.focus();
      this.markAsRead(notification.id);
      desktopNotif.close();
    };

    // Auto-fermer sauf pour urgent
    if (notification.priority !== "urgent") {
      setTimeout(() => desktopNotif.close(), 5000);
    }
  }

  addNotification(notif: Omit<Notification, "id" | "timestamp" | "read">) {
    if (!this.settings.enabled || !this.settings.types[notif.type] || !this.settings.priorities[notif.priority]) {
      return;
    }

    const notification: Notification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      read: false
    };

    this.notifications.unshift(notification);
    
    // Garder seulement les 100 dernières
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.playSound(notif.type);
    this.showDesktopNotification(notification);
    this.notifyListeners();
  }

  markAsRead(id: string) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif && !notif.read) {
      notif.read = true;
      this.notifyListeners();
    }
  }

  markAllAsRead() {
    let changed = false;
    this.notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
        changed = true;
      }
    });
    
    if (changed) {
      this.notifyListeners();
    }
  }

  clearNotifications() {
    this.notifications = [];
    this.notifyListeners();
  }

  getNotifications() {
    return [...this.notifications];
  }

  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.add(listener);
    listener(this.notifications); // État initial
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  getSettings() {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  // Méthodes utilitaires
  addChatNotification(message: string, userName: string, roomId: string) {
    this.addNotification({
      type: "chat",
      title: `💬 ${userName}`,
      message: message.slice(0, 100),
      priority: "normal",
      userName,
      roomId
    });
  }

  addMentionNotification(message: string, userName: string, roomId: string) {
    this.addNotification({
      type: "mention",
      title: `🔔 ${userName} vous a mentionné`,
      message: message.slice(0, 100),
      priority: "high",
      userName,
      roomId
    });
  }

  addFileNotification(fileName: string, userName: string) {
    this.addNotification({
      type: "file",
      title: `📎 Nouveau fichier`,
      message: `${userName} a partagé ${fileName}`,
      priority: "normal",
      userName
    });
  }

  addTaskNotification(taskTitle: string, userName: string) {
    this.addNotification({
      type: "task",
      title: `✅ Nouvelle tâche`,
      message: `${userName}: ${taskTitle}`,
      priority: "high",
      userName
    });
  }
}

// Instance globale
let globalNotificationManager: NotificationManager | null = null;

export function getNotificationManager(): NotificationManager {
  if (!globalNotificationManager) {
    globalNotificationManager = new NotificationManager();
  }
  return globalNotificationManager;
}