import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUsers, getCompanies } from "@/lib/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API pour synchroniser les utilisateurs du store JSON vers Prisma
 * Cela garantit que les vrais noms sont utilisés partout
 */
export async function POST(req: NextRequest) {
  try {
    const storeUsers = getUsers();
    const storeCompanies = getCompanies();
    
    const results = {
      synced: 0,
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const storeUser of storeUsers) {
      try {
        // Trouver la company correspondante dans le store
        const storeCompany = storeCompanies.find(c => c.id === storeUser.companyId);
        if (!storeCompany) continue;

        // Trouver ou créer l'organisation dans Prisma
        const orgSlug = storeCompany.code.toLowerCase();
        let org = await prisma.organization.findFirst({
          where: { slug: orgSlug },
        });

        if (!org) {
          org = await prisma.organization.create({
            data: {
              slug: orgSlug,
              name: storeCompany.name,
            },
          });
        }

        // Chercher l'utilisateur dans Prisma par externalId d'abord
        let prismaUser = await prisma.user.findFirst({
          where: {
            OR: [
              { externalId: storeUser.id },
              { 
                organizationId: org.id,
                OR: [
                  { name: storeUser.name },
                  { displayName: storeUser.name },
                ]
              },
            ],
          },
        });

        const role = storeUser.level >= 10 ? "admin" : "user";

        if (prismaUser) {
          // Mettre à jour le nom et externalId si nécessaire
          const needsUpdate = 
            prismaUser.name !== storeUser.name || 
            prismaUser.displayName !== storeUser.name ||
            prismaUser.externalId !== storeUser.id;
            
          if (needsUpdate) {
            await prisma.user.update({
              where: { id: prismaUser.id },
              data: {
                name: storeUser.name,
                displayName: storeUser.name,
                externalId: storeUser.id,
                role,
              },
            });
            results.updated++;
          }
        } else {
          // Vérifier si un utilisateur avec cet externalId existe déjà
          const existingByExternalId = await prisma.user.findFirst({
            where: { externalId: storeUser.id },
          });
          
          if (existingByExternalId) {
            // Mettre à jour l'utilisateur existant
            await prisma.user.update({
              where: { id: existingByExternalId.id },
              data: {
                name: storeUser.name,
                displayName: storeUser.name,
                role,
              },
            });
            results.updated++;
          } else {
            // Créer l'utilisateur
            await prisma.user.create({
              data: {
                organizationId: org.id,
                externalId: storeUser.id,
                name: storeUser.name,
                displayName: storeUser.name,
                role,
              },
            });
            results.created++;
          }
        }

        results.synced++;
      } catch (err: any) {
        results.errors.push(`User ${storeUser.name}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synchronisation terminée: ${results.synced} traités, ${results.created} créés, ${results.updated} mis à jour`,
      results,
    });
  } catch (error: any) {
    console.error("Erreur sync-users:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * GET: Voir l'état actuel des utilisateurs (store vs Prisma)
 */
export async function GET(req: NextRequest) {
  try {
    const storeUsers = getUsers();
    const prismaUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        externalId: true,
        role: true,
        organizationId: true,
      },
    });

    return NextResponse.json({
      storeUsers: storeUsers.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        level: u.level,
        companyId: u.companyId,
      })),
      prismaUsers,
      storeCount: storeUsers.length,
      prismaCount: prismaUsers.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
