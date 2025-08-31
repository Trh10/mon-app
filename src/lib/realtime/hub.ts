import type { Role } from "../auth/roles";

export type RTUser = { id: string; name: string; role: Role };
type SendFn = (event: string, data: any) => void;

type Client = {
  id: string;
  room: string;
  user: RTUser;
  send: SendFn;
};

class Hub {
  private rooms: Map<string, Map<string, Client>> = new Map();

  addClient(room: string, user: RTUser, send: SendFn) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const c: Client = { id, room, user, send };
    if (!this.rooms.has(room)) this.rooms.set(room, new Map());
    this.rooms.get(room)!.set(id, c);
    this.broadcast(room, "presence", { type: "join", user, members: this.members(room) });
    return id;
  }

  removeClient(room: string, id: string) {
    const group = this.rooms.get(room);
    if (!group) return;
    const user = group.get(id)?.user;
    group.delete(id);
    if (user) this.broadcast(room, "presence", { type: "leave", user, members: this.members(room) });
    if (group.size === 0) this.rooms.delete(room);
  }

  broadcast(room: string, event: string, data: any) {
    const group = this.rooms.get(room);
    if (!group) return;
    for (const c of group.values()) {
      try {
        c.send(event, { ...data });
      } catch {}
    }
  }

  members(room: string) {
    const group = this.rooms.get(room);
    if (!group) return [];
    return Array.from(group.values()).map((c) => c.user);
  }
}

const g = globalThis as any;
if (!g.__RT_HUB) g.__RT_HUB = new Hub();
export const hub: Hub = g.__RT_HUB;