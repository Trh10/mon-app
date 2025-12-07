"use client";
/** Client temps réel compatible:
 *  - API moderne : on(event, handler), emit(event, data), connect(room,id,name,role), off(event, handler)
 *  - Legacy      : subscribe(room,event,handler), publish(room,event,data), trigger(room,event,data), setUser(user), setRoom(room)
 *  - Utilitaires : getStableUserId()
 *  - Exports     : default rtClient + getRealtimeClient + getStableUserId
 */

type Handler = (data: any) => void;
type Identity = { id: string; name: string; role: string };

function randId(prefix: string) {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export function getStableUserId(key = "app_uid") {
  if (typeof window === "undefined") return randId("u-");
  try {
    const k = `realtime:${key}`;
    const existing = window.localStorage.getItem(k);
    if (existing) return existing;
    const fresh = randId("u-");
    window.localStorage.setItem(k, fresh);
    return fresh;
  } catch {
    return randId("u-");
  }
}

class RealtimeClient {
  private es: EventSource | null = null;
  private subs: Map<string, Set<Handler>> = new Map();
  private _room = "default";
  private ident: Identity = { id: getStableUserId(), name: "Anonyme", role: "employe" };
  private cursorTimeout: any = null;

  // ---------- API moderne ----------
  connect(room: string, id: string, name: string, role: string) {
    this.ident = { id, name, role };
    this._connect(room);
  }

  on(type: string, handler: Handler): () => void {
    let set = this.subs.get(type);
    if (!set) { set = new Set(); this.subs.set(type, set); }
    set.add(handler);
    return () => { set!.delete(handler); };
  }

  off(type: string, handler: Handler) {
    this.subs.get(type)?.delete(handler);
  }

  async emit(event: string, data: any) {
    await fetch("/api/realtime/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Server expects { event, payload, user, room }
      body: JSON.stringify({ room: this._room, event, payload: data, user: this.ident }),
    });
  }

  // Convenience to send a public chat message in current room
  async sendChat(room: string, text: string) {
    if (room && room !== this._room) this.setRoom(room);
    return this.emit("chat", { text, userId: this.ident.id, name: this.ident.name });
  }

  // Debounced cursor sender used by LiveCursors
  sendCursor(room: string, x: number, y: number) {
    // switch room if needed
    if (room && room !== this._room) this.setRoom(room);
    if (this.cursorTimeout) clearTimeout(this.cursorTimeout);
    this.cursorTimeout = setTimeout(() => {
      this.emit("cursor", { x, y }).catch(() => {});
      this.cursorTimeout = null;
    }, 100);
  }

  // ---------- Compat legacy ----------
  setUser(user: Partial<Identity>) {
    this.ident = { ...this.ident, ...(user as Identity) };
    this._connect(this._room);
  }

  setRoom(room: string) {
    if (!room || room === this._room) return;
    this._connect(room);
  }

  subscribe(room: string, event: string, handler: Handler) {
    this._ensure(room);
    return this.on(event, handler);
  }

  async publish(room: string, event: string, data: any) {
    this._ensure(room);
    return this.emit(event, data);
  }

  async trigger(room: string, event: string, data: any) {
    return this.publish(room, event, data);
  }

  // ---------- internes ----------
  private _ensure(room: string) {
    if (!this.es || this._room !== room) this._connect(room);
  }

  private _connect(room: string) {
    this._room = room || "default";
    if (this.es) { try { this.es.close(); } catch {} this.es = null; }

    const url =
      `/api/realtime/stream` +
      `?room=${encodeURIComponent(this._room)}` +
      `&id=${encodeURIComponent(this.ident.id)}` +
      `&name=${encodeURIComponent(this.ident.name)}` +
      `&role=${encodeURIComponent(this.ident.role)}`;

    const es = new EventSource(url);
    const builtin = [
      "presence:state","presence:join","presence:leave",
      "chat","status","cursor","heartbeat",
      "focus_session_start","focus_session_end",
    ];
    for (const evt of builtin) {
      es.addEventListener(evt, (e: MessageEvent) => {
        try { this.dispatch(evt, JSON.parse(e.data || "{}")); } catch {}
      });
    }
    es.onerror = () => { /* auto-retry */ };
    this.es = es;
  }

  dispatch(type: string, data: any) {
    this.subs.get(type)?.forEach((h) => { try { h(data); } catch {} });
  }

  disconnect() {
    if (this.es) { try { this.es.close(); } catch {} this.es = null; }
  }

  get room() { return this._room; }
  get user() { return this.ident; }
}

const g = globalThis as any;
export const rtClient: RealtimeClient =
  g.__APP_RT_CLIENT || (g.__APP_RT_CLIENT = new RealtimeClient());

export default rtClient;
export function getRealtimeClient() { return rtClient; }
