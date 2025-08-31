"use client";

import type { Role } from "../auth/roles";

type User = { id: string; name: string; role: Role };
type Handler = (data: any) => void;

type RoomConn = {
  es: EventSource;
  handlers: Map<string, Set<Handler>>;
  refCount: number;
};

const UID_KEY = "__rt_uid";
export function getStableUserId() {
  if (typeof window === "undefined") return `u-${Math.random().toString(36).slice(2, 9)}`;
  let id = localStorage.getItem(UID_KEY);
  if (!id) {
    id = `u-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(UID_KEY, id);
  }
  return id;
}

class RealtimeClient {
  private user: User = { id: getStableUserId(), name: "Anonyme", role: "employe" };
  private rooms: Map<string, RoomConn> = new Map();

  setUser(user: Partial<User>) {
    const id = user.id || this.user.id || getStableUserId();
    this.user = { ...this.user, ...user, id };
  }

  private ensure(room: string) {
    let conn = this.rooms.get(room);
    if (conn) return conn;
    const url = new URL("/api/realtime/stream", location.origin);
    url.searchParams.set("room", room);
    url.searchParams.set("id", this.user.id);
    url.searchParams.set("name", this.user.name);
    url.searchParams.set("role", this.user.role);
    const es = new EventSource(url.toString());

    const handlers = new Map<string, Set<Handler>>();
    const on = (type: string, ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data || "{}");
        handlers.get(type)?.forEach((h) => h(data));
      } catch {}
    };

    const connObj: RoomConn = { es, handlers, refCount: 0 };
    // IMPORTANT: on déclare ici tous les types d’événements qu’on veut écouter
    ["presence", "chat", "cursor", "file", "dm", "task", "ready", "ping"].forEach((evt) =>
      connObj.es.addEventListener(evt, (e) => on(evt, e as MessageEvent))
    );

    this.rooms.set(room, connObj);
    return connObj;
  }

  subscribe(room: string, event: string, handler: Handler) {
    const conn = this.ensure(room);
    if (!conn.handlers.has(event)) conn.handlers.set(event, new Set());
    conn.handlers.get(event)!.add(handler);
    conn.refCount += 1;
    return () => {
      conn.handlers.get(event)?.delete(handler);
      conn.refCount -= 1;
      if (conn.refCount <= 0) {
        conn.es.close();
        this.rooms.delete(room);
      }
    };
  }

  async trigger(room: string, event: string, payload: any) {
    await fetch("/api/realtime/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, event, payload, user: this.user }),
    });
  }

  async sendChat(room: string, text: string) {
    const msg = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text };
    await this.trigger(room, "chat", msg);
  }

  async sendCursor(room: string, xNorm: number, yNorm: number) {
    await this.trigger(room, "cursor", { x: xNorm, y: yNorm });
  }
}

const g = globalThis as any;
if (!g.__RT_CLIENT) g.__RT_CLIENT = new RealtimeClient();
export function getRealtimeClient() {
  return g.__RT_CLIENT as RealtimeClient;
}