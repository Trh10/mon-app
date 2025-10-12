// In-memory shared auth store (temporary; replace with database later)
// Provides companies and users arrays plus helper functions.

import { hashPin, verifyPin } from '@/lib/hash';

export interface CompanyRecord {
  id: string;
  name: string;
  normalized: string;
  code: string; // short company code (4 chars)
  founderCode: string; // always '1234' for creation validation (could be rotated later)
  employeeCode: string; // default employee code or pattern
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface UserRecord {
  id: string;
  companyId: string;
  companyCode: string;
  name: string; // display name (unique within company)
  normalizedName: string;
  role: string; // textual role (DG, Administration, etc.)
  level: number; // numeric level (10 DG, 8 Admin/Finance, 5 Assistant, 3 Employé, custom ~3)
  pinHash: string; // hashed PIN with salt
  permissions: string[];
  createdAt: string;
  createdBy: string;
  lastLoginAt?: string;
  isOnline?: boolean;
}

// In-memory arrays with lightweight JSON file persistence (dev only)
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
const DATA_DIR = path.join(process.cwd(), '.data');
const COMP_FILE = path.join(DATA_DIR, 'companies.json');
const USER_FILE = path.join(DATA_DIR, 'users.json');

function safeLoad<T>(file: string): T[] {
  try {
    if (existsSync(file)) {
      const raw = readFileSync(file, 'utf8');
      return JSON.parse(raw) as T[];
    }
  } catch (e) {
    console.error('[auth-store] load error', file, e);
  }
  return [];
}

const companies: CompanyRecord[] = safeLoad<CompanyRecord>(COMP_FILE);
const users: UserRecord[] = safeLoad<UserRecord>(USER_FILE);

function persist() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR);
    writeFileSync(COMP_FILE, JSON.stringify(companies, null, 2));
    writeFileSync(USER_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('[auth-store] persist error', e);
  }
}

function id(prefix: string) { return prefix + '_' + Math.random().toString(36).slice(2, 10); }

export function normalizeCompanyName(name: string) { return name.trim().toLowerCase(); }
export function normalizeUserName(name: string) { return name.trim().toLowerCase(); }

export function getCompanies() { return companies; }
export function getUsers() { return users; }

export function findCompanyByNormalized(normalized: string) {
  return companies.find(c => c.normalized === normalized && c.isActive);
}

export function findCompanyByName(input: string) {
  return findCompanyByNormalized(normalizeCompanyName(input));
}

export function generateCompanyCode(companyName: string) {
  const cleaned = companyName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0,4) || 'COMP';
  return cleaned.padEnd(4, 'X');
}

export function createCompany(name: string, founderName: string) {
  const existing = findCompanyByName(name);
  if (existing) throw new Error('Entreprise déjà existante');
  const code = generateCompanyCode(name);
  const company: CompanyRecord = {
    id: id('c'),
    name: name.trim(),
    normalized: normalizeCompanyName(name),
    code,
    founderCode: '1234',
    employeeCode: '0000',
    createdAt: new Date().toISOString(),
    createdBy: founderName.trim(),
    isActive: true
  };
  companies.push(company);
  persist();
  return company;
}

export function getRoleLevel(role: string): number {
  const r = role.toLowerCase();
  if (r.includes('directeur') || r.includes('dg')) return 10;
  if (r.includes('administr')) return 8;
  if (r.includes('financ')) return 8;
  if (r.includes('assist')) return 5;
  if (r.includes('employ')) return 3;
  return 3; // custom or other
}

export function permissionsForLevel(level: number): string[] {
  if (level >= 10) return ['all','assign_tasks','manage_users','private_tasks'];
  // Niveau 8 (Administration / Finance) peut aussi assigner des tâches
  if (level >= 8) return ['assign_tasks','view_all'];
  if (level >= 5) return ['create_needs','view_own'];
  return ['basic'];
}

export function findUserByName(companyId: string, name: string) {
  const norm = normalizeUserName(name);
  return users.find(u => u.companyId === companyId && u.normalizedName === norm);
}

export function createUser(company: CompanyRecord, name: string, role: string, pin: string, creator: string) {
  if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN invalide (4-6 chiffres)');
  if (findUserByName(company.id, name)) throw new Error('Nom déjà utilisé');
  const level = getRoleLevel(role);
  const user: UserRecord = {
    id: id('u'),
    companyId: company.id,
    companyCode: company.code,
    name: name.trim(),
    normalizedName: normalizeUserName(name),
    role,
    level,
    pinHash: hashPin(pin),
    permissions: permissionsForLevel(level),
    createdAt: new Date().toISOString(),
    createdBy: creator,
    isOnline: true
  };
  users.push(user);
  persist();
  return user;
}

export function validateLogin(company: CompanyRecord, name: string, pin: string) {
  const user = findUserByName(company.id, name);
  if (!user) throw new Error('Utilisateur introuvable');
  if (!verifyPin(pin, user.pinHash)) throw new Error('PIN incorrect');
  user.lastLoginAt = new Date().toISOString();
  user.isOnline = true;
  persist();
  return user;
}

export function publicUser(u: UserRecord) {
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    level: u.level,
    companyId: u.companyId,
    companyCode: u.companyCode,
    permissions: u.permissions,
    createdAt: u.createdAt
  };
}

// Seed helper (optional) to inspect state during dev
export function _debugState() {
  return { companies, users };
}
