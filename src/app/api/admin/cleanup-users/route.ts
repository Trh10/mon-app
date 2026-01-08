import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUsers, getCompanies } from "@/lib/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API pour nettoyer et consolider les utilisateurs Prisma
 * - Supprime les doublons
 * - Met tous les utilisateurs d'une même company dans la même organisation
 */
export async function POST(req: NextRequest) {
  try {
    const storeUsers = getUsers();
    const storeCompanies = getCompanies();
    
    const results = {
      cleaned: 0,
      consolidated: 0,
      errors: [] as string[],
    };

    // Pour chaque company du store, créer/trouver UNE seule organisation dans Prisma
    for (const storeCompany of storeCompanies) {
      const orgSlug = storeCompany.code.toLowerCase();
      
      // Trouver ou créer l'organisation principale pour cette company
      let mainOrg = await prisma.organization.findFirst({
        where: { slug: orgSlug },
      });

      if (!mainOrg) {
        mainOrg = await prisma.organization.create({
          data: {
            slug: orgSlug,
            name: storeCompany.name,
          },
        });
        console.log(`Created org ${mainOrg.id} for company ${storeCompany.name}`);
      }

      // Trouver tous les utilisateurs du store pour cette company
      const companyUsers = storeUsers.filter(u => u.companyId === storeCompany.id);

      for (const storeUser of companyUsers) {
        try {
          // Trouver TOUS les utilisateurs Prisma qui correspondent à cet utilisateur
          const matchingUsers = await prisma.user.findMany({
            where: {
              OR: [
                { externalId: storeUser.id },
                { name: storeUser.name },
                { displayName: storeUser.name },
              ],
            },
          });

          if (matchingUsers.length === 0) {
            // Créer l'utilisateur s'il n'existe pas
            await prisma.user.create({
              data: {
                organizationId: mainOrg.id,
                externalId: storeUser.id,
                name: storeUser.name,
                displayName: storeUser.name,
                role: storeUser.level >= 10 ? "admin" : "user",
              },
            });
            results.consolidated++;
          } else if (matchingUsers.length === 1) {
            // Mettre à jour l'utilisateur existant pour s'assurer qu'il est dans la bonne org
            const existingUser = matchingUsers[0];
            if (existingUser.organizationId !== mainOrg.id || 
                existingUser.name !== storeUser.name || 
                existingUser.displayName !== storeUser.name) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  organizationId: mainOrg.id,
                  externalId: storeUser.id,
                  name: storeUser.name,
                  displayName: storeUser.name,
                  role: storeUser.level >= 10 ? "admin" : "user",
                },
              });
              results.consolidated++;
            }
          } else {
            // Plusieurs utilisateurs trouvés - garder celui qui a le bon externalId, supprimer les autres
            let keepUser = matchingUsers.find(u => u.externalId === storeUser.id) || matchingUsers[0];
            const duplicates = matchingUsers.filter(u => u.id !== keepUser.id);
            
            // Supprimer les doublons D'ABORD (pour éviter les conflits de contrainte unique)
            for (const dup of duplicates) {
              try {
                await prisma.user.delete({ where: { id: dup.id } });
                results.cleaned++;
              } catch (e: any) {
                results.errors.push(`Could not delete duplicate user ${dup.id}: ${e.message}`);
              }
            }

            // Mettre à jour l'utilisateur à garder APRÈS avoir supprimé les doublons
            await prisma.user.update({
              where: { id: keepUser.id },
              data: {
                organizationId: mainOrg.id,
                externalId: storeUser.id,
                name: storeUser.name,
                displayName: storeUser.name,
                role: storeUser.level >= 10 ? "admin" : "user",
              },
            });
            results.consolidated++;
          }
        } catch (err: any) {
          results.errors.push(`User ${storeUser.name}: ${err.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Nettoyage terminé: ${results.consolidated} consolidés, ${results.cleaned} doublons supprimés`,
      results,
    });
  } catch (error: any) {
    console.error("Erreur cleanup-users:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
