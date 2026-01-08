"use client";

import { useEffect, useRef, useState } from "react";
import ChatPanel from "./ChatPanel";
import { getRealtimeClient } from "../../lib/realtime/provider";
import { getNotificationManager } from "../../lib/notifications/manager";
// Notifications simplifiées
const getNotifyEnabled = () => localStorage.getItem("__notify_enabled") === "1";
const setNotifyEnabled = (enabled: boolean) => localStorage.setItem("__notify_enabled", enabled ? "1" : "0");
const canNotifyNow = () => !document.hasFocus();
const showNotification = (title: string, body: string) => {
  if (Notification.permission === "granted" && canNotifyNow()) {
    new Notification(title, { body, icon: "/logo.png" });
  }
};
const ensurePermission = async () => {
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
};

type Role = "chef" | "manager" | "assistant" | "employe";

export default function FloatingChat({
  roomId,
  userId,
  userName,
  role = "employe" as Role,
  embedded = false,
  initialDmTarget,
}: {
  roomId: string;
  userId: string;
  userName: string;
  role?: Role;
  embedded?: boolean;
  initialDmTarget?: { id: string; name: string };
}) {
  const rt = getRealtimeClient();
  const notificationManager = getNotificationManager();

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return { x: 24, y: 24 };
    try {
      const raw = localStorage.getItem("__float_chat_pos");
      if (raw) return JSON.parse(raw);
    } catch {}
    return { x: 24, y: 24 };
  });
  const [size, setSize] = useState<{ w: number; h: number }>(() => {
    if (typeof window === "undefined") return { w: 560, h: 520 };
    try {
      const w = parseInt(localStorage.getItem("__float_chat_w") || "", 10);
      const h = parseInt(localStorage.getItem("__float_chat_h") || "", 10);
      if (isFinite(w) && isFinite(h) && w >= 360 && h >= 360) return { w, h };
    } catch {}
    return { w: 560, h: 520 };
  });
  const [min, setMin] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("__float_chat_min") === "1";
  });

  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("__float_chat_hidden") === "1";
  });

  // Interrupteur notifications
  const [notifyEnabled, setNotifyEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return getNotifyEnabled();
  });

  // Contexte actif du ChatPanel (mode et cible DM)
  const [activeCtx, setActiveCtx] = useState<{ mode: "room" | "dm"; dmTargetId?: string }>({ mode: "room" });
  const activeCtxRef = useRef(activeCtx);
  useEffect(() => { activeCtxRef.current = activeCtx; }, [activeCtx]);

  // Notifications non lues par expéditeur (DM/fichiers/tâches directs)
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
  const unreadTotal = Object.values(unreadByUser).reduce((a, b) => a + b, 0);

  // Persist état UI
  useEffect(() => { try { localStorage.setItem("__float_chat_pos", JSON.stringify(pos)); } catch {} }, [pos]);
  useEffect(() => {
    try { localStorage.setItem("__float_chat_w", String(size.w)); localStorage.setItem("__float_chat_h", String(size.h)); } catch {}
  }, [size]);
  useEffect(() => { try { localStorage.setItem("__float_chat_min", min ? "1" : "0"); } catch {} }, [min]);
  useEffect(() => { try { localStorage.setItem("__float_chat_hidden", hidden ? "1" : "0"); } catch {} }, [hidden]);

  // Drag
  const dragging = useRef(false);
  const start = useRef({ mx: 0, my: 0, x: 0, y: 0 });
  function onHeaderDown(e: React.MouseEvent) {
    dragging.current = true;
    start.current = { mx: e.clientX, my: e.clientY, x: pos.x, y: pos.y };
    window.addEventListener("mousemove", onMove as any);
    window.addEventListener("mouseup", onUp as any, { once: true });
  }
  function onMove(e: MouseEvent) {
    if (dragging.current) {
      const dx = e.clientX - start.current.mx;
      const dy = e.clientY - start.current.my;
      // Ancré à droite/bas
      setPos({ x: Math.max(8, start.current.x - dx), y: Math.max(8, start.current.y - dy) });
    }
    if (resizing.current) {
      const dx = rstart.current.mx - e.clientX;
      const dy = rstart.current.my - e.clientY;
      const w = Math.max(360, rstart.current.w + dx);
      const h = Math.max(360, rstart.current.h + dy);
      setSize({ w, h });
    }
  }
  function onUp() {
    dragging.current = false;
    resizing.current = false;
    window.removeEventListener("mousemove", onMove as any);
  }

  // Resize
  const resizing = useRef(false);
  const rstart = useRef({ mx: 0, my: 0, w: 0, h: 0 });
  function onResizeDown(e: React.MouseEvent) {
    e.stopPropagation();
    resizing.current = true;
    rstart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
    window.addEventListener("mousemove", onMove as any);
    window.addEventListener("mouseup", onUp as any, { once: true });
  }

  const headerH = 40;
  const scrollerHeight = Math.max(260, size.h - headerH - 160);

  // Abonnements pour compter les non-lus + notifications (canal personnel)
  useEffect(() => {
    rt.setUser({ id: userId, name: userName, role });
    const offs: Array<() => void> = [];

    const shouldNotify = (fromId?: string) => {
      if (!fromId) return false;
      const ctx = activeCtxRef.current;
      const notFocused = min || ctx.mode !== "dm" || ctx.dmTargetId !== fromId;
      return notFocused && notifyEnabled;
    };

    const bump = (fromId: string | undefined) => {
      if (!fromId) return;
      const ctx = activeCtxRef.current;
      const notFocused = min || ctx.mode !== "dm" || ctx.dmTargetId !== fromId;
      if (!notFocused) return;
      setUnreadByUser((prev) => ({ ...prev, [fromId]: (prev[fromId] || 0) + 1 }));
    };

    // DM texte
    offs.push(rt.subscribe(`user:${userId}`, "dm", async (env) => {
      const fromId = env?.user?.id as string | undefined;
      const fromName = env?.user?.name as string | undefined;
      const text = String(env?.payload?.text || "");
      bump(fromId);
      if (shouldNotify(fromId)) {
        await ensurePermission();
        if (Notification.permission === "granted") {
          notificationManager.addChatNotification(text.slice(0, 140), fromName || "Quelqu'un", roomId);
        }
      }
    }));

    // Fichier direct
    offs.push(rt.subscribe(`user:${userId}`, "file", async (env) => {
      const toUserId = env?.payload?.toUserId as string | undefined;
      if (toUserId !== userId) return;
      const fromId = env?.user?.id as string | undefined;
      const fromName = env?.user?.name as string | undefined;
      const fname = String(env?.payload?.name || "Fichier");
      const note = env?.payload?.message ? ` · ${String(env?.payload?.message).slice(0, 80)}` : "";
      bump(fromId);
      if (shouldNotify(fromId)) {
        await ensurePermission();
        if (Notification.permission === "granted") {
          notificationManager.addFileNotification(fname, fromName || "Quelqu'un");
        }
      }
    }));
    // Tâche privée
    offs.push(rt.subscribe(`user:${userId}`, "task", async (env) => {
      const t = env?.payload?.task;
      if (!t || (t.userId !== userId && t.createdBy?.id !== userId)) return;
      const fromId = env?.user?.id as string | undefined;
      const fromName = env?.user?.name as string | undefined;
      const title = String(t?.title || "Nouvelle tâche");
      const project = String(t?.project || "");
      const due = t?.dueAt ? ` · Échéance ${new Date(t.dueAt).toLocaleString()}` : "";
      bump(fromId);
      if (shouldNotify(fromId)) {
        await ensurePermission();
        if (Notification.permission === "granted") {
          notificationManager.addTaskNotification(title, fromName || "Votre chef");
        }
      }
    }));

    return () => { offs.forEach((off) => off?.()); };
  }, [rt, userId, userName, role, min, notifyEnabled]);

  // Marquer comme lu pour un utilisateur (quand on ouvre le DM correspondant)
  function markReadFor(userIdToClear?: string) {
    if (!userIdToClear) return;
    setUnreadByUser((prev) => {
      if (!prev[userIdToClear]) return prev;
      const next = { ...prev };
      delete next[userIdToClear];
      return next;
    });
  }

  // Contexte depuis ChatPanel
  function handleContextUpdate(ctx: { mode: "room" | "dm"; dmTargetId?: string }) {
    setActiveCtx(ctx);
    if (!min && ctx.mode === "dm" && ctx.dmTargetId) {
      markReadFor(ctx.dmTargetId);
    }
  }

  // Toggle réduit
  function toggleMin() {
    setMin((prev) => {
      const next = !prev;
      if (!next && activeCtx.mode === "dm" && activeCtx.dmTargetId) {
        markReadFor(activeCtx.dmTargetId);
      }
      return next;
    });
  }

  // Toggle notifications
  async function toggleNotify() {
    const next = !notifyEnabled;
    if (next) {
      await ensurePermission();
      if (Notification.permission !== "granted") {
        // Permission refusée: on reste désactivé
        setNotifyEnabled(false);
        setNotifyEnabledState(false);
        alert("Active les notifications dans ton navigateur pour recevoir des alertes.");
        return;
      }
    }
    setNotifyEnabled(next);
    setNotifyEnabledState(next);
  }

  // Toggle caché
  function toggleHidden() { setHidden(!hidden); }

  const badge = unreadTotal > 0 ? (unreadTotal > 99 ? "99+" : String(unreadTotal)) : "";

  // Si caché, ne rien afficher
  if (hidden) return null;

  // Mode embedded (intégré dans le panel)
  if (embedded) {
    return (
      <div className="h-full flex flex-col">
        <ChatPanel
          roomId={roomId}
          userId={userId}
          user={userName}
          role={role}
          height={400}
          initialDmTarget={initialDmTarget}
        />
      </div>
    );
  }

  // Mode floating (fenêtre flottante)
  return (
    <div
      style={{
        position: "fixed",
        right: pos.x,
        bottom: pos.y,
        zIndex: 50,
        width: min ? 300 : size.w,
      }}
      className="shadow-2xl"
    >
      <div
        onMouseDown={onHeaderDown}
        className="cursor-move bg-gray-900 text-white rounded-t-md px-3 py-2 flex items-center justify-between"
        style={{ height: headerH }}
      >
        <div className="font-semibold text-sm flex items-center gap-2">
          <span>Chat</span>
          {badge && (
            <span
              title="Nouveaux messages privés"
              className={`inline-flex items-center justify-center text-[10px] font-semibold rounded-full ${min ? "bg-red-500" : "bg-red-600"} text-white`}
              style={{ minWidth: 18, height: 18, padding: "0 5px" }}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); toggleNotify(); }}
            className={`text-white/90 hover:text-white text-sm px-2 py-1 rounded ${notifyEnabled && canNotifyNow() ? "bg-white/10" : "bg-white/5"}`}
            title={notifyEnabled ? "Désactiver les notifications" : "Activer les notifications"}
          >
            {notifyEnabled && canNotifyNow() ? "🔔" : "🔕"}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleMin(); }} 
            className="text-white/90 hover:text-white text-sm px-2 py-1 rounded hover:bg-white/10"
            title={min ? "Agrandir" : "Réduire"}
          >
            {min ? "▢" : "−"}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleHidden(); }} 
            className="text-white/90 hover:text-white text-sm px-2 py-1 rounded hover:bg-white/10"
            title="Fermer le chat"
          >
            ✕
          </button>
        </div>
      </div>

      {!min && (
        <div className="bg-white border-x border-b rounded-b-md relative" style={{ height: size.h - headerH }}>
          <ChatPanel
            roomId={roomId}
            userId={userId}
            user={userName}
            role={role}
            height={scrollerHeight}
            onContextUpdate={handleContextUpdate}
            initialDmTarget={initialDmTarget}
          />
          {/* Poignée de redimensionnement */}
          <div
            onMouseDown={onResizeDown}
            title="Redimensionner"
            style={{
              position: "absolute",
              right: 6,
              bottom: 6,
              width: 16,
              height: 16,
              cursor: "nwse-resize",
              opacity: 0.8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M3 13h10M6 10h7M9 7h4" stroke="#9ca3af" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}