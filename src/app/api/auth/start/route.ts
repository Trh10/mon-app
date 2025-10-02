import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgNameOrSlug } = body;

    if (!orgNameOrSlug) {
      return NextResponse.json(
        { success: false, error: "orgNameOrSlug requis" },
        { status: 400 }
      );
    }

    // Chercher l'organisation par nom ou slug
    const normalized = String(orgNameOrSlug).trim();

    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { name: normalized },
          { slug: normalized },
        ],
      },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: "Organisation non trouvée" },
        { status: 404 }
      );
    }

    // Stocker l'org en session
    const res = NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    });

    await setSession(req, res, {
      organizationId: organization.id,
      organizationSlug: organization.slug,
    });

    return res;
  } catch (error) {
    console.error("Erreur /api/auth/start:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}