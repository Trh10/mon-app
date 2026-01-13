"use client";

// Gestionnaire de synchronisation totale équipe + chat + DM
import { getRealtimeClient } from "./provider";
import { getNotificationManager } from "../notifications/manager";
import { COMPANY_DEFAULT, LEGACY_COMPANY_IDS } from "@/config/branding";

type Role = "chef" | "manager" | "assistant" | "employe" | "Directeur Général" | "Administration" | "Finance" | "Comptable" | "Assistant" | "Assistante" | "Employé" | string;
type User = { id: string; name: string; role: Role };
type UserStatus = "online" | "away" | "busy" | "offline";

interface TeamMember extends User {
  status: UserStatus;
  lastSeen: number;
  isTyping?: boolean;
  currentRoom?: string;
  avatar?: string;
}

interface SyncState {
  teamMembers: Map<string, TeamMember>;
  activeRooms: Set<string>;
  userStatuses: Map<string, UserStatus>;
  typingUsers: Map<string, { room: string; timestamp: number }>;
  unreadCounts: Map<string, number>; // par userId pour DM
}

class TeamSyncManager {
  private rt = getRealtimeClient();
  private notifications = getNotificationManager();
  private state: SyncState = {
    teamMembers: new Map(),
    activeRooms: new Set(),
    userStatuses: new Map(),
    typingUsers: new Map(),
    unreadCounts: new Map(),
  };
  private listeners: Array<() => void> = [];
  private currentUser: User | null = null;
  // Utilise l'ID entreprise par défaut (ou premier legacy) pour nommer la room principale
  private mainRoom: string = `company:${LEGACY_COMPANY_IDS[0] || COMPANY_DEFAULT.toLowerCase()}:main`;
  
  // Callbacks pour mise à jour UI
  private onTeamUpdate?: (members: TeamMember[]) => void;
  private onStatusUpdate?: (userId: string, status: UserStatus) => void;
  private onTypingUpdate?: (users: string[]) => void;
  private onUnreadUpdate?: (counts: Map<string, number>) => void;

  initialize(user: User, callbacks?: {
    onTeamUpdate?: (members: TeamMember[]) => void;
    onStatusUpdate?: (userId: string, status: UserStatus) => void;
    onTypingUpdate?: (users: string[]) => void;
    onUnreadUpdate?: (counts: Map<string, number>) => void;
  }) {
    this.currentUser = user;
    if (callbacks) {
      this.onTeamUpdate = callbacks.onTeamUpdate;
      this.onStatusUpdate = callbacks.onStatusUpdate;
      this.onTypingUpdate = callbacks.onTypingUpdate;
      this.onUnreadUpdate = callbacks.onUnreadUpdate;
    }

    this.rt.setUser(user);
    this.setupListeners();
    this.startHeartbeat();
    
    console.log(`🔄 Synchronisation totale initialisée pour ${user.name} (${user.role})`);
  }

  private setupListeners() {
    // 1. PRÉSENCE ÉQUIPE GLOBALE
    this.listeners.push(
      this.rt.subscribe(this.mainRoom, "presence", (data) => {
        if (Array.isArray(data?.members)) {
          data.members.forEach((member: any) => {
            this.state.teamMembers.set(member.id, {
              ...member,
              status: member.status || "online",
              lastSeen: member.lastSeen || Date.now(),
            });
            this.state.userStatuses.set(member.id, member.status || "online");
          });
          this.notifyTeamUpdate();
        }
      })
    );

    // 2. STATUTS UTILISATEURS (diffusés sur équipe)
    this.listeners.push(
      this.rt.subscribe(this.mainRoom, "user_status", (data) => {
        const { userId, status } = data.payload || {};
        if (userId && status) {
          this.state.userStatuses.set(userId, status);
          const member = this.state.teamMembers.get(userId);
          if (member) {
            member.status = status;
            this.state.teamMembers.set(userId, member);
          }
          this.onStatusUpdate?.(userId, status);
          this.notifyTeamUpdate();
        }
      })
    );

    // 3. INDICATEURS DE FRAPPE (toutes rooms)
    this.listeners.push(
      this.rt.subscribe(this.mainRoom, "typing", (data) => {
        this.handleTyping(data, this.mainRoom);
      })
    );

    // 4. CHAT PUBLIC (room principale)
    this.listeners.push(
      this.rt.subscribe(this.mainRoom, "chat", (data) => {
        this.handlePublicMessage(data);
      })
    );

    // 5. MESSAGES PRIVÉS (canal personnel)
    if (this.currentUser) {
      this.listeners.push(
        this.rt.subscribe(`user:${this.currentUser.id}`, "dm", (data) => {
          this.handlePrivateMessage(data);
        })
      );
    }

    // 6. FICHIERS PARTAGÉS
    this.listeners.push(
      this.rt.subscribe(this.mainRoom, "file", (data) => {
        this.handleFileShared(data, "public");
      })
    );

    if (this.currentUser) {
      this.listeners.push(
        this.rt.subscribe(`user:${this.currentUser.id}`, "file", (data) => {
          this.handleFileShared(data, "private");
        })
      );
    }

    // 7. TÂCHES ASSIGNÉES
    if (this.currentUser) {
      this.listeners.push(
        this.rt.subscribe(`user:${this.currentUser.id}`, "task", (data) => {
          this.handleTaskAssigned(data);
        })
      );
    }
  }

