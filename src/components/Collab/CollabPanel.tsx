"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { rtClient } from "@/lib/realtime/provider";
import { getNotificationManager } from "@/lib/notifications/manager";
import {
  X, Send, Smile, Hash, Volume2, Users, Search, Reply, Trash2,
  MessageCircle, Plus, ArrowLeft, Lock, Phone, Video, Mic, MicOff,
  Image, Paperclip, Gift, AtSign, Pin, Edit3, Copy, Forward,
  MoreHorizontal, Check, CheckCheck, Clock, Star, Bell, BellOff,
  Settings, Maximize2, Minimize2, ChevronDown, Heart, ThumbsUp,
  Laugh, Frown, Angry, AlertCircle, File, Download, Play, Pause,
  Camera, Headphones, PhoneOff, VideoOff, ScreenShare, UserPlus,
  Crown, Shield, Zap, Bookmark, Flag, Trash, Archive, Filter
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface CollabPanelProps {
  roomId: string;
  userId: string;
  userName: string;
  role: string;
  onClose: () => void;
  initialPrivateChat?: { id: string; name: string } | null;
  initialCall?: { type: "audio" | "video"; target: { id: string; name: string } } | null;
}

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userRole?: string;
  timestamp: number;
  isMe: boolean;
  read?: boolean;
  isPrivate?: boolean;
  toUserId?: string;
  reactions?: { emoji: string; users: string[] }[];
  replyTo?: { id: string; userName: string; content: string };
  attachments?: { type: "image" | "file" | "audio" | "video"; url: string; name: string; size?: number }[];
  isEdited?: boolean;
  isPinned?: boolean;
  isStarred?: boolean;
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
  mentions?: string[];
}

interface OnlineUser {
  id: string;
  name: string;
  role: string;
  status: "online" | "idle" | "offline" | "dnd";
  avatar?: string;
  lastSeen?: number;
  isTyping?: boolean;
  customStatus?: string;
}

interface TypingUser {
  id: string;
  name: string;
  timestamp: number;
}

interface CallState {
  active: boolean;
  type: "audio" | "video";
  participants: string[];
  isMuted: boolean;
  isVideoOff: boolean;
  duration: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const EMOJI_CATEGORIES = {
  recent: ["👍", "❤️", "😂", "🎉", "🚀", "👀", "😮", "🔥"],
  smileys: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐"],
  gestures: ["👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👋", "🤚", "🖐️", "✋", "🖖", "👏", "🙌", "🤲", "🤝", "🙏", "💪", "🦾", "🦿"],
  hearts: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟"],
  objects: ["🎉", "🎊", "🎁", "🏆", "🥇", "🥈", "🥉", "⚽", "🏀", "🎮", "🎯", "🎨", "🎭", "🎪", "🎬", "🎤", "🎧", "🎼", "🎹", "🎸", "🎺", "🎻", "🪘", "🥁"],
  symbols: ["✅", "❌", "⭐", "🌟", "💫", "✨", "⚡", "🔥", "💥", "💢", "💦", "💨", "🕳️", "💣", "💬", "👁️‍🗨️", "🗨️", "🗯️", "💭", "💤", "🚀", "🛸", "🎯", "🎪"]
};

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🚀"];

const ROLE_CONFIG: Record<string, { color: string; label: string; icon: string; gradient: string }> = {
  // Nouveaux rôles
  "Directeur Général": { color: "#f59e0b", label: "Directeur Général", icon: "👑", gradient: "from-amber-500 to-yellow-500" },
  "Administration": { color: "#8b5cf6", label: "Administration", icon: "📋", gradient: "from-violet-500 to-purple-500" },
  "Finance": { color: "#10b981", label: "Finance", icon: "💰", gradient: "from-emerald-500 to-green-500" },
  "Comptable": { color: "#10b981", label: "Comptable", icon: "📊", gradient: "from-emerald-500 to-teal-500" },
  "Assistant": { color: "#3b82f6", label: "Assistant", icon: "💼", gradient: "from-blue-500 to-cyan-500" },
  "Assistante": { color: "#3b82f6", label: "Assistante", icon: "💼", gradient: "from-blue-500 to-cyan-500" },
  "Employé": { color: "#6b7280", label: "Employé", icon: "👤", gradient: "from-gray-500 to-gray-600" },
  // Anciens rôles (compatibilité)
  "Chef": { color: "#f59e0b", label: "Directeur Général", icon: "👑", gradient: "from-amber-500 to-orange-500" },
  "Manager": { color: "#8b5cf6", label: "Manager", icon: "🎯", gradient: "from-violet-500 to-purple-500" },
  "chef": { color: "#f59e0b", label: "Directeur Général", icon: "👑", gradient: "from-amber-500 to-orange-500" },
  "manager": { color: "#8b5cf6", label: "Administration", icon: "📋", gradient: "from-violet-500 to-purple-500" },
  "assistant": { color: "#3b82f6", label: "Assistant", icon: "💼", gradient: "from-blue-500 to-cyan-500" },
  "employe": { color: "#6b7280", label: "Employé", icon: "👤", gradient: "from-gray-500 to-gray-600" },
  "admin": { color: "#f59e0b", label: "Directeur Général", icon: "👑", gradient: "from-amber-500 to-yellow-500" },
};

const STATUS_CONFIG = {
  online: { color: "bg-green-500", label: "En ligne", ring: "ring-green-500/30" },
  idle: { color: "bg-yellow-500", label: "Absent", ring: "ring-yellow-500/30" },
  dnd: { color: "bg-red-500", label: "Ne pas déranger", ring: "ring-red-500/30" },
  offline: { color: "bg-gray-500", label: "Hors ligne", ring: "ring-gray-500/30" },
};

const getRoleConfig = (role: string) => ROLE_CONFIG[role] || { color: "#6b7280", label: role || "", icon: "👤", gradient: "from-gray-500 to-gray-600" };

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function CollabPanel({ roomId, userId, userName, role, onClose, initialPrivateChat }: CollabPanelProps) {
  // Core State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State
  const [showMembers, setShowMembers] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null);
  const [privateChat, setPrivateChat] = useState<OnlineUser | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState<OnlineUser | null>(null);
  const [messageReactionPicker, setMessageReactionPicker] = useState<string | null>(null);
  
  // Typing & Call State
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [callState, setCallState] = useState<CallState | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [privateConversations, setPrivateConversations] = useState<OnlineUser[]>([]);
  const [showDMList, setShowDMList] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const loadedRef = useRef(false);
  const connectedRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const safeUserId = userId ? String(userId) : "";
  const safeUserName = userName || "Utilisateur";
  const safeRoomId = roomId || "main";

