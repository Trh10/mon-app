import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyPin } from '@/lib/hash';

const prisma = new PrismaClient();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/login-db
 * Authentification avec base de données PostgreSQL (Neon)
 */
export async function POST(request: NextRequest) {
  try {
    const { companyName, userName, pin } = await request.json();

    // Validation des entrées
    if (!companyName || !userName || !pin) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    // 1. Chercher l'organisation par nom
    const organization = await prisma.organization.findFirst({
      where: {
        name: {
          equals: companyName.trim(),
          mode: 'insensitive' // Case-insensitive
        }
      }
    });

    if (!organization) {
      return NextResponse.json(
        { 
          error: 'Organisation introuvable',
          message: `L'entreprise "${companyName}" n'existe pas. Vérifiez l'orthographe ou créez-la d'abord.`
        },
        { status: 404 }
      );
    }

    // 2. Chercher l'utilisateur dans cette organisation
    const user = await prisma.user.findFirst({
      where: {
        organizationId: organization.id,
        name: {
          equals: userName.trim(),
          mode: 'insensitive'
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { 
          error: 'Utilisateur introuvable',
          message: `L'utilisateur "${userName}" n'existe pas dans "${companyName}".`
        },
        { status: 404 }
      );
    }

    // 3. Vérifier le PIN
    if (!user.pinHash) {
      return NextResponse.json(
        { error: 'Utilisateur sans PIN configuré. Contactez l\'administrateur.' },
        { status: 500 }
      );
    }

    const isPinValid = await verifyPin(pin, user.pinHash);
    if (!isPinValid) {
      return NextResponse.json(
        { error: 'PIN incorrect' },
        { status: 401 }
      );
    }

    // 4. Mettre à jour la dernière connexion
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLoginAt: new Date(),
        isOnline: true
      }
    });

    // 5. Créer un log d'activité
    try {
      await prisma.activityLog.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          action: 'login',
          subjectType: 'User',
          subjectId: user.id.toString(),
          detail: `Connexion réussie depuis l'API`
        }
      });
    } catch (logError) {
      // Log non-bloquant
      console.error('Erreur log activité:', logError);
    }

    // 6. Retourner les données de session
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        level: user.level,
        departmentId: user.departmentId,
        department: user.department
      },
      organization: {
        id: organization.id,
        name: organization.name,
        settings: organization.settings
      },
      message: 'Connexion réussie !'
    });

  } catch (error: any) {
    console.error('[auth/login-db] Erreur:', error);
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
