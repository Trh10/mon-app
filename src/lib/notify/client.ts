// Client-side only helpers for Web Notifications + preference persistence

const NOTIFY_KEY = "__chat_notify_enabled";
let prompted = false;

export function isSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotifyEnabled(): boolean {
  if (!isSupported()) return false;
  try {
    const raw = localStorage.getItem(NOTIFY_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
    // Si jamais pas de préférence stockée: on active seulement si déjà autorisé
    return Notification.permission === "granted";
  } catch {
    return Notification.permission === "granted";
  }
}

export function setNotifyEnabled(v: boolean) {
  if (!isSupported()) return;
  try {
    localStorage.setItem(NOTIFY_KEY, v ? "1" : "0");
  } catch {}
}

export async function ensurePermission(): Promise<NotificationPermission> {
  if (!isSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  if (!prompted) {
    prompted = true;
    try {
      const res = await Notification.requestPermission();
      return res;
    } catch {
      return Notification.permission;
    }
  }
  return Notification.permission;
}

export function canNotifyNow(): boolean {
  return isSupported() && Notification.permission === "granted" && getNotifyEnabled();
}

export function openDm(targetId: string, targetName?: string) {
  try {
    const bc = new BroadcastChannel("chat-control");
    bc.postMessage({ type: "open-dm", targetId, targetName });
    bc.close();
  } catch {}
  try { window.focus(); } catch {}
}

export function showNotification(opts: {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  requireInteraction?: boolean;
  targetId?: string;
  targetName?: string;
}) {
  if (!canNotifyNow()) return false;
  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      tag: opts.tag,
      icon: opts.icon,
      requireInteraction: opts.requireInteraction ?? false,
    });
    n.onclick = () => {
      try { n.close(); } catch {}
      if (opts.targetId) openDm(opts.targetId, opts.targetName);
    };
    // Petit son discret (optionnel)
    try {
      const audio = new Audio(
        "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA..."
      );
      audio.volume = 0.2;
      audio.play().catch(() => {});
    } catch {}
    return true;
  } catch {
    return false;
  }
}