  private handleTyping(data: any, room: string) {
    const userId = data?.user?.id;
    const isTyping = Boolean(data?.payload?.typing);
    
    if (!userId || userId === this.currentUser?.id) return;

    if (isTyping) {
      this.state.typingUsers.set(userId, { room, timestamp: Date.now() });
    } else {
      this.state.typingUsers.delete(userId);
    }

    // Mettre à jour le membre dans l'équipe
    const member = this.state.teamMembers.get(userId);
    if (member) {
      member.isTyping = isTyping;
      member.currentRoom = isTyping ? room : undefined;
      this.state.teamMembers.set(userId, member);
    }

    this.notifyTypingUpdate();
    this.notifyTeamUpdate();
  }

  private handlePublicMessage(data: any) {
    const user = data?.user;
    const text = data?.payload?.text || "";
    
    if (!user || user.id === this.currentUser?.id) return;

    // Notification si pas focus sur la fenêtre
    if (!document.hasFocus()) {
      this.notifications.addChatNotification(
        text.slice(0, 100),
        user.name,
        this.mainRoom
      );
    }

    // Marquer l'utilisateur comme actif
    const member = this.state.teamMembers.get(user.id);
    if (member) {
      member.lastSeen = Date.now();
      member.status = "online";
      this.state.teamMembers.set(user.id, member);
      this.state.userStatuses.set(user.id, "online");
    }

    this.notifyTeamUpdate();
  }

  private handlePrivateMessage(data: any) {
    const fromUser = data?.user;
    const text = data?.payload?.text || "";
    
    if (!fromUser || fromUser.id === this.currentUser?.id) return;

    // Incrémenter compteur non lu
    const current = this.state.unreadCounts.get(fromUser.id) || 0;
    this.state.unreadCounts.set(fromUser.id, current + 1);

    // Notification
    this.notifications.addChatNotification(
      text.slice(0, 100),
      `${fromUser.name} (privé)`,
      `dm:${fromUser.id}`
    );

    // Marquer l'expéditeur comme actif
    const member = this.state.teamMembers.get(fromUser.id);
    if (member) {
      member.lastSeen = Date.now();
      member.status = "online";
      this.state.teamMembers.set(fromUser.id, member);
    }

    this.onUnreadUpdate?.(this.state.unreadCounts);
    this.notifyTeamUpdate();
  }

  private handleFileShared(data: any, scope: "public" | "private") {
    const user = data?.user;
    const fileName = data?.payload?.name || "Fichier";
    
    if (!user || user.id === this.currentUser?.id) return;

    this.notifications.addFileNotification(
      fileName,
      user.name
    );

    // Marquer comme actif
    const member = this.state.teamMembers.get(user.id);
    if (member) {
      member.lastSeen = Date.now();
      this.state.teamMembers.set(user.id, member);
    }

    this.notifyTeamUpdate();
  }

  private handleTaskAssigned(data: any) {
    const user = data?.user;
    const task = data?.payload?.task;
    
    if (!user || !task) return;

    this.notifications.addTaskNotification(
      task.title || "Nouvelle tâche",
      user.name
    );
  }

