"use client";

// Type local pour éviter les imports manquants
type Role = "chef" | "manager" | "assistant" | "employe";
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
      } catch (error) {
        console.error(`Error parsing SSE data for ${type}:`, error);
      }
    };

    const connObj: RoomConn = { es, handlers, refCount: 0 };
    
    // Simple error handling without aggressive reconnection
    es.onerror = (event) => {
      console.warn(`SSE Error for room ${room}:`, event);
    };

    es.onopen = () => {
      console.log(`SSE Connected to room ${room}`);
      handlers.get("connect")?.forEach((h) => h({ room, connected: true }));
    };

    es.addEventListener("message", (ev) => on("message", ev));
    es.addEventListener("chat", (ev) => on("chat", ev));
    es.addEventListener("dm", (ev) => on("dm", ev));
    es.addEventListener("cursor", (ev) => on("cursor", ev));
    es.addEventListener("file", (ev) => on("file", ev));
    es.addEventListener("task", (ev) => on("task", ev));
    es.addEventListener("typing", (ev) => on("typing", ev));
    es.addEventListener("reaction", (ev) => on("reaction", ev));

    this.rooms.set(room, connObj);
    return connObj;
  }

  subscribe(room: string, event: string, handler: Handler) {
    const conn = this.ensure(room);
    conn.refCount++;
    
    if (!conn.handlers.has(event)) {
      conn.handlers.set(event, new Set());
    }
    conn.handlers.get(event)!.add(handler);

    return () => {
      conn.handlers.get(event)?.delete(handler);
      conn.refCount--;
      if (conn.refCount <= 0) {
        conn.es.close();
        this.rooms.delete(room);
      }
    };
  }

  async trigger(room: string, event: string, data: any) {
    try {
      const payload = {
        room,
        event,
        data,
        user: this.user,
        ts: Date.now(),
      };

      const response = await fetch("/api/realtime/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to trigger event:", error);
      throw error;
    }
  }

  // Simplified cursor sending with basic debouncing
  private cursorTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  sendCursor(room: string, x: number, y: number) {
    // Clear previous timeout
    const existingTimeout = this.cursorTimeouts.get(room);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Debounce cursor updates to 100ms
    const timeout = setTimeout(() => {
      this.trigger(room, "cursor", { x, y }).catch(console.error);
      this.cursorTimeouts.delete(room);
    }, 100);

    this.cursorTimeouts.set(room, timeout);
  }

  isConnected(room: string): boolean {
    const conn = this.rooms.get(room);
    return conn?.es?.readyState === EventSource.OPEN;
  }

  close() {
    this.rooms.forEach((conn) => {
      conn.es.close();
    });
    this.rooms.clear();
    this.cursorTimeouts.forEach(timeout => clearTimeout(timeout));
    this.cursorTimeouts.clear();
  }
}

let client: RealtimeClient | null = null;

export function getRealtimeClient(): RealtimeClient {
  if (typeof window === "undefined") {
    throw new Error("RealtimeClient can only be used in browser environment");
  }
  
  if (!client) {
    client = new RealtimeClient();
  }
  
  return client;
}
