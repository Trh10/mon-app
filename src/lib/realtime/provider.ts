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
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isOnline = true;

  setUser(user: Partial<User>) {
    const id = user.id || this.user.id || getStableUserId();
    this.user = { ...this.user, ...user, id };
  }

  private ensure(room: string) {
    let conn = this.rooms.get(room);
    if (conn) return conn;
    
    return this.createConnection(room);
  }

  private createConnection(room: string, isReconnect = false) {
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
    
    // Gestion des erreurs et reconnexion
    es.onerror = (event) => {
      console.warn(`SSE Error for room ${room}:`, event);
      this.isOnline = false;
      
      const attempts = this.reconnectAttempts.get(room) || 0;
      
      if (attempts < this.maxReconnectAttempts) {
        this.reconnectAttempts.set(room, attempts + 1);
        const delay = this.reconnectDelay * Math.pow(2, attempts); // Exponential backoff
        
        // Notifier de la tentative de reconnexion
        handlers.get("reconnecting")?.forEach((h) => h({ 
          room, 
          attempt: attempts + 1, 
          maxAttempts: this.maxReconnectAttempts,
          delay
        }));
        
        setTimeout(() => {
          console.log(`Attempting reconnection ${attempts + 1}/${this.maxReconnectAttempts} for room ${room}`);
          this.rooms.delete(room);
          es.close();
          
          // Recréer la connexion avec les mêmes handlers
          const newConn = this.createConnection(room, true);
          // Transférer les handlers existants
          handlers.forEach((handlerSet, eventType) => {
            newConn.handlers.set(eventType, new Set(handlerSet));
          });
          newConn.refCount = connObj.refCount;
          this.rooms.set(room, newConn);
        }, delay);
      } else {
        console.error(`Max reconnection attempts reached for room ${room}`);
        // Notifier les handlers d'erreur
        handlers.get("error")?.forEach((h) => h({ 
          type: "max_reconnect_attempts", 
          room, 
          attempts 
        }));
      }
    };

    es.onopen = () => {
      console.log(`SSE Connected to room ${room}${isReconnect ? ' (reconnected)' : ''}`);
      this.isOnline = true;
      this.reconnectAttempts.set(room, 0); // Reset attempts on successful connection
      handlers.get("connected")?.forEach((h) => h({ room, reconnected: isReconnect }));
    };

    // IMPORTANT: on déclare ici tous les types d'événements qu'on veut écouter
    ["presence", "chat", "cursor", "file", "dm", "task", "ready", "ping", "error", "connected", "reconnecting"].forEach((evt) =>
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
        this.reconnectAttempts.delete(room);
      }
    };
  }

  async trigger(room: string, event: string, payload: any, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch("/api/realtime/emit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room, event, payload, user: this.user }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.warn(`Trigger attempt ${attempt + 1}/${retries} failed:`, error);
        
        if (attempt === retries - 1) {
          throw error; // Dernière tentative échouée
        }
        
        // Attendre avant la prochaine tentative
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  async sendChat(room: string, text: string) {
    const msg = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text };
    await this.trigger(room, "chat", msg);
  }

  async sendCursor(room: string, xNorm: number, yNorm: number) {
    // Debouncing pour éviter trop d'événements curseur
    if (!this._cursorDebounce) {
      this._cursorDebounce = new Map();
    }
    
    const key = room;
    clearTimeout(this._cursorDebounce.get(key));
    
    this._cursorDebounce.set(key, setTimeout(async () => {
      try {
        await this.trigger(room, "cursor", { x: xNorm, y: yNorm });
      } catch (error) {
        console.warn("Failed to send cursor position:", error);
      }
    }, 50)); // Debounce de 50ms
  }

  private _cursorDebounce?: Map<string, NodeJS.Timeout>;

  // Getters pour l'état de la connexion
  get connectionStatus() {
    return {
      isOnline: this.isOnline,
      activeRooms: Array.from(this.rooms.keys()),
      reconnectAttempts: Object.fromEntries(this.reconnectAttempts)
    };
  }

  // Méthode pour forcer la reconnexion
  forceReconnect(room?: string) {
    if (room) {
      const conn = this.rooms.get(room);
      if (conn) {
        conn.es.close();
        this.rooms.delete(room);
        this.reconnectAttempts.delete(room);
      }
    } else {
      // Reconnecter toutes les rooms
      this.rooms.forEach((conn, roomKey) => {
        conn.es.close();
        this.rooms.delete(roomKey);
        this.reconnectAttempts.delete(roomKey);
      });
    }
  }
}

const g = globalThis as any;
if (!g.__RT_CLIENT) g.__RT_CLIENT = new RealtimeClient();
export function getRealtimeClient() {
  return g.__RT_CLIENT as RealtimeClient;
}

// Hook pour la détection de la connexion réseau
if (typeof window !== "undefined") {
  const client = getRealtimeClient();
  
  window.addEventListener("online", () => {
    console.log("Network back online, forcing reconnection...");
    client.forceReconnect();
  });
  
  window.addEventListener("offline", () => {
    console.log("Network offline detected");
  });
}
