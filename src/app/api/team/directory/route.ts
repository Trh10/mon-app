import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonSafe } from "@/lib/json";
import { getSession } from "@/lib/session";
import { ensureOrgAndUserFromCookie } from "@/lib/auth/sessionBridge";
import { getUsers, getCompanies } from "@/lib/auth/store";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/*
  Directory API (Prisma-backed with JSON store fallback)
  - Reads session to know current organization
  - Returns only members of that organization
  - Falls back to JSON store if Prisma has no users
*/

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    
    // Essayer de récupérer l'organizationId depuis la session ou les cookies
    let organizationId = session.organizationId;
    let companyCode: string | null = null;
    let companyId: string | null = null;
    
    // Récupérer le companyCode/companyId depuis le cookie user-session
    try {
      const userSessionCookie = req.cookies.get('user-session')?.value;
      if (userSessionCookie) {
        const userData = JSON.parse(userSessionCookie);
        companyCode = userData.companyCode || null;
        companyId = userData.companyId || null;
      }
    } catch {}
    
    // Si pas de session, essayer depuis les cookies
    if (!organizationId) {
      const orgIdCookie = req.cookies.get('organizationId')?.value;
      if (orgIdCookie) {
        organizationId = parseInt(orgIdCookie, 10);
      }
    }
    
    // Si toujours pas d'organization, essayer via sessionBridge
    if (!organizationId) {
      const bridgeResult = await ensureOrgAndUserFromCookie(req);
      if (bridgeResult?.organizationId) {
        organizationId = bridgeResult.organizationId;
      }
    }

    // D'abord, essayer le JSON store (source principale des utilisateurs)
    const storeUsers = getUsers();
    const storeCompanies = getCompanies();
    
    // Trouver l'entreprise courante
    let currentCompany = null;
    if (companyId) {
      currentCompany = storeCompanies.find(c => c.id === companyId);
    } else if (companyCode) {
      currentCompany = storeCompanies.find(c => c.code === companyCode);
    }
    
    // Filtrer les utilisateurs de la même entreprise
    let usersFromStore: any[] = [];
    if (currentCompany) {
      usersFromStore = storeUsers.filter(u => u.companyId === currentCompany!.id);
    } else if (companyCode) {
      usersFromStore = storeUsers.filter(u => u.companyCode === companyCode);
    } else if (companyId) {
      usersFromStore = storeUsers.filter(u => u.companyId === companyId);
    }
    
    // Si on a des utilisateurs dans le store, les utiliser
    if (usersFromStore.length > 0) {
      const items = usersFromStore.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        displayRole: u.role || (u.level >= 10 ? 'Directeur Général' : 'Employé'),
        level: u.level || 3,
        isOnline: u.isOnline || false,
        lastSeen: u.lastLoginAt || u.createdAt,
        activeTasks: 0,
        completedTasks: 0,
        companyId: u.companyId,
        companyCode: u.companyCode,
        joinedAt: u.createdAt,
        email: '',
        title: u.role || 'Employé'
      }));

      // Trier: niveau décroissant, puis nom alphabétique
      items.sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return a.name.localeCompare(b.name);
      });

      return NextResponse.json({
        items,
        total: items.length,
        online: items.filter(m => m.isOnline).length
      });
    }

    // Fallback: utiliser Prisma
    if (!organizationId) {
      const firstOrg = await prisma.organization.findFirst();
      if (firstOrg) {
        organizationId = firstOrg.id;
      }
    }
    
    if (!organizationId) {
      return NextResponse.json({ items: [], total: 0 }, { status: 200 });
    }

    // Récupérer tous les utilisateurs de l'organisation depuis Prisma
    const users = await prisma.user.findMany({
      where: { organizationId: organizationId },
      orderBy: [
        { role: 'desc' },
        { name: 'asc' }
      ]
    });

    // Configuration des rôles pour obtenir le niveau
    const ROLE_LEVELS: Record<string, number> = {
      'Directeur Général': 100,
      'Administration': 80,
      'Finance': 70,
      'Comptable': 70,
      'Assistant': 40,
      'Assistante': 40,
      'Employé': 10,
      'admin': 100,  // Fallback pour anciens rôles
      'manager': 50,
      'member': 10
    };

    // Fonction pour obtenir le nom d'affichage correct
    const getDisplayName = (user: any) => {
      if (user.displayName) return user.displayName;
      if (user.name) return user.name;
      if (user.email) return user.email.split('@')[0];
      return 'Utilisateur';
    };

    // Fonction pour obtenir le rôle d'affichage
    const getDisplayRole = (role: string) => {
      // Si c'est déjà un rôle d'affichage, le retourner tel quel
      if (ROLE_LEVELS[role] !== undefined && !['admin', 'manager', 'member'].includes(role)) {
        return role;
      }
      // Sinon convertir les anciens rôles
      if (role === 'admin') return 'Directeur Général';
      if (role === 'manager') return 'Manager';
      return 'Employé';
    };

    // Considérer un utilisateur "en ligne" s'il s'est connecté dans les 10 dernières minutes
    const TEN_MINUTES = 10 * 60 * 1000;
    const now = Date.now();

    // Formater pour le frontend
    const items = users.map(u => {
      const lastActivity = u.updatedAt ? new Date(u.updatedAt).getTime() : 0;
      const isOnline = (now - lastActivity) < TEN_MINUTES;
      const displayRole = getDisplayRole(u.role);
      
      return {
        id: String(u.id),
        name: getDisplayName(u),
        role: u.role,
        displayRole: displayRole,
        level: ROLE_LEVELS[u.role] || ROLE_LEVELS[displayRole] || 10,
        isOnline: isOnline,
        lastSeen: u.updatedAt.toISOString(),
        activeTasks: 0,
        completedTasks: 0,
        companyId: String(u.organizationId),
        joinedAt: u.createdAt.toISOString(),
        email: u.email,
        title: displayRole
      };
    });

    return NextResponse.json({
      items,
      total: items.length,
      online: items.filter(m => m.isOnline).length
    });
  } catch (error: any) {
    console.error('Erreur directory API:', error);
    return NextResponse.json({ items: [], error: error.message || 'Erreur interne du serveur' }, { status: 500 });
  }
}