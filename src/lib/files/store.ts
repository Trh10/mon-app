import path from "node:path";
import fs from "node:fs";

export type SharedFile = {
  id: string;
  name: string;
  size: number;
  mime: string;
  // chemin disque local
  filepath: string;
  // url de téléchargement
  url: string;

  scope: "room" | "direct";
  room?: string;          // si scope=room
  toUserId?: string;      // si scope=direct

  from: { id: string; name: string };
  message?: string;
  createdAt: number;
};

const g = globalThis as any;
if (!g.__FILES_STORE__) g.__FILES_STORE__ = new Map<string, SharedFile>();
const store: Map<string, SharedFile> = g.__FILES_STORE__;

// dossier d’upload local
export function uploadsDir() {
  const dir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function addSharedFile(file: SharedFile) {
  store.set(file.id, file);
  return file;
}

export function getSharedFile(id: string) {
  return store.get(id) || null;
}

export function listFilesByRoom(room: string) {
  return [...store.values()]
    .filter((f) => f.scope === "room" && f.room === room)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function listFilesForUser(userId: string) {
  return [...store.values()]
    .filter((f) => f.scope === "direct" && (f.toUserId === userId || f.from.id === userId))
    .sort((a, b) => b.createdAt - a.createdAt);
}