  // ─────────────────────────────────────────────────────────────────────────────
  // Load History
  // ─────────────────────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const res = await fetch("/api/realtime/history?room=" + encodeURIComponent(safeRoomId) + "&limit=100");
      if (res.ok) {
        const data = await res.json();
        if (data.items && Array.isArray(data.items)) {
          const history = data.items.map((item: any) => ({
            id: item.id || item.ts?.toString() || Date.now().toString(),
            text: item.text || item.payload?.text || "",
            userId: String(item.user?.id || item.userId || ""),
            userName: item.user?.name || item.userName || "Utilisateur",
            userRole: item.user?.role || "",
            timestamp: item.ts || item.timestamp || Date.now(),
            isMe: String(item.user?.id || item.userId) === safeUserId,
            read: true,
            isPrivate: false
          })).filter((m: Message) => m.text);
          setMessages(history);
        }
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [safeRoomId, safeUserId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Connection & Events
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Marquer toutes les notifications de chat comme lues quand le panel est ouvert
  useEffect(() => {
    const notificationManager = getNotificationManager();
    notificationManager.markAllAsRead();
  }, []);
  
  useEffect(() => {
    if (!safeUserId || connectedRef.current) return;
    connectedRef.current = true;
    rtClient.connect(safeRoomId, safeUserId, safeUserName, role);
    loadHistory();
    return () => { connectedRef.current = false; };
  }, [safeRoomId, safeUserId, safeUserName, role, loadHistory]);

  useEffect(() => {
    const handlePresence = (data: any) => {
      if (Array.isArray(data?.members)) {
        const members = data.members.filter((u: any) => u?.id && u?.name).map((u: any) => ({
          id: String(u.id),
          name: u.name,
          role: u.role || "employe",
          status: "online" as const
        }));
        // Remplacer les utilisateurs en ligne et mettre à jour le statut des autres
        setOnlineUsers(prev => {
          const onlineNames = new Set(members.map((m: OnlineUser) => m.name.toLowerCase()));
          // Garder les utilisateurs offline qui ne sont pas dans la nouvelle liste
          const offlineUsers = prev
            .filter(u => !onlineNames.has(u.name.toLowerCase()))
            .map(u => ({ ...u, status: "offline" as const }));
          // Dédupliquer par nom
          const seenNames = new Set<string>();
          const uniqueMembers = members.filter((m: OnlineUser) => {
            const key = m.name.toLowerCase();
            if (seenNames.has(key)) return false;
            seenNames.add(key);
            return true;
          });
          const uniqueOffline = offlineUsers.filter((u: OnlineUser) => {
            const key = u.name.toLowerCase();
            if (seenNames.has(key)) return false;
            seenNames.add(key);
            return true;
          });
          return [...uniqueMembers, ...uniqueOffline];
        });
      }
    };
    const off1 = rtClient.on("presence", handlePresence);
    const off2 = rtClient.on("presence:join", handlePresence);
    const off3 = rtClient.on("presence:leave", handlePresence);
    const off4 = rtClient.on("presence:state", handlePresence);
    return () => { off1(); off2(); off3(); off4(); };
  }, []);

  // Load organization members
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const members = data.filter((u: any) => u?.id && u?.name && String(u.id) !== safeUserId).map((u: any) => ({
              id: String(u.id),
              name: u.name,
              role: u.role || "employe",
              status: "offline" as const,
              lastSeen: Date.now() - Math.random() * 3600000
            }));
            setOnlineUsers(prev => {
              // Merge with existing online users - dédupliquer par NOM (pas ID car ils peuvent différer)
              const existingNames = new Set(prev.map(u => u.name.toLowerCase()));
              const newMembers = members.filter((m: OnlineUser) => !existingNames.has(m.name.toLowerCase()));
              return [...prev, ...newMembers];
            });
          }
        }
      } catch (err) {
        console.error("Failed to load members:", err);
      }
    };
    loadMembers();
  }, [safeUserId]);

  useEffect(() => {
    const handleChat = (data: any) => {
      if (data?.payload?.text && data?.user?.id) {
        const newMsg: Message = {
          id: data.payload.id || Date.now().toString(),
          text: data.payload.text,
          userId: String(data.user.id),
          userName: data.user.name || "Anonyme",
          userRole: data.user.role,
          timestamp: data.ts || Date.now(),
          isMe: String(data.user.id) === safeUserId,
          read: true,
          isPrivate: false
        };
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
      }
    };
    return rtClient.on("chat", handleChat);
  }, [safeUserId]);

  useEffect(() => {
    const handleDM = (data: any) => {
      if (data?.payload?.text && data?.user?.id) {
        const newMsg: Message = {
          id: data.payload.id || Date.now().toString(),
          text: data.payload.text,
          userId: String(data.user.id),
          userName: data.user.name || "Anonyme",
          userRole: data.user.role,
          timestamp: data.ts || Date.now(),
          isMe: String(data.user.id) === safeUserId,
          read: true,
          isPrivate: true,
          toUserId: data.payload.toUserId
        };
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
      }
    };
    return rtClient.on("dm", handleDM);
  }, [safeUserId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Typing Events
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleTypingStart = (data: any) => {
      if (data?.user?.id && data.user.id !== safeUserId) {
        setTypingUsers(prev => {
          const exists = prev.some(u => u.id === data.user.id);
          if (exists) return prev.map(u => u.id === data.user.id ? { ...u, timestamp: Date.now() } : u);
          return [...prev, { id: data.user.id, name: data.user.name || "Quelqu'un", timestamp: Date.now() }];
        });
      }
    };
    const handleTypingStop = (data: any) => {
      if (data?.user?.id || data?.payload?.userId) {
        const uid = data.user?.id || data.payload.userId;
        setTypingUsers(prev => prev.filter(u => u.id !== uid));
      }
    };
    const off1 = rtClient.on("typing:start", handleTypingStart);
    const off2 = rtClient.on("typing:stop", handleTypingStop);
    const off3 = rtClient.on("typing", (data: any) => {
      if (data?.payload?.typing) handleTypingStart(data);
      else handleTypingStop(data);
    });
    return () => { off1(); off2(); off3(); };
  }, [safeUserId]);

  // Auto-cleanup typing users after 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => prev.filter(u => now - u.timestamp < 5000));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Reaction Events
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleReaction = (data: any) => {
      const { messageId, emoji, action } = data?.payload || {};
      const fromUserId = data?.user?.id;
      if (!messageId || !emoji || !fromUserId) return;
      
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        const reactions = [...(m.reactions || [])];
        const existing = reactions.find(r => r.emoji === emoji);
        
        if (action === "remove") {
          if (existing) {
            existing.users = existing.users.filter(u => u !== fromUserId);
            if (existing.users.length === 0) {
              return { ...m, reactions: reactions.filter(r => r.emoji !== emoji) };
            }
          }
        } else {
          if (existing) {
            if (!existing.users.includes(fromUserId)) {
              existing.users = [...existing.users, fromUserId];
            }
          } else {
            reactions.push({ emoji, users: [fromUserId] });
          }
        }
        return { ...m, reactions };
      }));
    };
    return rtClient.on("reaction", handleReaction);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Message Delete Events
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleDelete = (data: any) => {
      const messageId = data?.payload?.messageId;
      if (messageId) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    };
    return rtClient.on("message:delete", handleDelete);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Message Edit Events
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleEdit = (data: any) => {
      const { messageId, text } = data?.payload || {};
      if (messageId && text) {
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, text, isEdited: true } : m
        ));
      }
    };
    return rtClient.on("message:edit", handleEdit);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const h = () => setContextMenu(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  useEffect(() => {
    if (initialPrivateChat) {
      setPrivateChat({
        id: initialPrivateChat.id,
        name: initialPrivateChat.name,
        role: "",
        status: "online"
      });
    }
  }, [initialPrivateChat]);

  // Charger l'historique des DMs quand une conversation privée est ouverte
  useEffect(() => {
    if (!privateChat) return;
    
    const loadDMHistory = async () => {
      try {
        // Créer la room DM avec les IDs triés
        const [a, b] = safeUserId < privateChat.id ? [safeUserId, privateChat.id] : [privateChat.id, safeUserId];
        const dmRoom = `dm:${a}:${b}`;
        
        const res = await fetch(`/api/realtime/history?room=${encodeURIComponent(dmRoom)}&limit=100`);
        if (res.ok) {
          const data = await res.json();
          if (data.items && Array.isArray(data.items)) {
            const dmHistory = data.items.map((item: any) => ({
              id: item.id || item.ts?.toString() || Date.now().toString(),
              text: item.text || item.payload?.text || "",
              userId: String(item.user?.id || item.userId || ""),
              userName: item.user?.name || item.userName || "Utilisateur",
              userRole: item.user?.role || "",
              timestamp: item.ts || item.timestamp || Date.now(),
              isMe: String(item.user?.id || item.userId) === safeUserId,
              read: true,
              isPrivate: true,
              toUserId: item.toUserId || (String(item.user?.id || item.userId) === safeUserId ? privateChat.id : safeUserId)
            })).filter((m: Message) => m.text);
            
            // Fusionner avec les messages existants sans doublons
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const newMsgs = dmHistory.filter((m: Message) => !existingIds.has(m.id));
              return [...prev, ...newMsgs].sort((a, b) => a.timestamp - b.timestamp);
            });
          }
        }
      } catch (err) {
        console.error("Failed to load DM history:", err);
      }
    };
    
    loadDMHistory();
  }, [privateChat?.id, safeUserId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Send Message
  // ─────────────────────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    const msgId = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    setInputText("");

    // Detect mentions
    const mentionRegex = /@(\w+)/g;
    const mentions = [...text.matchAll(mentionRegex)].map(m => m[1]);

    const optimisticMsg: Message = {
      id: msgId,
      text,
      userId: safeUserId,
      userName: safeUserName,
      userRole: role,
      timestamp: Date.now(),
      isMe: true,
      read: false,
      isPrivate: !!privateChat,
      toUserId: privateChat?.id,
      status: "sending",
      mentions,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        userName: replyingTo.userName,
        content: replyingTo.text.slice(0, 50)
      } : undefined
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setReplyingTo(null);
    stopTyping();

    try {
      const payload: any = { id: msgId, text, mentions };
      let event = "chat";
      if (privateChat) {
        event = "dm";
        payload.toUserId = privateChat.id;
      }
      if (replyingTo) {
        payload.replyTo = {
          id: replyingTo.id,
          userName: replyingTo.userName,
          content: replyingTo.text.slice(0, 50)
        };
      }

      const res = await fetch("/api/realtime/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: safeRoomId,
          event,
          payload,
          user: { id: safeUserId, name: safeUserName, role }
        })
      });

      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: "delivered", read: true } : m));
        // Simulate read status after delay
        setTimeout(() => {
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: "read" } : m));
        }, 2000);
      } else {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: "failed" } : m));
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: "failed" } : m));
    }
    inputRef.current?.focus();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Typing Indicator
  // ─────────────────────────────────────────────────────────────────────────────
  const startTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      // Emit typing event
      fetch("/api/realtime/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: safeRoomId,
          event: "typing:start",
          payload: { userId: safeUserId, userName: safeUserName },
          user: { id: safeUserId, name: safeUserName, role }
        })
      }).catch(() => {});
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      fetch("/api/realtime/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: safeRoomId,
          event: "typing:stop",
          payload: { userId: safeUserId },
          user: { id: safeUserId, name: safeUserName, role }
        })
      }).catch(() => {});
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Edit Message
  // ─────────────────────────────────────────────────────────────────────────────
  const startEditing = (msg: Message) => {
    setEditingMessage(msg);
    setEditText(msg.text);
    setContextMenu(null);
  };

  const saveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;
    const newText = editText.trim();
    
    // Optimistic update
    setMessages(prev => prev.map(m => 
      m.id === editingMessage.id ? { ...m, text: newText, isEdited: true } : m
    ));
    
    const messageId = editingMessage.id;
    setEditingMessage(null);
    setEditText("");

    // Emit edit event
    try {
      await fetch("/api/realtime/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: safeRoomId,
          event: "message:edit",
          payload: { messageId, text: newText },
          user: { id: safeUserId, name: safeUserName, role }
        })
      });
    } catch (err) {
      console.error("Failed to save edit:", err);
    }
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditText("");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Pin/Star Messages
  // ─────────────────────────────────────────────────────────────────────────────
  const togglePinMessage = (msg: Message) => {
    setMessages(prev => prev.map(m => 
      m.id === msg.id ? { ...m, isPinned: !m.isPinned } : m
    ));
    if (!msg.isPinned) {
      setPinnedMessages(prev => [...prev, { ...msg, isPinned: true }]);
    } else {
      setPinnedMessages(prev => prev.filter(m => m.id !== msg.id));
    }
    setContextMenu(null);
  };

  const toggleStarMessage = (msg: Message) => {
    setMessages(prev => prev.map(m => 
      m.id === msg.id ? { ...m, isStarred: !m.isStarred } : m
    ));
    setContextMenu(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Copy & Forward
  // ─────────────────────────────────────────────────────────────────────────────
  const copyMessage = (msg: Message) => {
    navigator.clipboard.writeText(msg.text);
    setContextMenu(null);
  };

  const forwardMessage = (msg: Message) => {
    // TODO: Implement forward dialog
    setContextMenu(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Call Functions
  // ─────────────────────────────────────────────────────────────────────────────
  const startCall = (type: "audio" | "video") => {
    setCallState({
      active: true,
      type,
      participants: [safeUserId, privateChat?.id || ""],
      isMuted: false,
      isVideoOff: type === "audio",
      duration: 0
    });
  };

  const endCall = () => {
    setCallState(null);
  };

  const toggleMute = () => {
    if (callState) {
      setCallState({ ...callState, isMuted: !callState.isMuted });
    }
  };

  const toggleVideo = () => {
    if (callState) {
      setCallState({ ...callState, isVideoOff: !callState.isVideoOff });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // File Upload
  // ─────────────────────────────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file" | "audio" = "file") => {
    const files = e.target.files;
    if (!files?.length) return;
    
    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (file.size > maxSize) {
      alert("Le fichier est trop volumineux. Taille max: 10MB");
      return;
    }

    setUploadProgress(0);
    setShowAttachMenu(false);
    
    try {
      // Simuler un upload avec progress
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };
      
      reader.onload = async () => {
        // Créer l'attachment
        const attachment = {
          type: type === "image" || file.type.startsWith("image/") ? "image" : 
                file.type.startsWith("audio/") ? "audio" : 
                file.type.startsWith("video/") ? "video" : "file",
          url: reader.result as string,
          name: file.name,
          size: file.size
        };
        
        // Envoyer le message avec l'attachment
        const msgId = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
        const optimisticMsg: Message = {
          id: msgId,
          text: "",
          userId: safeUserId,
          userName: safeUserName,
          userRole: role,
          timestamp: Date.now(),
          isMe: true,
          read: false,
          isPrivate: !!privateChat,
          toUserId: privateChat?.id,
          status: "sending",
          attachments: [attachment as any]
        };
        
        setMessages(prev => [...prev, optimisticMsg]);
        setUploadProgress(null);
        
        // Envoyer au serveur
        try {
          const res = await fetch("/api/realtime/emit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              room: safeRoomId,
              event: privateChat ? "dm" : "chat",
              payload: { 
                id: msgId, 
                text: `📎 ${file.name}`,
                attachment: { type: attachment.type, name: file.name, size: file.size },
                toUserId: privateChat?.id
              },
              user: { id: safeUserId, name: safeUserName, role }
            })
          });
          
          if (res.ok) {
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: "delivered" } : m));
          } else {
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: "failed" } : m));
          }
        } catch {
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: "failed" } : m));
        }
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadProgress(null);
      alert("Erreur lors de l'envoi du fichier");
    }
    
    // Reset input
    e.target.value = "";
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Audio Recording
  // ─────────────────────────────────────────────────────────────────────────────
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        
        // Envoyer comme message audio
        const msgId = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
        const optimisticMsg: Message = {
          id: msgId,
          text: "🎤 Message vocal",
          userId: safeUserId,
          userName: safeUserName,
          userRole: role,
          timestamp: Date.now(),
          isMe: true,
          read: false,
          isPrivate: !!privateChat,
          toUserId: privateChat?.id,
          status: "sending",
          attachments: [{ type: "audio", url, name: "audio.webm", size: blob.size }]
        };
        
        setMessages(prev => [...prev, optimisticMsg]);
        
        // Émettre au serveur
        await fetch("/api/realtime/emit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: safeRoomId,
            event: privateChat ? "dm" : "chat",
            payload: { id: msgId, text: "🎤 Message vocal", toUserId: privateChat?.id },
            user: { id: safeUserId, name: safeUserName, role }
          })
        });
        
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: "delivered" } : m));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecordingAudio(true);
      
      // Auto-stop after 60 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          stopAudioRecording();
        }
      }, 60000);
      
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Impossible d'accéder au microphone. Vérifiez les permissions.");
    }
  };

  const stopAudioRecording = () => {
    setIsRecordingAudio(false);
    // MediaRecorder will call onstop automatically
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // GIF Picker
  // ─────────────────────────────────────────────────────────────────────────────
  const handleGifSelect = (gifUrl: string) => {
    const msgId = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const optimisticMsg: Message = {
      id: msgId,
      text: "",
      userId: safeUserId,
      userName: safeUserName,
      userRole: role,
      timestamp: Date.now(),
      isMe: true,
      read: false,
      isPrivate: !!privateChat,
      toUserId: privateChat?.id,
      status: "sending",
      attachments: [{ type: "image", url: gifUrl, name: "gif.gif" }]
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setShowAttachMenu(false);
    
    // Émettre
    fetch("/api/realtime/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room: safeRoomId,
        event: privateChat ? "dm" : "chat",
        payload: { id: msgId, text: "GIF 🎬", gif: gifUrl, toUserId: privateChat?.id },
        user: { id: safeUserId, name: safeUserName, role }
      })
    }).then(() => {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: "delivered" } : m));
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────────
  const addReaction = async (messageId: string, emoji: string) => {
    // Optimistic update
    let action = "add";
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = [...(m.reactions || [])];
      const existing = reactions.find(r => r.emoji === emoji);
      if (existing) {
        if (existing.users.includes(safeUserId)) {
          // Remove reaction
          action = "remove";
          existing.users = existing.users.filter(u => u !== safeUserId);
          if (existing.users.length === 0) {
            return { ...m, reactions: reactions.filter(r => r.emoji !== emoji) };
          }
        } else {
          existing.users = [...existing.users, safeUserId];
        }
      } else {
        reactions.push({ emoji, users: [safeUserId] });
      }
      return { ...m, reactions };
    }));
    setContextMenu(null);
    setMessageReactionPicker(null);

    // Emit to server
    try {
      await fetch("/api/realtime/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: safeRoomId,
          event: "reaction",
          payload: { messageId, emoji, action },
          user: { id: safeUserId, name: safeUserName, role }
        })
      });
    } catch (err) {
      console.error("Failed to send reaction:", err);
    }
  };

  const deleteMessage = async (messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    setContextMenu(null);
    
    // Emit delete event
    try {
      await fetch("/api/realtime/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: safeRoomId,
          event: "message:delete",
          payload: { messageId },
          user: { id: safeUserId, name: safeUserName, role }
        })
      });
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const retryMessage = (msg: Message) => {
    setMessages(prev => prev.map(m => 
      m.id === msg.id ? { ...m, status: "sending" } : m
    ));
    // Retry send logic
    setTimeout(() => {
      setMessages(prev => prev.map(m => 
        m.id === msg.id ? { ...m, status: "delivered" } : m
      ));
    }, 1000);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────
  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Hier";
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  };

  const formatLastSeen = (ts?: number) => {
    if (!ts) return "";
    const diff = Date.now() - ts;
    if (diff < 60000) return "à l'instant";
    if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)} h`;
    return formatDate(ts);
  };

  const getAvatarColor = (name: string, userRole?: string) => {
    const c = getRoleConfig(userRole || "");
    if (c.color !== "#6b7280") return c.color;
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899"];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
  };

  const renderMessageText = (text: string) => {
    // Render mentions, links, and formatting
    const parts = text.split(/(@\w+|https?:\/\/[^\s]+|\*\*.*?\*\*|__.*?__|~~.*?~~|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return <span key={i} className="text-blue-400 font-medium cursor-pointer hover:underline">{part}</span>;
      }
      if (part.startsWith("http")) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{part}</a>;
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("__") && part.endsWith("__")) {
        return <em key={i}>{part.slice(2, -2)}</em>;
      }
      if (part.startsWith("~~") && part.endsWith("~~")) {
        return <del key={i}>{part.slice(2, -2)}</del>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={i} className="bg-black/30 px-1 rounded text-pink-400">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const getStatusIcon = (status?: Message["status"]) => {
    switch (status) {
      case "sending": return <Clock className="w-3 h-3 text-gray-500" />;
      case "sent": return <Check className="w-3 h-3 text-gray-500" />;
      case "delivered": return <CheckCheck className="w-3 h-3 text-gray-500" />;
      case "read": return <CheckCheck className="w-3 h-3 text-blue-400" />;
      case "failed": return <AlertCircle className="w-3 h-3 text-red-500" />;
      default: return null;
    }
  };

  // Start private conversation
  const startPrivateConversation = (user: OnlineUser) => {
    setPrivateChat(user);
    // Add to conversations list if not already there
    setPrivateConversations(prev => {
      const exists = prev.some(u => u.id === user.id);
      if (exists) return prev;
      return [...prev, user];
    });
  };

  // Get unread count for a specific conversation
  const getUnreadCountForUser = (targetUserId: string) => {
    return messages.filter(m => 
      m.isPrivate && 
      m.userId === targetUserId && 
      m.toUserId === safeUserId &&
      !m.read
    ).length;
  };

  // Get last message for a conversation
  const getLastMessageForUser = (targetUserId: string) => {
    const userMessages = messages.filter(m => 
      m.isPrivate && (
        (m.userId === safeUserId && m.toUserId === targetUserId) ||
        (m.userId === targetUserId && m.toUserId === safeUserId)
      )
    );
    return userMessages[userMessages.length - 1];
  };

  // Filter messages
  const filteredMessages = messages.filter(m => {
    if (privateChat) {
      return m.isPrivate && (
        (m.userId === safeUserId && m.toUserId === privateChat.id) ||
        (m.userId === privateChat.id && m.toUserId === safeUserId)
      );
    }
    return !m.isPrivate;
  }).filter(m => !searchQuery || m.text.toLowerCase().includes(searchQuery.toLowerCase()));

  // Group by date
  const groupedMessages = filteredMessages.reduce((g, m) => {
    const d = formatDate(m.timestamp);
    if (!g[d]) g[d] = [];
    g[d].push(m);
    return g;
  }, {} as Record<string, Message[]>);

  const onlineCount = onlineUsers.filter(u => u.status === "online").length || 1;
  const typingText = typingUsers.length > 0 
    ? typingUsers.length === 1 
      ? `${typingUsers[0].name} est en train d'écrire...`
      : `${typingUsers.length} personnes écrivent...`
    : null;

  // Total unread DMs
  const totalUnreadDMs = privateConversations.reduce((sum, user) => sum + getUnreadCountForUser(user.id), 0);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className={`fixed ${isFullscreen ? "inset-0" : "inset-y-0 right-0 w-[700px]"} flex shadow-2xl z-50 bg-gradient-to-b from-[#0f0f12] to-[#0a0a0d] text-white transition-all duration-300`}
      onClick={() => { setContextMenu(null); setShowEmojiPicker(false); setShowAttachMenu(false); setMessageReactionPicker(null); }}
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
      />

      {/* Sidebar Icons - Compact */}
      <div className="w-[68px] flex flex-col items-center py-4 bg-[#0a0a0d] border-r border-white/5">
        {/* Canal général */}
        <button
          onClick={() => { setPrivateChat(null); setShowDMList(false); }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all mb-2 group relative ${
            !privateChat && !showDMList
              ? "bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/20" 
              : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
          }`}
          title="Canal général"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
        
        {/* Messages privés */}
        <button 
          onClick={() => { setShowDMList(!showDMList); setPrivateChat(null); }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all mb-2 relative ${
            showDMList || privateChat
              ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20" 
              : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
          }`}
          title="Messages privés"
        >
          <Users className="w-5 h-5" />
          {totalUnreadDMs > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {totalUnreadDMs > 9 ? "9+" : totalUnreadDMs}
            </span>
          )}
        </button>

        <div className="w-6 h-[1px] bg-white/10 rounded-full my-2" />

        {/* Conversations privées récentes */}
        {privateConversations.slice(0, 5).map(user => {
          const unread = getUnreadCountForUser(user.id);
          return (
            <button
              key={user.id}
              onClick={() => startPrivateConversation(user)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all mb-2 relative group ${
                privateChat?.id === user.id ? "ring-2 ring-cyan-500" : "hover:ring-2 hover:ring-white/20"
              }`}
              style={{ backgroundColor: getAvatarColor(user.name, user.role) }}
              title={user.name}
            >
              <span className="text-white font-semibold text-sm">{user.name.charAt(0).toUpperCase()}</span>
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
              {/* Status indicator */}
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0a0a0d] ${
                onlineUsers.find(u => u.id === user.id)?.status === "online" ? "bg-green-500" : "bg-gray-500"
              }`} />
            </button>
          );
        })}
        
        <button 
          onClick={() => {
            alert("Canaux vocaux bientôt disponibles !");
          }}
          className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/5 text-gray-400 hover:bg-green-500/20 hover:text-green-400 transition-all mb-2"
          title="Canaux vocaux"
        >
          <Volume2 className="w-5 h-5" />
        </button>

        <div className="flex-1" />
        
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all mb-2 ${isMuted ? "text-red-400 bg-red-500/10" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
          title={isMuted ? "Activer les notifications" : "Désactiver les notifications"}
        >
          {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        </button>
        <button 
          onClick={() => setShowSettings(true)}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all"
          title="Paramètres"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* DM List Panel */}
      {showDMList && !privateChat && (
        <div className="w-64 flex flex-col bg-[#111114] border-r border-white/5">
          <div className="p-4 border-b border-white/5">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Lock className="w-4 h-4 text-green-500" />
              Messages privés
            </h3>
            <p className="text-xs text-gray-500 mt-1">Conversations chiffrées</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {privateConversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-sm text-gray-400 mb-2">Aucune conversation</p>
                <p className="text-xs text-gray-500">Cliquez sur un membre pour démarrer une conversation privée</p>
              </div>
            ) : (
              privateConversations.map(user => {
                const lastMsg = getLastMessageForUser(user.id);
                const unread = getUnreadCountForUser(user.id);
                const isOnline = onlineUsers.find(u => u.id === user.id)?.status === "online";
                
                return (
                  <button
                    key={user.id}
                    onClick={() => startPrivateConversation(user)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      unread > 0 ? "bg-purple-500/10 hover:bg-purple-500/20" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: getAvatarColor(user.name, user.role) }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111114] ${
                        isOnline ? "bg-green-500" : "bg-gray-500"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium truncate ${unread > 0 ? "text-white" : "text-gray-300"}`}>
                          {user.name}
                        </span>
                        {unread > 0 && (
                          <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                      </div>
                      {lastMsg && (
                        <p className={`text-xs truncate ${unread > 0 ? "text-gray-300" : "text-gray-500"}`}>
                          {lastMsg.isMe ? "Vous: " : ""}{lastMsg.text.slice(0, 30)}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          
          <div className="p-3 border-t border-white/5">
            <p className="text-[10px] text-gray-600 text-center">
              🔒 Messages chiffrés de bout en bout
            </p>
          </div>
        </div>
      )}

      {/* Main Content - Spacious */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Clean & Airy */}
        <div className="h-[72px] flex items-center justify-between px-6 border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-4">
            {privateChat ? (
              <>
                <button onClick={() => setPrivateChat(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                    style={{ backgroundColor: getAvatarColor(privateChat.name, privateChat.role) }}
                  >
                    {privateChat.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#0f0f12] ${STATUS_CONFIG[privateChat.status || "online"].color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{privateChat.name}</span>
                    <Lock className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-sm text-gray-400">
                    {privateChat.status === "online" ? "En ligne" : `Vu ${formatLastSeen(privateChat.lastSeen)}`}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg">général</span>
                    {pinnedMessages.length > 0 && (
                      <button 
                        onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs hover:bg-yellow-500/20 transition-colors"
                      >
                        <Pin className="w-3 h-3" />
                        {pinnedMessages.length} épinglé{pinnedMessages.length > 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{onlineCount} en ligne • Canal principal</p>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {privateChat && (
              <>
                <button 
                  onClick={() => startCall("audio")}
                  className="p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-green-400 transition-all"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => startCall("video")}
                  className="p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-blue-400 transition-all"
                >
                  <Video className="w-5 h-5" />
                </button>
                <div className="w-px h-8 bg-white/10 mx-2" />
              </>
            )}
            <button onClick={() => setShowSearch(!showSearch)} className={`p-3 rounded-xl transition-all ${showSearch ? "bg-cyan-500/20 text-cyan-400" : "hover:bg-white/5 text-gray-400"}`}>
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`p-3 rounded-xl transition-all ${showMembers ? "bg-cyan-500/20 text-cyan-400" : "hover:bg-white/5 text-gray-400"}`}
            >
              <Users className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-3 rounded-xl hover:bg-white/5 text-gray-400 transition-all"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button onClick={onClose} className="p-3 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Call UI */}
        {callState && (
          <div className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-b border-green-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                  {callState.type === "video" ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium">Appel {callState.type === "video" ? "vidéo" : "audio"} en cours</p>
                  <p className="text-sm text-gray-400">{privateChat?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleMute}
                  className={`p-2.5 rounded-xl transition-all ${callState.isMuted ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white"}`}
                >
                  {callState.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                {callState.type === "video" && (
                  <button 
                    onClick={toggleVideo}
                    className={`p-2.5 rounded-xl transition-all ${callState.isVideoOff ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white"}`}
                  >
                    {callState.isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>
                )}
                <button 
                  onClick={endCall}
                  className="p-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pinned Messages Banner */}
        {showPinnedMessages && pinnedMessages.length > 0 && (
          <div className="p-3 bg-yellow-500/10 border-b border-yellow-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-yellow-500">
                <Pin className="w-4 h-4" />
                <span className="text-sm font-medium">Messages épinglés ({pinnedMessages.length})</span>
              </div>
              <button onClick={() => setShowPinnedMessages(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {pinnedMessages.map(msg => (
                <div key={msg.id} className="flex items-start gap-2 text-sm bg-black/20 rounded-lg p-2">
                  <span className="font-medium text-yellow-400">{msg.userName}:</span>
                  <span className="text-gray-300 truncate">{msg.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Bar - Clean */}
        {showSearch && (
          <div className="px-6 py-4 border-b border-white/5 bg-black/20">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher dans les messages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl text-sm bg-white/5 text-white placeholder-gray-500 border border-white/5 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Messages Area - Spacious */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="relative">
                <div className="w-16 h-16 border-2 border-cyan-500/20 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="mt-6 text-sm">Chargement des messages...</p>
            </div>
          ) : Object.keys(groupedMessages).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-12">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 flex items-center justify-center mb-6">
                <MessageCircle className="w-12 h-12 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">
                {privateChat ? `Conversation avec ${privateChat.name}` : "Bienvenue dans #général !"}
              </h3>
              <p className="text-gray-400 text-base max-w-sm leading-relaxed">
                {privateChat 
                  ? "Envoyez un message pour démarrer la conversation. Vos messages sont chiffrés de bout en bout. 🔒"
                  : "C'est le début du canal général. Présentez-vous à l'équipe et commencez à collaborer ! 🚀"}
              </p>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setInputText("👋 Salut tout le monde !")}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20"
                >
                  👋 Dire bonjour
                </button>
              </div>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                {/* Date Separator - Clean */}
                <div className="flex items-center gap-6 my-8">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <span className="text-xs font-medium px-4 py-1.5 rounded-full bg-white/5 text-gray-400 border border-white/5">{date}</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>

                {/* Messages - Spacious */}
                {msgs.map((msg, idx) => {
                  const showAvatar = idx === 0 || msgs[idx - 1]?.userId !== msg.userId || (msg.timestamp - msgs[idx - 1]?.timestamp > 300000);
                  const roleConfig = getRoleConfig(msg.userRole || "");
                  const isEditing = editingMessage?.id === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`group relative flex gap-4 py-3 px-4 -mx-4 rounded-2xl transition-all ${
                        isSelectionMode && selectedMessages.includes(msg.id) 
                          ? "bg-cyan-500/10" 
                          : msg.isPinned 
                            ? "bg-yellow-500/5 hover:bg-yellow-500/10" 
                            : "hover:bg-white/[0.02]"
                      } ${msg.status === "failed" ? "opacity-60" : ""}`}
                      onContextMenu={e => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
                      }}
                      onClick={() => {
                        if (isSelectionMode) {
                          setSelectedMessages(prev => 
                            prev.includes(msg.id) ? prev.filter(id => id !== msg.id) : [...prev, msg.id]
                          );
                        }
                      }}
                    >
                      {/* Selection checkbox */}
                      {isSelectionMode && (
                        <div className="flex items-start pt-1">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                            selectedMessages.includes(msg.id) ? "bg-cyan-500 border-cyan-500" : "border-gray-600"
                          }`}>
                            {selectedMessages.includes(msg.id) && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      )}

                      {/* Avatar - Larger */}
                      <div className="w-12 flex-shrink-0">
                        {showAvatar && (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-base cursor-pointer hover:opacity-80 transition-opacity ring-2 ring-transparent hover:ring-white/20"
                            style={{ backgroundColor: getAvatarColor(msg.userName, msg.userRole) }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const user = onlineUsers.find(u => u.id === msg.userId);
                              if (user) setShowUserProfile(user);
                            }}
                          >
                            {msg.userName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Content - More spacing */}
                      <div className="flex-1 min-w-0">
                        {showAvatar && (
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className="font-semibold text-base hover:underline cursor-pointer flex items-center gap-2"
                              style={{ color: roleConfig.color }}
                            >
                              {msg.userName}
                              {msg.userRole === "Chef" || msg.userRole === "Directeur Général" ? (
                                <Crown className="w-4 h-4 text-yellow-500" />
                              ) : msg.userRole === "Manager" ? (
                                <Shield className="w-4 h-4 text-purple-500" />
                              ) : null}
                            </span>
                            <span className="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
                            {msg.isEdited && <span className="text-xs text-gray-500 italic">(modifié)</span>}
                            {msg.isPinned && <Pin className="w-3.5 h-3.5 text-yellow-500" />}
                            {msg.isStarred && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                          </div>
                        )}

                        {/* Reply - Better styling */}
                        {msg.replyTo && (
                          <div className="flex items-center gap-3 text-sm mb-3 pl-4 py-2 border-l-2 border-cyan-500/50 bg-cyan-500/5 rounded-r-xl text-gray-400">
                            <Reply className="w-4 h-4 text-cyan-400" />
                            <span className="font-medium text-cyan-400">{msg.replyTo.userName}</span>
                            <span className="truncate">{msg.replyTo.content}</span>
                          </div>
                        )}

                        {/* Message text or edit input */}
                        {isEditing ? (
                          <div className="flex items-center gap-3">
                            <input
                              type="text"
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") saveEdit();
                                if (e.key === "Escape") cancelEdit();
                              }}
                              className="flex-1 bg-black/30 rounded-xl px-4 py-2.5 text-base outline-none border border-cyan-500/50"
                              autoFocus
                            />
                            <button onClick={saveEdit} className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30">
                              <Check className="w-5 h-5" />
                            </button>
                            <button onClick={cancelEdit} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <div className="break-words text-gray-100 text-[15px] leading-[1.7]">
                            {renderMessageText(msg.text)}
                          </div>
                        )}

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-3">
                            {msg.attachments.map((att, i) => (
                              <div key={i} className="relative group/att">
                                {att.type === "image" ? (
                                  <img src={att.url} alt={att.name} className="max-w-sm rounded-xl border border-white/10" />
                                ) : (
                                  <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                                    <File className="w-10 h-10 text-cyan-400" />
                                    <div>
                                      <p className="text-sm font-medium">{att.name}</p>
                                      {att.size && <p className="text-xs text-gray-500">{(att.size / 1024).toFixed(1)} KB</p>}
                                    </div>
                                    <button className="p-2 hover:bg-white/10 rounded-lg">
                                      <Download className="w-5 h-5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reactions - Larger */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {msg.reactions.map((r, i) => (
                              <button
                                key={i}
                                onClick={(e) => { e.stopPropagation(); addReaction(msg.id, r.emoji); }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                  r.users.includes(safeUserId)
                                    ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 shadow-lg shadow-cyan-500/10"
                                    : "bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300"
                                }`}
                              >
                                <span className="text-base">{r.emoji}</span>
                                <span>{r.users.length}</span>
                              </button>
                            ))}
                            <button 
                              onClick={(e) => { e.stopPropagation(); setMessageReactionPicker(msg.id); }}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                            >
                              <Plus className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        )}

                        {/* Status indicator for own messages */}
                        {msg.isMe && (
                          <div className="flex items-center justify-end gap-2 mt-2">
                            {getStatusIcon(msg.status)}
                            {msg.status === "failed" && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); retryMessage(msg); }}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Renvoyer
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quick Actions - Larger */}
                      <div className="absolute right-4 -top-4 flex items-center gap-1 p-1.5 rounded-xl shadow-xl bg-[#111114] border border-white/10 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                        {EMOJI_REACTIONS.slice(0, 4).map(emoji => (
                          <button
                            key={emoji}
                            onClick={(e) => { e.stopPropagation(); addReaction(msg.id, emoji); }}
                            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-lg hover:scale-110 transition-all"
                          >
                            {emoji}
                          </button>
                        ))}
                        <div className="w-px h-6 bg-white/10 mx-1" />
                        <button
                          onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); }}
                          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                        >
                          <Reply className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, message: msg }); }}
                          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Reaction Picker for this message */}
                      {messageReactionPicker === msg.id && (
                        <div 
                          className="absolute right-0 top-full mt-2 p-3 rounded-2xl shadow-xl bg-[#111114] border border-white/10 z-50"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="grid grid-cols-8 gap-1">
                            {EMOJI_REACTIONS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => addReaction(msg.id, emoji)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-xl hover:scale-110 transition-all"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicator */}
        {typingText && (
          <div className="px-6 py-3 text-sm text-gray-400 flex items-center gap-3 border-t border-white/5">
            <div className="flex gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            {typingText}
          </div>
        )}

        {/* Reply Bar - Clean */}
        {replyingTo && (
          <div className="flex items-center gap-4 px-6 py-4 border-t border-white/5 bg-cyan-500/5">
            <div className="w-1 h-12 bg-gradient-to-b from-cyan-400 to-fuchsia-400 rounded-full" />
            <Reply className="w-5 h-5 text-cyan-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-cyan-400">Répondre à {replyingTo.userName}</p>
              <p className="text-sm text-gray-400 truncate">{replyingTo.text}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-2.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress !== null && (
          <div className="px-6 py-3 bg-cyan-500/10 border-t border-cyan-500/20">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-sm text-cyan-400">{uploadProgress}%</span>
            </div>
          </div>
        )}

        {/* Input Area - Spacious & Modern */}
        <div className="p-6 bg-black/20 border-t border-white/5">
          {/* Hidden inputs */}
          <input
            type="file"
            ref={audioInputRef}
            className="hidden"
            accept="audio/*"
            onChange={(e) => handleFileSelect(e, "audio")}
          />
          
          {/* Attach Menu */}
          {showAttachMenu && (
            <div className="mb-4 p-3 rounded-2xl bg-white/5 border border-white/10 flex gap-3">
              <button 
                onClick={() => { 
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = "image/*";
                    fileInputRef.current.click();
                  }
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white/10 transition-colors flex-1"
              >
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Image className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-xs text-gray-400">Photo</span>
              </button>
              <button 
                onClick={() => { 
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = "*/*";
                    fileInputRef.current.click();
                  }
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white/10 transition-colors flex-1"
              >
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <File className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-xs text-gray-400">Fichier</span>
              </button>
              <button 
                onClick={() => {
                  if (isRecordingAudio) {
                    stopAudioRecording();
                  } else {
                    startAudioRecording();
                  }
                  setShowAttachMenu(false);
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors flex-1 ${isRecordingAudio ? "bg-red-500/20" : "hover:bg-white/10"}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isRecordingAudio ? "bg-red-500/20 animate-pulse" : "bg-green-500/20"}`}>
                  <Mic className={`w-6 h-6 ${isRecordingAudio ? "text-red-400" : "text-green-400"}`} />
                </div>
                <span className="text-xs text-gray-400">{isRecordingAudio ? "Arrêter" : "Audio"}</span>
              </button>
              <button 
                onClick={() => {
                  // Simple GIF picker - show some popular GIFs
                  const popularGifs = [
                    "https://media.giphy.com/media/3o7TKsQ8MgpV9Ywj4Y/giphy.gif",
                    "https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif",
                    "https://media.giphy.com/media/3oz8xLd9DJq2l2VFtu/giphy.gif"
                  ];
                  const randomGif = popularGifs[Math.floor(Math.random() * popularGifs.length)];
                  handleGifSelect(randomGif);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white/10 transition-colors flex-1"
              >
                <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                  <Gift className="w-6 h-6 text-pink-400" />
                </div>
                <span className="text-xs text-gray-400">GIF</span>
              </button>
            </div>
          )}

          {/* Recording indicator */}
          {isRecordingAudio && (
            <div className="mb-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-red-400">Enregistrement en cours...</span>
              <div className="flex-1" />
              <button 
                onClick={stopAudioRecording}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 transition-colors"
              >
                Arrêter
              </button>
            </div>
          )}

          <div className="flex items-end gap-3 rounded-2xl p-3 bg-white/5 border border-white/5 focus-within:border-cyan-500/30 transition-colors">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowAttachMenu(!showAttachMenu); }}
              className={`p-3 rounded-xl transition-all ${showAttachMenu ? "bg-cyan-500/20 text-cyan-400" : "hover:bg-white/10 text-gray-400"}`}
            >
              <Plus className="w-6 h-6" />
            </button>
            
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={e => { setInputText(e.target.value); startTyping(); }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={privateChat ? `Message à ${privateChat.name}` : "Envoyer un message..."}
              className="flex-1 bg-transparent outline-none text-base text-white placeholder-gray-500 resize-none max-h-40 py-2"
              rows={1}
              style={{ height: "auto", minHeight: "28px" }}
            />
            
            <button
              onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}
              className={`p-3 rounded-xl transition-all ${showEmojiPicker ? "bg-yellow-500/20 text-yellow-400" : "hover:bg-white/10 text-gray-400"}`}
            >
              <Smile className="w-6 h-6" />
            </button>
            
            <button
              onClick={sendMessage}
              disabled={!inputText.trim()}
              className={`p-3 rounded-xl transition-all ${
                inputText.trim() 
                  ? "bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105" 
                  : "bg-white/5 text-gray-600"
              }`}
            >
              <Send className="w-6 h-6" />
            </button>
          </div>

          {/* Emoji Picker - Larger */}
          {showEmojiPicker && (
            <div
              className="absolute bottom-28 right-6 w-96 rounded-2xl shadow-2xl bg-[#0f0f12] border border-white/10 z-50 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Emoji Categories */}
              <div className="flex items-center gap-2 p-3 border-b border-white/10 overflow-x-auto">
                {Object.keys(EMOJI_CATEGORIES).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setEmojiCategory(cat as keyof typeof EMOJI_CATEGORIES)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      emojiCategory === cat ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {cat === "recent" ? "🕐 Récents" : 
                     cat === "smileys" ? "😀 Smileys" :
                     cat === "gestures" ? "👍 Gestes" :
                     cat === "hearts" ? "❤️ Cœurs" :
                     cat === "objects" ? "🎉 Objets" : "✨ Symboles"}
                  </button>
                ))}
              </div>
              <div className="p-4 max-h-72 overflow-y-auto">
                <div className="grid grid-cols-8 gap-2">
                  {EMOJI_CATEGORIES[emojiCategory].map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInputText(prev => prev + emoji);
                        inputRef.current?.focus();
                      }}
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-2xl hover:bg-white/10 hover:scale-110 transition-all"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Members Sidebar - Premium */}
      {showMembers && (
        <div className="w-60 border-l flex flex-col bg-[#1e1f22] border-white/5">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Membres
              </h3>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">
                {onlineCount} en ligne
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-black/30 text-white placeholder-gray-500 border border-white/5"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* Online Section */}
            <div className="px-2 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">En ligne — {onlineCount}</p>
            </div>

            {/* Current User */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
              <div className="relative">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm ring-2 ring-indigo-500/30"
                  style={{ backgroundColor: getAvatarColor(safeUserName, role) }}
                >
                  {safeUserName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#1e1f22] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate text-white">{safeUserName}</p>
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded font-medium">Vous</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>{getRoleConfig(role).icon}</span>
                  <span>{role}</span>
                </div>
              </div>
            </div>

            {/* Other Users */}
            {onlineUsers.filter(u => u.id !== safeUserId).map(user => {
              const config = getRoleConfig(user.role);
              const statusConfig = STATUS_CONFIG[user.status || "online"];
              const unreadFromUser = getUnreadCountForUser(user.id);
              
              return (
                <button
                  key={user.id}
                  onClick={() => startPrivateConversation(user)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all group ${
                    unreadFromUser > 0 ? "bg-purple-500/10 hover:bg-purple-500/20" : "hover:bg-white/5"
                  }`}
                >
                  <div className="relative">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-all group-hover:ring-2 group-hover:ring-white/20"
                      style={{ backgroundColor: getAvatarColor(user.name, user.role) }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${statusConfig.color} rounded-full border-2 border-[#1e1f22]`}>
                      {user.isTyping && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-medium truncate transition-colors ${unreadFromUser > 0 ? "text-white" : "text-gray-300 group-hover:text-white"}`}>{user.name}</p>
                      {(user.role === "Chef" || user.role === "Directeur Général") && <Crown className="w-3 h-3 text-yellow-500" />}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <span>{config.icon}</span>
                      <span className="truncate">{user.customStatus || user.role}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadFromUser > 0 && (
                      <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadFromUser}
                      </span>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MessageCircle className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Offline Section */}
            {onlineUsers.filter(u => u.status === "offline").length > 0 && (
              <>
                <div className="px-2 py-1.5 mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                    Hors ligne — {onlineUsers.filter(u => u.status === "offline").length}
                  </p>
                </div>
                {onlineUsers.filter(u => u.status === "offline").map(user => (
                  <button
                    key={user.id}
                    onClick={() => startPrivateConversation(user)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all opacity-50 hover:opacity-70"
                  >
                    <div className="relative">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm grayscale"
                        style={{ backgroundColor: getAvatarColor(user.name, user.role) }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gray-500 rounded-full border-2 border-[#1e1f22]" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate text-gray-400">{user.name}</p>
                      <p className="text-xs text-gray-600">Vu {formatLastSeen(user.lastSeen)}</p>
                    </div>
                  </button>
                ))}
              </>
            )}

            {onlineUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-10 h-10 mx-auto mb-2 text-gray-600" />
                <p className="text-sm text-gray-500">Personne d'autre en ligne</p>
                <p className="text-xs text-gray-600 mt-1">Invitez des collègues !</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="p-3 border-t border-white/5">
            <button 
              onClick={() => setShowInviteModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors text-sm font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Inviter
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="w-96 rounded-2xl bg-gradient-to-b from-[#1e1f22] to-[#141517] border border-white/10 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Paramètres du Chat</h3>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Notifications */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-400" />
                  <span>Notifications</span>
                </div>
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-12 h-6 rounded-full transition-colors ${isMuted ? "bg-gray-600" : "bg-green-500"}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isMuted ? "translate-x-0.5" : "translate-x-6"}`} />
                </button>
              </div>
              
              {/* Sounds */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-gray-400" />
                  <span>Sons</span>
                </div>
                <button className="w-12 h-6 rounded-full bg-green-500">
                  <div className="w-5 h-5 rounded-full bg-white translate-x-6" />
                </button>
              </div>
              
              {/* Theme */}
              <div className="p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="w-5 h-5 text-gray-400" />
                  <span>Thème</span>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-sm font-medium">Sombre</button>
                  <button className="flex-1 py-2 rounded-lg bg-white/10 text-sm text-gray-400">Clair</button>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-white/5">
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setShowInviteModal(false)}
        >
          <div 
            className="w-96 rounded-2xl bg-gradient-to-b from-[#1e1f22] to-[#141517] border border-white/10 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Inviter des membres</h3>
                <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="p-4 rounded-xl bg-white/5 text-center">
                <p className="text-sm text-gray-400 mb-3">Partagez ce lien pour inviter des membres</p>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-black/30 border border-white/10">
                  <input 
                    type="text" 
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${safeRoomId}`}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-gray-300 outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/invite/${safeRoomId}`);
                      alert("Lien copié !");
                    }}
                    className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="text-center text-sm text-gray-500">
                ou envoyez une invitation par email
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="email@exemple.com"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-cyan-500/50 text-sm"
                />
                <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 font-medium text-sm">
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showUserProfile && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setShowUserProfile(null)}
        >
          <div 
            className="w-80 rounded-2xl bg-gradient-to-b from-[#1e1f22] to-[#141517] border border-white/10 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Banner */}
            <div className={`h-20 bg-gradient-to-r ${getRoleConfig(showUserProfile.role).gradient}`} />
            
            {/* Avatar */}
            <div className="px-4 -mt-10">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl border-4 border-[#1e1f22]"
                style={{ backgroundColor: getAvatarColor(showUserProfile.name, showUserProfile.role) }}
              >
                {showUserProfile.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-white">{showUserProfile.name}</h3>
                {(showUserProfile.role === "Chef" || showUserProfile.role === "Directeur Général") && (
                  <Crown className="w-4 h-4 text-yellow-500" />
                )}
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[showUserProfile.status || "online"].color}`} />
                <span className="text-sm text-gray-400">{STATUS_CONFIG[showUserProfile.status || "online"].label}</span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Rôle:</span>
                  <span className="text-gray-300">{showUserProfile.role}</span>
                </div>
                {showUserProfile.customStatus && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Statut:</span>
                    <span className="text-gray-300">{showUserProfile.customStatus}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => { setPrivateChat(showUserProfile); setShowUserProfile(null); }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Message
                </button>
                <button 
                  onClick={() => { startCall("audio"); setShowUserProfile(null); }}
                  className="py-2.5 px-4 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu - Premium */}
      {contextMenu && (
        <div
          className="fixed rounded-xl shadow-2xl py-2 z-50 min-w-[200px] bg-[#111214] border border-white/10 backdrop-blur-sm"
          style={{ 
            left: Math.min(contextMenu.x, window.innerWidth - 220), 
            top: Math.min(contextMenu.y, window.innerHeight - 400) 
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Reactions Row */}
          <div className="px-3 py-2 border-b border-white/5">
            <div className="flex justify-between">
              {EMOJI_REACTIONS.slice(0, 6).map(emoji => (
                <button
                  key={emoji}
                  onClick={() => addReaction(contextMenu.message.id, emoji)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-lg hover:scale-125 transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={() => { setReplyingTo(contextMenu.message); setContextMenu(null); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-indigo-500/20 hover:text-white transition-colors"
            >
              <Reply className="w-4 h-4" /> Répondre
            </button>
            
            {contextMenu.message.userId === safeUserId && (
              <button
                onClick={() => startEditing(contextMenu.message)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Edit3 className="w-4 h-4" /> Modifier
              </button>
            )}

            <button
              onClick={() => copyMessage(contextMenu.message)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Copy className="w-4 h-4" /> Copier le texte
            </button>

            <button
              onClick={() => togglePinMessage(contextMenu.message)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-yellow-500/20 hover:text-yellow-400 transition-colors"
            >
              <Pin className="w-4 h-4" /> {contextMenu.message.isPinned ? "Désépingler" : "Épingler"}
            </button>

            <button
              onClick={() => toggleStarMessage(contextMenu.message)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-yellow-500/20 hover:text-yellow-400 transition-colors"
            >
              <Star className="w-4 h-4" /> {contextMenu.message.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
            </button>

            <button
              onClick={() => forwardMessage(contextMenu.message)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Forward className="w-4 h-4" /> Transférer
            </button>
          </div>

          {contextMenu.message.userId === safeUserId && (
            <>
              <div className="my-1 h-px bg-white/5" />
              <button
                onClick={() => deleteMessage(contextMenu.message.id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            </>
          )}
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