  private startHeartbeat() {
    // Heartbeat pour maintenir la présence et nettoyer les indicateurs de frappe
    setInterval(() => {
      if (this.currentUser) {
        this.rt.trigger(this.mainRoom, "heartbeat", {
          userId: this.currentUser.id,
          timestamp: Date.now(),
        }).catch(() => {});
      }

      // Nettoyer les indicateurs de frappe expirés (>5s)
      const now = Date.now();
      for (const [userId, typing] of this.state.typingUsers.entries()) {
        if (now - typing.timestamp > 5000) {
          this.state.typingUsers.delete(userId);
          const member = this.state.teamMembers.get(userId);
          if (member) {
            member.isTyping = false;
            this.state.teamMembers.set(userId, member);
          }
        }
      }
      
      this.notifyTypingUpdate();
      this.notifyTeamUpdate();
    }, 10000); // Toutes les 10 secondes
  }

  // Méthodes publiques pour l'UI
  sendPublicMessage(text: string) {
    return this.rt.sendChat(this.mainRoom, text);
  }

  async sendPrivateMessage(toUserId: string, text: string) {
    const dmRoom = this.getDmRoom(this.currentUser?.id || "", toUserId);
    await this.rt.trigger(dmRoom, "dm", {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text,
      toUserId,
    });
  }

  setTyping(isTyping: boolean, room?: string) {
    const targetRoom = room || this.mainRoom;
    this.rt.trigger(targetRoom, "typing", { typing: isTyping }).catch(() => {});
  }

  changeStatus(status: UserStatus) {
    if (!this.currentUser) return;
    
    this.state.userStatuses.set(this.currentUser.id, status);
    const member = this.state.teamMembers.get(this.currentUser.id);
    if (member) {
      member.status = status;
      this.state.teamMembers.set(this.currentUser.id, member);
    }

    this.rt.trigger(this.mainRoom, "user_status", {
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      status,
      timestamp: Date.now(),
    }).catch(() => {});

    this.notifyTeamUpdate();
  }

  markDmAsRead(userId: string) {
    this.state.unreadCounts.delete(userId);
    this.onUnreadUpdate?.(this.state.unreadCounts);
  }

  joinRoom(roomId: string) {
    this.state.activeRooms.add(roomId);
    
    // Ajouter les listeners pour cette room si pas déjà fait
    this.listeners.push(
      this.rt.subscribe(roomId, "chat", (data) => this.handlePublicMessage(data))
    );
    this.listeners.push(
      this.rt.subscribe(roomId, "typing", (data) => this.handleTyping(data, roomId))
    );
  }

  leaveRoom(roomId: string) {
    this.state.activeRooms.delete(roomId);
    // Note: les listeners seront nettoyés au destroy
  }

  // Getters pour l'UI
  getTeamMembers(): TeamMember[] {
    return Array.from(this.state.teamMembers.values());
  }

  getOnlineMembers(): TeamMember[] {
    return this.getTeamMembers().filter(m => m.status === "online");
  }

  getTypingUsers(): string[] {
    return Array.from(this.state.typingUsers.keys());
  }

  getUnreadCounts(): Map<string, number> {
    return new Map(this.state.unreadCounts);
  }

  getUserStatus(userId: string): UserStatus {
    return this.state.userStatuses.get(userId) || "offline";
  }

  // Helpers privés
  private getDmRoom(userId1: string, userId2: string): string {
    const [a, b] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    return `dm:${a}:${b}`;
  }

  private notifyTeamUpdate() {
    this.onTeamUpdate?.(this.getTeamMembers());
  }

  private notifyTypingUpdate() {
    this.onTypingUpdate?.(this.getTypingUsers());
  }

  destroy() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
    this.state = {
      teamMembers: new Map(),
      activeRooms: new Set(),
      userStatuses: new Map(),
      typingUsers: new Map(),
      unreadCounts: new Map(),
    };
  }
}

// Instance globale
const g = globalThis as any;
if (!g.__TEAM_SYNC) g.__TEAM_SYNC = new TeamSyncManager();

export function getTeamSyncManager(): TeamSyncManager {
  return g.__TEAM_SYNC;
}

export type { TeamMember, UserStatus };
