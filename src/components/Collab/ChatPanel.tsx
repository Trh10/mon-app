"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { MessageReactions } from "../chat/EmojiPicker";
import { getNotificationManager } from "../../lib/notifications/manager";
import { getRealtimeClient } from "../../lib/realtime/provider";
import MemberPicker from "./MemberPicker";

type Role = "chef" | "manager" | "assistant" | "employe";
type Msg = { id: string; user: { id: string; name: string; role: Role }; text: string; ts: number };
type FileEvt = { id: string; name: string; size: number; mime: string; url: string; message?: string; scope: "room" | "direct"; toUserId?: string; room?: string; };
type TaskEvt = { task: { id: string; userId: string; title: string; project: string; status: "todo" | "in_progress" | "done"; updatedAt: number; createdAt: number; createdBy: { id: string; name: string }; dueAt?: number | null; }; };

function dmKey(a: string, b: string) {
  const [x, y] = a < b ? [a, b] : [b, a];
  return `dm:${x}:${y}`;
}

export default function ChatPanel({
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
  const [mode, setMode] = useState<"room" | "dm">("room");
  const [dmTarget, setDmTarget] = useState<{ id: string; name: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Initialiser avec le DM target si fourni
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
  const seenIds = useRef<Set<string>>(new Set());
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [connReady, setConnReady] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // États pour drag & drop
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  // Fonctionnalité de recherche
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  // Messages filtrés par recherche
  const filteredMsgs = useMemo(() => {
    if (!searchTerm) return msgs;
    return msgs.filter(msg => 
      msg.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [msgs, searchTerm]);

  const canAssignPrivately = role === "chef" && mode === "dm" && !!dmTarget;
  const [ptTitle, setPtTitle] = useState(""); const [ptProject, setPtProject] = useState("");
  const [ptDueDate, setPtDueDate] = useState(""); const [ptDueTime, setPtDueTime] = useState(""); const [ptDueText, setPtDueText] = useState("");
  const [ptSaving, setPtSaving] = useState(false); const [showAssign, setShowAssign] = useState(false);

  useEffect(() => { if (canAssignPrivately) setShowAssign(true); }, [canAssignPrivately]);

  // Ajout de notifications pour nouveaux messages
  useEffect(() => {
    if (!filteredMsgs.length) return;
    
    const lastMessage = filteredMsgs[filteredMsgs.length - 1];
    
    // Ne pas notifier nos propres messages
    if (lastMessage.user.id === userId) return;
    
    // Notifier uniquement les nouveaux messages
    const now = Date.now();
    if (now - lastMessage.ts < 5000) { // Message de moins de 5 secondes
      const notificationManager = getNotificationManager();
      notificationManager.addNotification({
        type: 'chat',
        title: 'Nouveau message',
        message: `${lastMessage.user.name}: ${lastMessage.text.substring(0, 50)}${lastMessage.text.length > 50 ? '...' : ''}`,
        priority: 'normal'
      });
    }
  }, [filteredMsgs, userId]);

  const roomKey = useMemo(() => `room:${roomId}`, [roomId]);
  const dmRoomKey = useMemo(() => (dmTarget ? dmKey(userId, dmTarget.id) : ""), [dmTarget, userId]);

  // Gestion du drag & drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragOver(false);
      }
      return newCount;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Traiter chaque fichier
    for (const file of files) {
      await uploadFile(file);
    }
  };

  // Ecoute des commandes globales: ouvrir un DM (depuis une notification)
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("chat-control");
      bc.onmessage = (ev) => {
        const data = ev?.data || {};
        if (data?.type === "open-dm" && data?.targetId) {
          setMode("dm");
          setDmTarget({ id: String(data.targetId), name: String(data.targetName || "Membre") });
          setPickerOpen(false);
        }
      };
    } catch {}
    return () => { try { bc?.close(); } catch {} };
  }, []);

  // Propager le contexte au parent
  useEffect(() => { onContextUpdate?.({ mode, dmTargetId: dmTarget?.id }); }, [mode, dmTarget?.id, onContextUpdate]);

  // Historique + fichiers
  useEffect(() => {
    (async () => {
      const key = mode === "room" ? roomKey : dmRoomKey;
      if (!key) { setMsgs([]); setFiles([]); return; }
      try {
        const res = await fetch(`/api/realtime/history?room=${encodeURIComponent(key)}`, { cache: "no-store" });
        const data = await res.json();
        const items: Msg[] = (data?.items || []).map((m: any) => ({ id: m.id, text: m.text, ts: m.ts, user: m.user }));
        seenIds.current = new Set(items.map((m) => m.id));
        setMsgs(items);
        requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight }));
      } catch (e: any) {
        setLastError(e?.message || "Impossible de charger l'historique");
      }

      if (mode === "room") {
        try { const fres = await fetch(`/api/files/list?room=${encodeURIComponent(roomKey)}`, { cache: "no-store" }); const fdata = await fres.json(); setFiles((fdata?.items || []) as FileEvt[]); } catch {}
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
  }, [mode, roomKey, dmRoomKey, userId, dmTarget]);

  // Abonnements temps réel
  useEffect(() => {
    rt.setUser({ id: userId, name: user, role });
    const offs: Array<() => void> = [];
    
    // Connection state
    offs.push(rt.on("presence:state", () => setConnReady(true)));

    // Chat public - toujours écouter
    offs.push(rt.on("chat", (env) => {
      if (mode !== "room") return; // Ignorer si en mode DM
      const m: Msg = { id: env?.payload?.id, text: env?.payload?.text, user: env?.user, ts: env?.ts };
      if (!m?.id || seenIds.current.has(m.id)) return;
      seenIds.current.add(m.id);
      setMsgs((prev) => { 
        const next = [...prev, m].slice(-200); 
        requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" })); 
        return next; 
      });
    }));

    // DM - écouter via le canal utilisateur
    offs.push(rt.on("dm", (env) => {
      if (mode !== "dm") return; // Ignorer si pas en mode DM
      const fromId = env?.user?.id;
      const toId = env?.payload?.toUserId;
      
      // Vérifier que le message concerne la conversation actuelle
      const isRelevant = dmTarget && (
        (fromId === dmTarget.id && toId === userId) || // Message reçu
        (fromId === userId && toId === dmTarget.id)    // Message envoyé (echo)
      );
      
      if (!isRelevant) return;
      
      const m: Msg = { id: env?.payload?.id, text: env?.payload?.text, user: env?.user, ts: env?.ts };
      if (!m?.id || seenIds.current.has(m.id)) return;
      seenIds.current.add(m.id);
      setMsgs((prev) => {
        const next = [...prev, m].slice(-200);
        requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" }));
        return next;
      });
    }));

    // Fichiers
    offs.push(rt.on("file", (env) => {
      const p = env?.payload as FileEvt;
      if (!p?.id) return;
      
      if (mode === "room") {
        setFiles((prev) => [p, ...prev]);
      } else if (dmTarget) {
        // Fichier DM - vérifier si c'est pour cette conversation
        if ((p.toUserId === userId && (env?.user?.id) === dmTarget.id) || 
            (p.toUserId === dmTarget.id && (env?.user?.id) === userId)) {
          setFiles((prev) => [p, ...prev]);
        }
      }
    }));

    // Tâches assignées
    offs.push(rt.on("task", (env) => {
      const p = env?.payload as any;
      const t = p?.task;
      if (!t?.id) return;
      
      if (mode === "dm" && dmTarget && (t.userId === dmTarget.id || t.createdBy?.id === dmTarget.id)) {
        const suffix = [
          t.isPrivate ? 'Privée' : null,
          t.dueAt ? `Échéance: ${new Date(t.dueAt).toLocaleString()}` : null
        ].filter(Boolean).join(' · ');
        const sys: Msg = { 
          id: `task-${t.id}`, 
          ts: env?.ts || Date.now(), 
          user: env?.user, 
          text: `Tâche assignée: "${t.title}" (${t.project})${suffix ? ` · ${suffix}` : ''}` 
        };
        if (!seenIds.current.has(sys.id)) { 
          seenIds.current.add(sys.id); 
          setMsgs((prev) => [...prev, sys].slice(-200)); 
        }
      }
    }));

    return () => { offs.forEach((off) => off?.()); };
  }, [mode, roomKey, dmRoomKey, userId, user, role, rt, dmTarget]);

  async function send() {
    const txt = text.trim(); if (!txt) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const me = { id: userId, name: user, role };

    const optimistic: Msg = { id, text: txt, ts: now, user: me };
    seenIds.current.add(id);
    setMsgs((prev) => { const next = [...prev, optimistic].slice(-200); requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" })); return next; });
    setText(""); setLastError(null);

    try { if (mode === "room") { await rt.trigger(roomKey, "chat", { id, text: txt }); } else if (dmTarget) { await rt.trigger(dmRoomKey, "dm", { id, text: txt, toUserId: dmTarget.id }); } }
    catch (e: any) { setLastError(e?.message || "Échec de l'envoi"); }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }

  async function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Traiter chaque fichier sélectionné
    for (const file of files) {
      await uploadFile(file);
    }
    
    e.currentTarget.value = "";
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("actorId", userId); fd.append("actorName", user); fd.append("actorRole", role);
      if (mode === "room") { fd.append("scope", "room"); fd.append("room", roomKey); }
      else if (dmTarget) { fd.append("scope", "direct"); fd.append("toUserId", dmTarget.id); }
      if (text.trim()) fd.append("message", text.trim());
      fd.append("file", file, file.name);

      const res = await fetch("/api/files/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { 
        setLastError(data?.error || "Upload échoué"); 
        return; 
      }
      
      setFiles((prev) => [data.file, ...prev]); 
      setText("");
      
      // Succès - afficher notification
      const notificationManager = getNotificationManager();
      notificationManager.addNotification({
        type: 'file',
        title: 'Fichier envoyé',
        message: `${file.name} a été partagé avec succès`,
        priority: 'normal'
      });
      
    } catch (error) { 
      setLastError("Erreur réseau lors de l'upload"); 
    } finally { 
      setUploading(false); 
    }
  }

  async function assignPrivateTask() {
    if (!(role === "chef" && dmTarget)) return;
    if (!ptTitle.trim() || !ptProject.trim()) return;
    setPtSaving(true);
    try {
      // Construire une chaîne d'échéance compacte
      const dueStr = ptDueText?.trim() ? ptDueText.trim() : (ptDueDate ? `${ptDueDate}${ptDueTime ? ` ${ptDueTime}` : ""}` : undefined);

      const res = await fetch("/api/team/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          data: {
            title: ptTitle.trim(),
            description: `Projet: ${ptProject.trim()}${dueStr ? `\nÉchéance: ${dueStr}` : ""}`,
            assignedTo: dmTarget.id,
            priority: "medium",
            isPrivate: true,
            dueDate: dueStr,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data?.error || "Erreur lors de l’assignation"); return; }

      // Envoyer un DM résumé pour feedback instantané
      try {
        const dmId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const summary = `Tâche privée assignée: "${ptTitle.trim()}" (${ptProject.trim()})${dueStr ? ` · Échéance: ${dueStr}` : ""}`;
        await rt.trigger(dmRoomKey, "dm", { id: dmId, text: summary, toUserId: dmTarget.id });
      } catch {}
      setPtTitle(""); setPtProject(""); setPtDueDate(""); setPtDueTime(""); setPtDueText("");
    } catch { alert("Erreur réseau"); } finally { setPtSaving(false); }
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, position: "relative" }}
         onDragEnter={handleDragEnter}
         onDragLeave={handleDragLeave}
         onDragOver={handleDragOver}
         onDrop={handleDrop}>
         
      {/* Overlay pour drag & drop */}
      {isDragOver && (
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          border: "2px dashed #3b82f6",
          borderRadius: 10,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            backgroundColor: "white",
            padding: 16,
            borderRadius: 8,
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>📁</div>
            <div style={{ fontWeight: 600, color: "#374151" }}>Déposer les fichiers ici</div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>pour les partager instantanément</div>
          </div>
        </div>
      )}
      {/* EN-TÊTE CHAT MODERNISÉ - Design ultra professionnel */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">💬</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Chat Pro</h3>
                <p className="text-xs text-gray-500">
                  {mode === "room" ? "Conversation générale" : dmTarget ? `Privé avec ${dmTarget.name}` : "Message privé"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Statut de connexion moderne */}
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${connReady ? "bg-green-500" : "bg-yellow-500"}`}></div>
              <span className="text-xs text-gray-600">{connReady ? "En ligne" : "Connexion..."}</span>
            </div>
            
            {/* Bouton recherche moderne */}
            <button 
              onClick={() => setShowSearch(!showSearch)} 
              className={`p-2 rounded-lg transition-all ${showSearch ? "bg-blue-500 text-white shadow-lg" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`} 
              title="Rechercher dans les messages"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Navigation moderne entre modes */}
        <div className="flex space-x-1 mt-3 bg-white rounded-lg p-1 shadow-sm">
          <button 
            onClick={() => { setMode("room"); setDmTarget(null); }} 
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              mode === "room" 
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md" 
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span className="mr-2">🌐</span>Général
          </button>
          <button 
            onClick={() => setPickerOpen(true)} 
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              mode === "dm" 
                ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md" 
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span className="mr-2">🔒</span>Privé
          </button>
        </div>
        
        {lastError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
            <span className="text-red-600 text-xs">⚠️ {lastError}</span>
          </div>
        )}
      </div>

      {/* ZONE DE RECHERCHE MODERNISÉE */}
      {showSearch && (
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100 p-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher messages, utilisateurs..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded-md border">
                <span className="font-medium">{filteredMsgs.length}</span> message(s) trouvé(s)
              </div>
              {filteredMsgs.length === 0 && (
                <div className="text-xs text-gray-500">Aucun résultat pour "{searchTerm}"</div>
              )}
            </div>
          )}
        </div>
      )}

      {role === "chef" && mode === "dm" && dmTarget && (
        <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-sm">Assigner une tâche à {dmTarget?.name}</div>
            <button onClick={() => setShowAssign((v) => !v)} className="text-xs px-2 py-1 rounded border">{showAssign ? "Masquer" : "Afficher"}</button>
          </div>
          {showAssign && (
            <div className="grid grid-cols-1 gap-2">
              <input value={ptTitle} onChange={(e) => setPtTitle(e.target.value)} placeholder='Titre (ex: "Préparer le rapport")' className="border rounded-md px-2 py-1" />
              <input value={ptProject} onChange={(e) => setPtProject(e.target.value)} placeholder='Projet (ex: "Client X")' className="border rounded-md px-2 py-1" />
              <div className="text-xs text-gray-500">Échéance (date/heure OU texte)</div>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={ptDueDate} onChange={(e) => setPtDueDate(e.target.value)} className="border rounded-md px-2 py-1" />
                <input type="time" value={ptDueTime} onChange={(e) => setPtDueTime(e.target.value)} className="border rounded-md px-2 py-1" />
              </div>
              <input value={ptDueText} onChange={(e) => setPtDueText(e.target.value)} placeholder='Texte (ex: "lundi", "demain 14:00")' className="border rounded-md px-2 py-1" />
              <div className="flex gap-2">
                <button onClick={assignPrivateTask} disabled={ptSaving || !ptTitle.trim() || !ptProject.trim()} className="px-3 py-2 rounded-md bg-gray-900 text-white disabled:opacity-50">
                  {ptSaving ? "Assignation…" : "Assigner"}
                </button>
                <button type="button" onClick={() => {
                  const today = new Date(); const yyyy = today.getFullYear(); const mm = String(today.getMonth() + 1).padStart(2, "0"); const dd = String(today.getDate()).padStart(2, "0");
                  setPtDueDate(`${yyyy}-${mm}-${dd}`); setPtDueTime("17:00");
                }} className="px-3 py-2 rounded-md border">Aujourd'hui 17:00</button>
                <button type="button" onClick={() => {
                  const d = new Date(); d.setDate(d.getDate() + 1);
                  const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0");
                  setPtDueDate(`${yyyy}-${mm}-${dd}`); setPtDueTime("09:00");
                }} className="px-3 py-2 rounded-md border">Demain 09:00</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div ref={scrollerRef} style={{ height, overflow: "auto", background: "#f9fafb", padding: 12, lineHeight: 1.5, fontSize: 14 }}>
        {filteredMsgs.map((m: Msg) => (
          <div key={m.id} className="bg-white rounded-lg p-3 mb-3 shadow-sm border border-gray-200">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                m.user.role === "chef" ? "bg-red-500" :
                m.user.role === "manager" ? "bg-blue-500" :
                m.user.role === "assistant" ? "bg-green-500" :
                "bg-gray-500"
              }`}>
                {m.user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{m.user.name}</span>
                  <span className="text-xs text-gray-500">{new Date(m.ts).toLocaleTimeString()}</span>
                  {m.user.role !== "employe" && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      m.user.role === "chef" ? "bg-red-100 text-red-700" :
                      m.user.role === "manager" ? "bg-blue-100 text-blue-700" :
                      m.user.role === "assistant" ? "bg-green-100 text-green-700" :
                      "bg-purple-100 text-purple-700"
                    }`}>
                      {m.user.role === "chef" ? "Chef" :
                       m.user.role === "manager" ? "Manager" :
                       m.user.role === "assistant" ? "Assistant" :
                       m.user.role === "employe" ? "Employé" :
                       m.user.role}
                    </span>
                  )}
                </div>
                <div className="text-gray-700 whitespace-pre-wrap break-words mb-2">
                  {m.text}
                </div>
                {m.text.startsWith('Tâche assignée: ') && (
                  <div className="mt-2">
                    <button
                      className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                      onClick={async () => {
                        try {
                          const match = m.id.startsWith('task-') ? m.id.slice(5) : null;
                          if (!match) return;
                          const res = await fetch('/api/team/tasks', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'update-status', taskId: match, data: { status: 'completed' } })
                          });
                          if (!res.ok) {
                            const j = await res.json().catch(() => ({}));
                            alert(j?.error || 'Échec de la mise à jour');
                          }
                        } catch {
                          alert('Erreur réseau');
                        }
                      }}
                    >Marquer comme terminée</button>
                  </div>
                )}
                
                {/* Reactions pour ce message */}
                <MessageReactions 
                  reactions={{}} // TODO: Implémenter le système de réactions en temps réel
                  onReactionAdd={(emoji: string) => {
                    // Envoyer réaction via real-time
                    console.log(`Réaction ${emoji} ajoutée au message ${m.id}`);
                    rt.trigger(mode === "room" ? roomKey : dmRoomKey, "reaction", {
                      messageId: m.id,
                      emoji,
                      userId,
                      userName: user,
                      action: 'add'
                    });
                  }}
                  onReactionRemove={(emoji: string) => {
                    // Retirer réaction via real-time
                    console.log(`Réaction ${emoji} retirée du message ${m.id}`);
                    rt.trigger(mode === "room" ? roomKey : dmRoomKey, "reaction", {
                      messageId: m.id,
                      emoji,
                      userId,
                      userName: user,
                      action: 'remove'
                    });
                  }}
                  compact={false}
                />
              </div>
            </div>
          </div>
        ))}
        {files.length > 0 && (
          <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 8, paddingTop: 8 }}>
            {files.map((f) => (
              <div key={f.id} style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Fichier</span>: <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>{f.name}</a>{" "}
                <a href={`${f.url}${f.url.includes("?") ? "&" : "?"}download=1`} className="ml-2 text-xs text-gray-600 underline" title="Télécharger">Télécharger</a>
                <span style={{ color: "#6b7280", fontSize: 12, marginLeft: 6 }}>({Math.round(f.size / 1024)} Ko)</span>
                {(f as any).message && <div style={{ color: "#374151" }}>{(f as any).message}</div>}
              </div>
            ))}
          </div>
        )}
        {msgs.length === 0 && files.length === 0 && <div style={{ color: "#6b7280" }}>Aucun message pour l’instant.</div>}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px" }}>
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown}
          placeholder={mode === "room" ? "Écrire un message… (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)" : `Message privé à ${dmTarget?.name || "…"}`}
          style={{ flex: 1, padding: 10, resize: "vertical", border: "1px solid #e5e7eb", borderRadius: 8 }}
        />
        <div className="relative">
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploading} 
            title="Joindre un fichier (ou glisser-déposer)" 
            className={`px-3 py-2 border rounded-md transition-colors ${
              uploading ? "bg-gray-100 text-gray-400" : "hover:bg-gray-50"
            }`}
          >
            {uploading ? (
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">...</span>
              </div>
            ) : (
              "📎"
            )}
          </button>
        </div>
        <button onClick={send} className="px-3 py-2 rounded-md bg-gray-900 text-white">Envoyer</button>
        <input ref={fileInputRef} type="file" onChange={handlePickFile} hidden multiple />
      </div>

      {pickerOpen && (
        <MemberPicker title="Message privé à…" onSelect={(m) => { setMode("dm"); setDmTarget({ id: m.id, name: m.name }); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}