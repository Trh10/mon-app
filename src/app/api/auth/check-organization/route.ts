import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/check-organization
 * Vérifie si une organisation existe dans la base de données
 */
export async function POST(request: NextRequest) {
  try {
    const { companyName } = await request.json();

    if (!companyName || typeof companyName !== 'string') {
      return NextResponse.json(
        { error: 'Nom d\'entreprise requis' },
        { status: 400 }
      );
    }

    // Chercher l'organisation
    const organization = await prisma.organization.findFirst({
      where: {
        name: {
          equals: companyName.trim(),
          mode: 'insensitive'
        }
      },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    if (organization) {
      return NextResponse.json({
        exists: true,
        organization: {
          id: organization.id,
          name: organization.name,
          userCount: organization._count.users
        },
        message: `Organisation "${organization.name}" trouvée avec ${organization._count.users} utilisateur(s)`
      });
    }

    // Organisation non trouvée
    return NextResponse.json({
      exists: false,
      message: `L'organisation "${companyName.trim()}" n'existe pas encore.`,
      suggestion: 'Vérifiez l\'orthographe ou créez-la.'
    });

  } catch (error: any) {
    console.error('[auth/check-organization] Erreur:', error);
    return NextResponse.json(
      { 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
