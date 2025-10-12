"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getRealtimeClient } from "../../lib/realtime/provider";
import { getNotificationManager } from "../../lib/notifications/manager";
import MemberPicker from "./MemberPicker";

type Role = "chef" | "manager" | "assistant" | "employe";
type Msg = { 
  id: string; 
  user: { id: string; name: string; role: Role }; 
  text: string; 
  ts: number;
  reactions?: Record<string, string[]>; // emoji -> user IDs
  isEdited?: boolean;
  replyTo?: string; // ID du message parent
};

type FileEvt = { 
  id: string; 
  name: string; 
  size: number; 
  mime: string; 
  url: string; 
  message?: string; 
  scope: "room" | "direct"; 
  toUserId?: string; 
  room?: string; 
};

type TaskEvt = { 
  task: { 
    id: string; 
    userId: string; 
    title: string; 
    project: string; 
    status: "todo" | "in_progress" | "done"; 
    updatedAt: number; 
    createdAt: number; 
    createdBy: { id: string; name: string }; 
    dueAt?: number | null; 
  }; 
};

type UserTyping = {
  userId: string;
  userName: string;
  timestamp: number;
};

function dmKey(a: string, b: string) {
  const [x, y] = a < b ? [a, b] : [b, a];
  return `dm:${x}:${y}`;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😄', '😮', '😢', '😡', '🎉', '👏'];

const ROLE_LABEL: Record<string,string> = {
  chef: 'Directeur Général',
  manager: 'Manager',
  assistant: 'Assistant',
  employe: 'Employé',
  finance: 'Financier',
  administration: 'Administration'
};

function roleLabel(r?: string) { return ROLE_LABEL[r || ''] || r || 'Employé'; }

export default function ChatPanelEnhanced({
  roomId,
  userId,
  user,
  role = "employe" as Role,
  height = 420,
  onContextUpdate,
  initialDmTarget,
}: {
  roomId: string;
  userId: string;
  user: string;
  role?: Role;
  height?: number;
  onContextUpdate?: (ctx: { mode: "room" | "dm"; dmTargetId?: string }) => void;
  initialDmTarget?: { id: string; name: string };
}) {
  const rt = getRealtimeClient();
  const notificationManager = getNotificationManager();
  const [mode, setMode] = useState<"room" | "dm">("room");
  const [dmTarget, setDmTarget] = useState<{ id: string; name: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Allow external component to open with a DM target directly
  useEffect(() => {
    if (initialDmTarget) {
      setMode("dm");
      setDmTarget(initialDmTarget);
      setPickerOpen(false);
    }
  }, [initialDmTarget]);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [files, setFiles] = useState<FileEvt[]>([]);
  const [text, setText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Msg | null>(null);
  
  const seenIds = useRef<Set<string>>(new Set());
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  const [connReady, setConnReady] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // États pour les indicateurs de frappe
  const [usersTyping, setUsersTyping] = useState<UserTyping[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // États pour l'assignation de tâches
  const canAssignPrivately = role === "chef" && mode === "dm" && !!dmTarget;
  const [ptTitle, setPtTitle] = useState("");
  const [ptProject, setPtProject] = useState("");
  const [ptDueDate, setPtDueDate] = useState("");
  const [ptDueTime, setPtDueTime] = useState("");
  const [ptDueText, setPtDueText] = useState("");
  const [ptSaving, setPtSaving] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  useEffect(() => { 
    if (canAssignPrivately) setShowAssign(true); 
  }, [canAssignPrivately]);

  const roomKey = useMemo(() => `room:${roomId}`, [roomId]);
  const dmRoomKey = useMemo(() => (dmTarget ? dmKey(userId, dmTarget.id) : ""), [dmTarget, userId]);

  // Messages filtrés par recherche
  const filteredMsgs = useMemo(() => {
    if (!searchQuery.trim()) return msgs;
    const query = searchQuery.toLowerCase();
    return msgs.filter(m => 
      m.text.toLowerCase().includes(query) ||
      m.user.name.toLowerCase().includes(query)
    );
  }, [msgs, searchQuery]);

  // Écoute des commandes globales: ouvrir un DM (depuis une notification)
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("chat-control");
      bc.onmessage = (ev) => {
        const data = ev?.data || {};
        if (data?.type === "open-dm" && data?.targetId) {
          setMode("dm");
          setDmTarget({ id: String(data.targetId), name: String(data.targetName || "Utilisateur") });
          setPickerOpen(false);
          // Marquer les DM comme lus
          notificationManager.markAllAsRead();
        }
      };
    } catch {}
    return () => { try { bc?.close(); } catch {} };
  }, []);

  // Propager le contexte au parent
  useEffect(() => { 
    onContextUpdate?.({ mode, dmTargetId: dmTarget?.id }); 
  }, [mode, dmTarget?.id, onContextUpdate]);

  // Charger l'historique + fichiers
  useEffect(() => {
    (async () => {
      const key = mode === "room" ? roomKey : dmRoomKey;
      if (!key) { setMsgs([]); setFiles([]); return; }
      
      try {
        const res = await fetch(`/api/realtime/history?room=${encodeURIComponent(key)}`, { cache: "no-store" });
        const data = await res.json();
        const items: Msg[] = (data?.items || []).map((m: any) => ({ 
          id: m.id, 
          text: m.text, 
          ts: m.ts, 
          user: m.user,
          reactions: m.reactions || {},
          isEdited: m.isEdited || false,
          replyTo: m.replyTo
        }));
        seenIds.current = new Set(items.map((m) => m.id));
        setMsgs(items);
        requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight }));
        
        // Marquer comme lu si c'est la room active
        if (mode === "room") {
          notificationManager.markAllAsRead();
        } else if (dmTarget) {
          notificationManager.markAllAsRead();
        }
      } catch (e: any) {
        setLastError(e?.message || "Impossible de charger l'historique");
      }

      // Charger les fichiers
      if (mode === "room") {
        try { 
          const fres = await fetch(`/api/files/list?room=${encodeURIComponent(roomKey)}`, { cache: "no-store" }); 
          const fdata = await fres.json(); 
          setFiles((fdata?.items || []) as FileEvt[]); 
        } catch {}
      } else {
        try {
          const fres = await fetch(`/api/files/list?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
          const fdata = await fres.json();
          const all = (fdata?.items || []) as FileEvt[];
          const filtered = all.filter((f) =>
            (f.toUserId === userId && (f as any).from?.id === dmTarget?.id) ||
            (f.toUserId === dmTarget?.id && (f as any).from?.id === userId)
          );
          setFiles(filtered);
        } catch {}
      }
    })();
  }, [mode, roomKey, dmRoomKey, userId, dmTarget, roomId]);

  // Abonnements temps réel
  useEffect(() => {
    rt.setUser({ id: userId, name: user, role });
    const offs: Array<() => void> = [];
    const readyRoom = mode === "room" ? roomKey : dmRoomKey || roomKey;
    
    // Écouter les événements de connexion
    offs.push(rt.subscribe(readyRoom, "ready", () => setConnReady(true)));
    offs.push(rt.subscribe(readyRoom, "connected", (data) => {
      setConnReady(true);
      setIsReconnecting(false);
      if (data.reconnected) {
        notificationManager.addNotification({
          type: "system",
          title: "Reconnecté",
          message: "La connexion temps réel a été rétablie",
          priority: "normal"
        });
      }
    }));
    offs.push(rt.subscribe(readyRoom, "reconnecting", (data) => {
      setIsReconnecting(true);
      setConnReady(false);
    }));
    offs.push(rt.subscribe(readyRoom, "error", (data) => {
      setLastError(data.type === "max_reconnect_attempts" ? "Connexion perdue" : "Erreur de connexion");
      setConnReady(false);
      setIsReconnecting(false);
    }));

    if (mode === "room") {
      offs.push(rt.subscribe(roomKey, "chat", (env) => {
        const m: Msg = { 
          id: env?.payload?.id, 
          text: env?.payload?.text, 
          user: env?.user, 
          ts: env?.ts,
          reactions: env?.payload?.reactions || {},
          isEdited: env?.payload?.isEdited || false,
          replyTo: env?.payload?.replyTo
        };
        if (!m?.id || seenIds.current.has(m.id)) return;
        seenIds.current.add(m.id);
        
        setMsgs((prev) => { 
          const next = [...prev, m]; 
          requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" })); 
          return next; 
        });

        // Notification si pas l'utilisateur courant et pas focus sur la fenêtre
        if (m.user.id !== userId && document.hidden) {
          notificationManager.addChatNotification(m.text, m.user.name, roomId);
        }
      }));
      
      offs.push(rt.subscribe(roomKey, "file", (env) => {
        const p = env?.payload as FileEvt;
        if (!p?.id) return;
        setFiles((prev) => [p, ...prev]);
        
        // Notification de fichier
        if (env?.user?.id !== userId) {
          notificationManager.addFileNotification(p.name, env.user.name);
        }
      }));
      
      // Indicateurs de frappe
      offs.push(rt.subscribe(roomKey, "typing", (env) => {
        if (env?.user?.id === userId) return; // Ignorer notre propre frappe
        
        setUsersTyping(prev => {
          const filtered = prev.filter(u => u.userId !== env.user.id);
          return [...filtered, {
            userId: env.user.id,
            userName: env.user.name,
            timestamp: Date.now()
          }];
        });
      }));
      
    } else if (dmRoomKey) {
      offs.push(rt.subscribe(dmRoomKey, "dm", (env) => {
        const m: Msg = { 
          id: env?.payload?.id, 
          text: env?.payload?.text, 
          user: env?.user, 
          ts: env?.ts,
          reactions: env?.payload?.reactions || {},
          isEdited: env?.payload?.isEdited || false,
          replyTo: env?.payload?.replyTo
        };
        if (!m?.id || seenIds.current.has(m.id)) return;
        seenIds.current.add(m.id);
  setMsgs((prev) => [...prev, m]);

        // Notification DM si pas l'utilisateur courant
        if (m.user.id !== userId) {
          notificationManager.addChatNotification(m.text, m.user.name, m.user.id);
        }
      }));
      
      offs.push(rt.subscribe(dmRoomKey, "task", (env) => {
        const p = env?.payload as TaskEvt; 
        const t = p?.task; 
        if (!t?.id) return;
        const sys: Msg = { 
          id: `task-${t.id}`, 
          ts: env?.ts || Date.now(), 
          user: env?.user, 
          text: `Tâche assignée: "${t.title}" (${t.project})` + (t.dueAt ? ` · Échéance: ${new Date(t.dueAt).toLocaleString()}` : "") 
        };
        if (!seenIds.current.has(sys.id)) { 
          seenIds.current.add(sys.id); 
          setMsgs((prev) => [...prev, sys]); 
        }

        // Notification de tâche
        if (env?.user?.id !== userId) {
          const dueDate = t.dueAt ? new Date(t.dueAt).toLocaleDateString() : undefined;
          notificationManager.addTaskNotification(t.title, env.user.name);
        }
      }));
      
      // Autres abonnements DM...
      offs.push(rt.subscribe(`user:${userId}`, "file", (env) => {
        const p = env?.payload as FileEvt; if (!p?.id) return;
        if ((p.toUserId === userId && (env?.user?.id) === dmTarget?.id) || (p.toUserId === dmTarget?.id && (env?.user?.id) === userId)) {
          setFiles((prev) => [p, ...prev]);
        }
      }));
      
      offs.push(rt.subscribe(`user:${userId}`, "dm", (env) => {
        const fromId = env?.user?.id; if (!fromId || fromId !== dmTarget?.id) return;
        const m: Msg = { 
          id: env?.payload?.id, 
          text: env?.payload?.text, 
          user: env?.user, 
          ts: env?.ts,
          reactions: env?.payload?.reactions || {},
          isEdited: env?.payload?.isEdited || false,
          replyTo: env?.payload?.replyTo
        };
        if (!m?.id || seenIds.current.has(m.id)) return;
        seenIds.current.add(m.id);
  setMsgs((prev) => [...prev, m]);
      }));
      
      offs.push(rt.subscribe(`user:${userId}`, "task", (env) => {
        const p = env?.payload as TaskEvt; const t = p?.task; if (!t?.id) return;
        if (dmTarget && (t.userId === dmTarget.id || t.createdBy?.id === dmTarget.id)) {
          const sys: Msg = { 
            id: `task-${t.id}`, 
            ts: env?.ts || Date.now(), 
            user: env?.user, 
            text: `Tâche assignée: "${t.title}" (${t.project})` + (t.dueAt ? ` · Échéance: ${new Date(t.dueAt).toLocaleString()}` : "") 
          };
          if (!seenIds.current.has(sys.id)) { 
            seenIds.current.add(sys.id); 
            setMsgs((prev) => [...prev, sys]); 
          }
        }
      }));
    }

    return () => { offs.forEach((off) => off?.()); };
  }, [mode, roomKey, dmRoomKey, userId, user, role, rt, dmTarget, roomId]);

  // Nettoyage des indicateurs de frappe
  useEffect(() => {
    const interval = setInterval(() => {
      setUsersTyping(prev => 
        prev.filter(u => Date.now() - u.timestamp < 3000) // Expirer après 3 secondes
      );
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Gestion de la frappe
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    
    // Envoyer indicateur de frappe
    if (e.target.value.trim() && !typingTimeoutRef.current) {
      const room = mode === "room" ? roomKey : dmRoomKey;
      if (room) {
        rt.trigger(room, "typing", { typing: true }).catch(console.warn);
      }
    }
    
    // Débounce pour arrêter l'indicateur de frappe
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      const room = mode === "room" ? roomKey : dmRoomKey;
      if (room) {
        rt.trigger(room, "typing", { typing: false }).catch(console.warn);
      }
      typingTimeoutRef.current = undefined;
    }, 1000);
  };

  async function send() {
    const txt = text.trim(); 
    if (!txt) return;
    
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const me = { id: userId, name: user, role };

    const optimistic: Msg = { 
      id, 
      text: txt, 
      ts: now, 
      user: me,
      reactions: {},
      replyTo: replyingTo?.id
    };
    seenIds.current.add(id);
    setMsgs((prev) => { 
  const next = [...prev, optimistic]; 
      requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" })); 
      return next; 
    });
    setText(""); 
    setLastError(null);
    setReplyingTo(null);

    try { 
      if (mode === "room") { 
        await rt.trigger(roomKey, "chat", { 
          id, 
          text: txt, 
          replyTo: replyingTo?.id 
        }); 
      } else if (dmTarget) { 
        await rt.trigger(dmRoomKey, "dm", { 
          id, 
          text: txt, 
          toUserId: dmTarget.id,
          replyTo: replyingTo?.id 
        }); 
      } 
    }
    catch (e: any) { 
      setLastError(e?.message || "Échec de l'envoi"); 
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) { 
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      send(); 
    }
    // Raccourcis clavier
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'f') {
        e.preventDefault();
        setShowSearch(!showSearch);
      }
    }
  }

  // Gestion des réactions
  const addReaction = async (messageId: string, emoji: string) => {
    try {
      await rt.trigger(mode === "room" ? roomKey : dmRoomKey, "reaction", {
        messageId,
        emoji,
        action: "add"
      });
    } catch (error) {
      console.warn("Failed to add reaction:", error);
    }
  };

  // Gestion des fichiers
  async function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; 
    if (!file) return; 
    await uploadFile(file); 
    e.currentTarget.value = "";
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("actorId", userId); 
      fd.append("actorName", user); 
      fd.append("actorRole", role);
      if (mode === "room") { 
        fd.append("scope", "room"); 
        fd.append("room", roomKey); 
      }
      else if (dmTarget) { 
        fd.append("scope", "direct"); 
        fd.append("toUserId", dmTarget.id); 
      }
      if (text.trim()) fd.append("message", text.trim());
      fd.append("file", file, file.name);

      const res = await fetch("/api/files/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { 
        alert(data?.error || "Upload échoué"); 
        return; 
      }
      setFiles((prev) => [data.file, ...prev]); 
      setText("");
    } catch { 
      alert("Erreur réseau"); 
    } finally { 
      setUploading(false); 
    }
  }

  // Assignation de tâches
  async function assignPrivateTask() {
    if (!(role === "chef" && dmTarget)) return;
    if (!ptTitle.trim() || !ptProject.trim()) return;
    setPtSaving(true);
    try {
      const res = await fetch("/api/team/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: { id: userId, name: user, role },
          userId: dmTarget.id,
          title: ptTitle.trim(),
          project: ptProject.trim(),
          dueDate: ptDueDate || undefined,
          dueTime: ptDueTime || undefined,
          dueText: ptDueText || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { 
        alert(data?.error || "Erreur lors de l'assignation"); 
        return; 
      }
      setPtTitle(""); setPtProject(""); setPtDueDate(""); setPtDueTime(""); setPtDueText("");
    } catch { 
      alert("Erreur réseau"); 
    } finally { 
      setPtSaving(false); 
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff" }}>
      {/* Header avec statut de connexion amélioré */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
        <div style={{ fontWeight: 700 }}>Chat</div>
        <button 
          onClick={() => { setMode("room"); setDmTarget(null); notificationManager.markAllAsRead(); }} 
          className={`text-xs px-2 py-1 rounded ${mode === "room" ? "bg-gray-900 text-white" : "border"}`} 
          title="Salon général"
        >
          Général
        </button>
        <button 
          onClick={() => setPickerOpen(true)} 
          className={`text-xs px-2 py-1 rounded ${mode === "dm" ? "bg-gray-900 text-white" : "border"}`} 
          title="Message privé"
        >
          Privé{dmTarget ? `: ${dmTarget.name}` : ""}
        </button>
        
        {/* Bouton retour au général (en mode DM) */}
        {mode === "dm" && (
          <button
            onClick={() => { setMode("room"); setDmTarget(null); }}
            className="text-xs px-2 py-1 rounded border bg-blue-50 hover:bg-blue-100"
            title="Retour au canal Général"
          >
            ← Général
          </button>
        )}
        
        {/* Bouton recherche */}
        <button 
          onClick={() => setShowSearch(!showSearch)} 
          className="text-xs px-2 py-1 rounded border" 
          title="Rechercher (Ctrl+F)"
        >
          🔍
        </button>
        
        {mode === "dm" && dmTarget && <span className="text-xs text-gray-500">En privé avec {dmTarget.name}</span>}
        
        {/* Indicateur de connexion amélioré */}
        <div className="ml-auto flex items-center gap-2">
          {isReconnecting && <span className="text-xs text-orange-500">Reconnexion...</span>}
          <span 
            title={connReady ? "Connecté" : (isReconnecting ? "Reconnexion en cours..." : "Déconnecté")} 
            style={{ 
              width: 8, 
              height: 8, 
              borderRadius: 9999, 
              background: connReady ? "#10b981" : (isReconnecting ? "#f59e0b" : "#ef4444"), 
              display: "inline-block" 
            }} 
          />
          {lastError && <span style={{ color: "#dc2626", fontSize: 12 }}>Erreur: {lastError}</span>}
        </div>
      </div>

      {/* Barre de recherche */}
      {showSearch && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans les messages..."
            className="w-full px-3 py-1 border rounded"
            autoFocus
          />
        </div>
      )}

      {/* Barre de réponse */}
      {replyingTo && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", background: "#ecfdf5" }}>
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">Réponse à {replyingTo.user.name}:</span>
              <span className="text-gray-600 ml-2">{replyingTo.text.slice(0, 50)}...</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-gray-700">×</button>
          </div>
        </div>
      )}

      {/* Section d'assignation de tâches */}
      {role === "chef" && mode === "dm" && dmTarget && (
        <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-sm">Assigner une tâche à {dmTarget?.name}</div>
            <button onClick={() => setShowAssign((v) => !v)} className="text-xs px-2 py-1 rounded border">
              {showAssign ? "Masquer" : "Afficher"}
            </button>
          </div>
          {showAssign && (
            <div className="grid grid-cols-1 gap-2">
              <input 
                value={ptTitle} 
                onChange={(e) => setPtTitle(e.target.value)} 
                placeholder='Titre (ex: "Préparer le rapport")' 
                className="border rounded-md px-2 py-1" 
              />
              <input 
                value={ptProject} 
                onChange={(e) => setPtProject(e.target.value)} 
                placeholder='Projet (ex: "Client X")' 
                className="border rounded-md px-2 py-1" 
              />
              <div className="text-xs text-gray-500">Échéance (date/heure OU texte)</div>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date" 
                  value={ptDueDate} 
                  onChange={(e) => setPtDueDate(e.target.value)} 
                  className="border rounded-md px-2 py-1" 
                />
                <input 
                  type="time" 
                  value={ptDueTime} 
                  onChange={(e) => setPtDueTime(e.target.value)} 
                  className="border rounded-md px-2 py-1" 
                />
              </div>
              <input 
                value={ptDueText} 
                onChange={(e) => setPtDueText(e.target.value)} 
                placeholder='Texte (ex: "lundi", "demain 14:00")' 
                className="border rounded-md px-2 py-1" 
              />
              <div className="flex gap-2">
                <button 
                  onClick={assignPrivateTask} 
                  disabled={ptSaving || !ptTitle.trim() || !ptProject.trim()} 
                  className="px-3 py-2 rounded-md bg-gray-900 text-white disabled:opacity-50"
                >
                  {ptSaving ? "Assignation…" : "Assigner"}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const today = new Date(); 
                    const yyyy = today.getFullYear(); 
                    const mm = String(today.getMonth() + 1).padStart(2, "0"); 
                    const dd = String(today.getDate()).padStart(2, "0");
                    setPtDueDate(`${yyyy}-${mm}-${dd}`); 
                    setPtDueTime("17:00");
                  }} 
                  className="px-3 py-2 rounded-md border"
                >
                  Aujourd'hui 17:00
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const d = new Date(); 
                    d.setDate(d.getDate() + 1);
                    const yyyy = d.getFullYear(); 
                    const mm = String(d.getMonth() + 1).padStart(2, "0"); 
                    const dd = String(d.getDate()).padStart(2, "0");
                    setPtDueDate(`${yyyy}-${mm}-${dd}`); 
                    setPtDueTime("09:00");
                  }} 
                  className="px-3 py-2 rounded-md border"
                >
                  Demain 09:00
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zone de messages */}
      <div ref={scrollerRef} className="flex-1 overflow-auto" style={{ background: "#f9fafb", padding: 12, lineHeight: 1.5, fontSize: 14 }}>
        {filteredMsgs.map((m) => (
          <div key={m.id} style={{ marginBottom: 10 }} className="group">
            {/* Message principal */}
            <div className="flex items-start gap-2">
              <div className="flex-1">
                {m.replyTo && (
                  <div className="text-xs text-gray-500 mb-1 pl-2 border-l-2 border-gray-300">
                    Réponse à un message précédent
                  </div>
                )}
                <div>
                  <span style={{ fontWeight: 600 }}>{m.user.name}</span>: {m.text}
                  {m.isEdited && <span className="text-xs text-gray-400 ml-1">(modifié)</span>}
                  <span style={{ color: "#6b7280", marginLeft: 6, fontSize: 12 }}>
                    {new Date(m.ts).toLocaleTimeString()}
                  </span>
                </div>
                
                {/* Réactions */}
                {Object.keys(m.reactions || {}).length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {Object.entries(m.reactions || {}).map(([emoji, userIds]) => (
                      <button
                        key={emoji}
                        onClick={() => addReaction(m.id, emoji)}
                        className="text-xs px-1 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                        title={`${userIds.join(', ')}`}
                      >
                        {emoji} {userIds.length}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Actions sur hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={() => setReplyingTo(m)}
                  className="text-xs px-1 py-0.5 rounded hover:bg-gray-200"
                  title="Répondre"
                >
                  ↩️
                </button>
                <details className="relative">
                  <summary className="text-xs px-1 py-0.5 rounded hover:bg-gray-200 cursor-pointer">
                    😀
                  </summary>
                  <div className="absolute top-6 right-0 bg-white border rounded shadow-lg p-2 z-10">
                    <div className="grid grid-cols-4 gap-1">
                      {EMOJI_REACTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => addReaction(m.id, emoji)}
                          className="text-lg hover:bg-gray-100 rounded p-1"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        ))}
        
        {/* Indicateurs de frappe */}
        {usersTyping.length > 0 && (
          <div className="text-xs text-gray-500 italic">
            {usersTyping.map(u => u.userName).join(', ')} {usersTyping.length === 1 ? 'est en train' : 'sont en train'} d'écrire...
          </div>
        )}
        
        {/* Liste des fichiers */}
        {files.length > 0 && (
          <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 8, paddingTop: 8 }}>
            <div className="text-sm font-medium mb-2">📎 Fichiers partagés</div>
            {files.slice(0, 5).map((f) => (
              <div key={f.id} style={{ marginBottom: 8 }} className="bg-white p-2 rounded border">
                <div className="flex items-center justify-between">
                  <div>
                    <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                      {f.name}
                    </a>
                    <span style={{ color: "#6b7280", fontSize: 12, marginLeft: 6 }}>
                      ({Math.round(f.size / 1024)} Ko)
                    </span>
                  </div>
                  <a 
                    href={`${f.url}${f.url.includes("?") ? "&" : "?"}download=1`} 
                    className="text-xs text-blue-600 hover:underline" 
                    title="Télécharger"
                  >
                    ⬇️ Télécharger
                  </a>
                </div>
                {(f as any).message && (
                  <div style={{ color: "#374151", fontSize: 12, marginTop: 4 }}>
                    {(f as any).message}
                  </div>
                )}
              </div>
            ))}
            {files.length > 5 && (
              <div className="text-xs text-gray-500">... et {files.length - 5} autres fichiers</div>
            )}
          </div>
        )}
        
        {filteredMsgs.length === 0 && files.length === 0 && (
          <div style={{ color: "#6b7280", textAlign: "center", padding: 20 }}>
            {searchQuery ? "Aucun message trouvé pour cette recherche." : "Aucun message pour l'instant."}
          </div>
        )}
      </div>

      {/* Zone de saisie améliorée */}
      <div className="border-t" style={{ display: "flex", gap: 8, alignItems: "flex-end", padding: "10px 12px" }}>
        <div className="flex-1">
          <textarea 
            ref={textareaRef}
            rows={2} 
            value={text} 
            onChange={handleTextChange} 
            onKeyDown={onKeyDown}
            placeholder={mode === "room" ? "Écrire un message… (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)" : `Message privé à ${dmTarget?.name || "…"}`}
            style={{ 
              width: "100%", 
              padding: 10, 
              resize: "vertical", 
              border: "1px solid #e5e7eb", 
              borderRadius: 8,
              minHeight: 44
            }}
          />
          <div className="flex items-center justify-between mt-1">
            <div className="text-xs text-gray-500">
              Ctrl+F: Rechercher • ↩️: Répondre • 😀: Réactions
            </div>
            <div className="text-xs text-gray-400">
              {text.length}/2000
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploading} 
            title="Joindre un fichier" 
            className="px-3 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? "..." : "📎"}
          </button>
          <button 
            onClick={send} 
            disabled={!text.trim()}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Envoyer
          </button>
        </div>
        <input ref={fileInputRef} type="file" onChange={handlePickFile} hidden />
      </div>

      {/* Modal de sélection d'utilisateur pour DM */}
      {pickerOpen && (
        <MemberPicker 
          title="Message privé à…" 
          onSelect={(m) => { 
            setMode("dm"); 
            setDmTarget({ id: m.id, name: m.name }); 
            setPickerOpen(false); 
          }} 
          onClose={() => setPickerOpen(false)} 
        />
      )}
    </div>
  );
}
