import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonSafe } from "@/lib/json";
import { getSession } from "@/lib/session";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/*
  Directory API (Prisma-backed)
  - Reads session to know current organization
  - Returns only members of that organization
  - Sorting rule: admin (DG) > user (Finance, etc.) > alphabetical by name
*/

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session.organizationId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer tous les utilisateurs de l'organisation
    const users = await prisma.user.findMany({
      where: { organizationId: session.organizationId },
      orderBy: [
        { role: 'desc' }, // admin avant user
        { name: 'asc' }   // puis alphabétique
      ]
    });

    // Formater pour le frontend
    const items = users.map(u => ({
      id: String(u.id),
      name: u.name || u.email,
      role: u.role,
      displayRole: u.role === 'admin' ? 'Directeur Général' : 'Employé',
      level: u.role === 'admin' ? 10 : 3,
      isOnline: false, // TODO: implémenter la détection de présence temps réel
      lastSeen: u.updatedAt.toISOString(),
      activeTasks: 0,   // TODO: compter les tâches actives
      completedTasks: 0, // TODO: compter les tâches terminées
      companyId: String(u.organizationId),
      joinedAt: u.createdAt.toISOString(),
      email: u.email,
      title: u.role === 'admin' ? 'Administrateur' : 'Employé'
    }));

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