import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/update-roles
 * Met à jour les rôles des utilisateurs spécifiques
 */
export async function POST(req: NextRequest) {
  try {
    const updates = [
      { name: 'simplice', newRole: 'DAF' },
      { name: 'florence', newRole: 'Juridique et RH' }
    ];

    const results = [];

    for (const update of updates) {
      // Chercher l'utilisateur par nom (insensible à la casse)
      const user = await prisma.user.findFirst({
        where: {
          name: {
            contains: update.name,
            mode: 'insensitive'
          }
        }
      });

      if (user) {
        // Mettre à jour le rôle
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { role: update.newRole }
        });
        
        results.push({
          success: true,
          name: user.name,
          oldRole: user.role,
          newRole: update.newRole
        });
      } else {
        results.push({
          success: false,
          name: update.name,
          error: 'Utilisateur non trouvé'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Mise à jour des rôles terminée',
      results
    });

  } catch (error: any) {
    console.error('[Update Roles] Erreur:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET /api/admin/update-roles
 * Affiche les utilisateurs et leurs rôles actuels
 */
export async function GET(req: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        company: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      users
    });

  } catch (error: any) {
    console.error('[Update Roles] Erreur:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
