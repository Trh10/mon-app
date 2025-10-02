import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, setSession } from "@/lib/session";
import { verifyPin } from "@/lib/hash";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, pin } = body;

    if (!name || !pin) {
      return NextResponse.json(
        { success: false, error: "Nom et PIN requis" },
        { status: 400 }
      );
    }

    // Récupérer l'org depuis la session
    const session = await getSession(req);
    if (!session.organizationId) {
      return NextResponse.json(
        { success: false, error: "Aucune organisation sélectionnée. Appelez /api/auth/start d'abord." },
        { status: 400 }
      );
    }

    // Chercher l'utilisateur dans l'organisation
    const normalizedName = String(name).trim();

    const user = await prisma.user.findFirst({
      where: {
        organizationId: session.organizationId,
        name: normalizedName,
        pinHash: { not: null },
      },
    });

    if (!user || !user.pinHash) {
      return NextResponse.json(
        { success: false, error: "Utilisateur non trouvé ou PIN non configuré" },
        { status: 401 }
      );
    }

    // Vérifier le PIN
    if (!verifyPin(pin, user.pinHash)) {
      return NextResponse.json(
        { success: false, error: "PIN incorrect" },
        { status: 401 }
      );
    }

    // Connexion réussie - compléter la session
    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
    });

    await setSession(req, res, {
      userId: user.id,
      userRole: user.role,
      userName: user.name ?? undefined,
    });

    return res;
  } catch (error) {
    console.error("Erreur /api/auth/login:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}