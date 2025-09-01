// Petit store mémoire pour l’historique des chats par "room".
// Room peut être une room publique (ex: "room:demo-room") ou une room de DM (ex: "dm:u-a:u-b").

export type Role = "chef" | "manager" | "assistant" | "employe";
export type RTUser = { id: string; name: string; role: Role };

export type ChatMessage = {
  id: string;
  room: string;
  user: RTUser;
  text: string;
  ts: number;
  replyTo?: string;
  reactions?: Record<string, string[]>;
  isEdited?: boolean;
};

const g = globalThis as any;
if (!g.__CHAT_STORE__) g.__CHAT_STORE__ = new Map<string, ChatMessage[]>();
const store: Map<string, ChatMessage[]> = g.__CHAT_STORE__;

export function addChatMessage(room: string, msg: ChatMessage) {
  if (!store.has(room)) store.set(room, []);
  const arr = store.get(room)!;
  arr.push(msg);
  // Conserver les 500 derniers
  if (arr.length > 500) arr.splice(0, arr.length - 500);
  return msg;
}

export function listChatMessages(room: string, limit = 200) {
  const arr = store.get(room) || [];
  return arr.slice(-limit);
}

// Room de DM stable entre deux utilisateurs (ordre trié)
export function dmRoom(a: string, b: string) {
  const [x, y] = a < b ? [a, b] : [b, a];
  return `dm:${x}:${y}`;
}