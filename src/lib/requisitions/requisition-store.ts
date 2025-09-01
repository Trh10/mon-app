// Store partagé pour les réquisitions (base de données officielle)
import { Requisition } from '@/lib/requisitions/requisition-types';

// Persistance simple sur fichier JSON côté serveur (Next API, Node FS)
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'requisitions.json');

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]), 'utf8');
  } catch (e) {
    // En cas d'échec, on retombe sur le stockage mémoire (rare)
  }
}

function readAll(): Requisition[] {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw) as Requisition[];
  } catch {
    return requisitions;
  }
}

function writeAll(data: Requisition[]) {
  try {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch {
    // ignore disk errors to avoid crashing
  }
}

// Base de données en mémoire (fallback)
export let requisitions: Requisition[] = [];

// Fonctions utilitaires pour manipuler les réquisitions
export function getRequisitions(): Requisition[] {
  const list = readAll();
  requisitions = list; // keep in-memory snapshot
  return list;
}

export function addRequisition(requisition: Requisition): void {
  const list = getRequisitions();
  list.push(requisition);
  writeAll(list);
  requisitions = list;
}

export function updateRequisition(id: string, updates: Partial<Requisition>): Requisition | null {
  const list = getRequisitions();
  const index = list.findIndex(req => req.id === id);
  if (index === -1) return null;
  list[index] = { ...list[index], ...updates };
  writeAll(list);
  requisitions = list;
  return list[index];
}

export function deleteRequisition(id: string): boolean {
  const list = getRequisitions();
  const index = list.findIndex(req => req.id === id);
  if (index === -1) return false;
  list.splice(index, 1);
  writeAll(list);
  requisitions = list;
  return true;
}

export function getRequisitionsByCompany(companyId: string): Requisition[] {
  return getRequisitions().filter(req => req.companyId === companyId);
}
