import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { getUsers, getCompanies } from '@/lib/auth/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/*
  Directory API (store-backed)
  - Reads user-session cookie to know current company
  - Returns only members of that company
  - Sorting rule: DG > Administration > Finance > others (alphabetical by name inside same group)
  - Provides minimal fields expected by TeamPanel (name, role, title, email, isOnline, lastSeen)
*/

const ROLE_PRIORITY: Record<string, number> = {
  'dg': 1,
  'administration': 2,
  'admin': 2,
  'finance': 3,
};

function rolePriority(role: string) {
  const r = role.toLowerCase();
  if (ROLE_PRIORITY[r] !== undefined) return ROLE_PRIORITY[r];
  // map partial matches
  if (r.includes('directeur') || r === 'dg') return 1;
  if (r.startsWith('admin')) return 2;
  if (r.includes('financ')) return 3;
  return 4; // others
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get('user-session')?.value;
    if (!raw) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    let session: any = null;
    try { session = JSON.parse(raw); } catch {}
    if (!session?.companyId) return NextResponse.json({ error: 'Session invalide' }, { status: 400 });

    const all = getUsers().filter(u => u.companyId === session.companyId);

    const items = all.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      displayRole: u.role,
      level: u.level,
      isOnline: !!u.isOnline,
      lastSeen: u.lastLoginAt || u.createdAt,
      activeTasks: 0,
      completedTasks: 0,
      companyId: u.companyId,
      joinedAt: u.createdAt,
      // Placeholder derived email (no persistence yet)
  email: '', // email réel ajouté plus tard quand l'utilisateur connecte son compte
      title: u.role,
    })).sort((a,b) => {
      const pa = rolePriority(a.role);
      const pb = rolePriority(b.role);
      if (pa !== pb) return pa - pb;
      // Within same priority, put online first
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    });

    return NextResponse.json({
      items,
      total: items.length,
      online: items.filter(m => m.isOnline).length
    });
  } catch (error) {
    console.error('Erreur directory API:', error);
    return NextResponse.json({ items: [], error: 'Erreur interne du serveur' }, { status: 500 });
  }
}