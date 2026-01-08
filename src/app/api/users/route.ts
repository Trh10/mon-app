import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ensureOrgAndUserFromCookie } from "@/lib/auth/sessionBridge";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    
    // Essayer de récupérer l'organizationId
    let organizationId = session.organizationId;
    
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
    
    // Dernier recours: prendre la première organisation par défaut
    if (!organizationId) {
      const firstOrg = await prisma.organization.findFirst();
      if (firstOrg) {
        organizationId = firstOrg.id;
      }
    }
    
    if (!organizationId) {
      return NextResponse.json([], { status: 200 });
    }

    const users = await prisma.user.findMany({
      where: {
        organizationId: organizationId,
      },
      select: {
        id: true,
        externalId: true,
        name: true,
        displayName: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Format users for the chat - utiliser externalId si disponible (pour cohérence avec le store JSON)
    const formattedUsers = users.map(u => ({
      id: u.externalId || String(u.id),  // Préférer externalId pour cohérence avec le chat temps réel
      prismaId: String(u.id),
      name: u.displayName || u.name || u.email?.split("@")[0] || "Utilisateur",
      email: u.email,
      role: u.role || "employe",
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json([], { status: 200 });
  }
}
