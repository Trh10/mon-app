export type Role = "chef" | "manager" | "assistant" | "employe";
export type RTUser = { id: string; name: string; role: Role };
type SendFn = (event: string, data: any) => void;

type Client = { id: string; room: string; user: RTUser; send: SendFn };

class Hub {
  private rooms: Map<string, Map<string, Client>> = new Map();

  addClient(room: string, clientId: string, user: RTUser, send: SendFn) {
    let group = this.rooms.get(room);
    if (!group) { group = new Map(); this.rooms.set(room, group); }
    const client: Client = { id: clientId, room, user, send };
    group.set(clientId, client);
    this.broadcast(room, "presence:join", { id: clientId, user, members: this.members(room) });
    return () => this.removeClient(room, clientId);
  }

  removeClient(room: string, clientId: string) {
    const group = this.rooms.get(room);
    if (!group) return;
    const existing = group.get(clientId);
    group.delete(clientId);
    if (existing) this.broadcast(room, "presence:leave", { id: clientId, user: existing.user, members: this.members(room) });
    if (group.size === 0) this.rooms.delete(room);
  }

  broadcast(room: string, event: string, data: any) {
    const group = this.rooms.get(room);
    if (!group) return;
    for (const c of group.values()) {
      try { c.send(event, data); } catch {}
    }
  }

  members(room: string): RTUser[] {
    const group = this.rooms.get(room);
    if (!group) return [];
    return Array.from(group.values()).map((c) => c.user);
  }
}

const g = globalThis as any;
export const hub: Hub = g.__APP_RT_HUB || (g.__APP_RT_HUB = new Hub());
