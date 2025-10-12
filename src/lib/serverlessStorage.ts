import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Serverless-safe storage helper: use /tmp when read-only FS (Vercel)
// Falls back to in-memory if writing still fails.

const MEMORY: Record<string, any> = {};

export function resolveBase() {
  // Prefer /tmp in production (serverless RW area)
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return '/tmp/app-data';
  }
  return join(process.cwd(), 'data-runtime');
}

export function readJSON<T = any>(relPath: string, defaultValue: T): T {
  const base = resolveBase();
  const full = join(base, relPath);
  try {
    if (!existsSync(full)) return defaultValue;
    const raw = readFileSync(full, 'utf8');
    return JSON.parse(raw);
  } catch {
    return MEMORY[relPath] ?? defaultValue;
  }
}

export function writeJSON<T = any>(relPath: string, data: T) {
  const base = resolveBase();
  const full = join(base, relPath);
  try {
    const dir = full.substring(0, full.lastIndexOf('/'));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(full, JSON.stringify(data, null, 2), 'utf8');
    MEMORY[relPath] = data;
  } catch (e) {
    MEMORY[relPath] = data; // fallback only in-memory
  }
}

export function appendJSONArray<T = any>(relPath: string, item: T, max?: number) {
  const arr = readJSON<T[]>(relPath, []);
  arr.push(item);
  if (max && arr.length > max) arr.splice(0, arr.length - max);
  writeJSON(relPath, arr);
  return arr;
}

export function runtimeStorageInfo() {
  return {
    base: resolveBase(),
    inMemoryKeys: Object.keys(MEMORY),
    count: Object.keys(MEMORY).length,
  };
}

export function resetAllMemory() {
  for (const k of Object.keys(MEMORY)) delete MEMORY[k];
}

