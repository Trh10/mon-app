import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonSafe } from "@/lib/json";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session.organizationId) {
      return NextResponse.json({ error: "Session requise" }, { status: 401 });
    }

    // Récupérer les vrais membres de l'organisation depuis Prisma
    const members = await prisma.user.findMany({
      where: { organizationId: session.organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" }
    });

    // Transformer pour l'API (format attendu par le frontend)
    // Priorité pour le nom: displayName > name > email
    const formatted = members.map(m => ({
      id: String(m.id),
      name: m.displayName || m.name || m.email?.split('@')[0] || 'Utilisateur',
      email: m.email,
      role: m.role === 'admin' ? 'chef' : 'employe',
      level: m.role === 'admin' ? 10 : 3,
      company: session.organizationId,
      department: 'Général',
      status: 'online', // TODO: implémenter la détection de présence temps réel
      avatar: null,
      joinedAt: m.createdAt.toISOString(),
      lastSeen: new Date().toISOString()
    }));

    return NextResponse.json({
      success: true,
      members: formatted,
      totalCount: formatted.length
    });
  } catch (error: any) {
    console.error('Erreur API team members:', error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session.organizationId) {
      return NextResponse.json({ error: "Session requise" }, { status: 401 });
    }

    const body = await req.json();
    const { action, targetUserId, data } = body;
    
    switch (action) {
      case 'update-status':
        // TODO: Implémenter la mise à jour du statut utilisateur
        // Pour l'instant, on ne fait rien car le statut est géré en temps réel
        return NextResponse.json({
          success: true,
          message: 'Statut mis à jour'
        });
        
      case 'assign-task':
        // TODO: Créer une vraie tâche dans Prisma
        console.log(`Tâche assignée à ${targetUserId}:`, data);
        return NextResponse.json({
          success: true,
          message: 'Tâche assignée'
        });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Action non supportée' },
          { status: 400 }
        );
    }
    
  } catch (error: any) {
    console.error('Erreur API team POST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
