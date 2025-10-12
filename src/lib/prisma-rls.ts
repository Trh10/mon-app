/**
 * Helper pour gérer le contexte d'organisation avec RLS
 * Assure l'isolation multi-locataire au niveau de la base de données
 */

import { PrismaClient } from '@prisma/client';

// Instance Prisma globale
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Exécute une requête Prisma avec le contexte d'organisation
 * Active automatiquement RLS pour isoler les données
 * 
 * @param orgId - ID de l'organisation
 * @param callback - Fonction contenant les requêtes Prisma
 * @returns Résultat de la callback
 * 
 * @example
 * const users = await withOrgContext(session.orgId, async () => {
 *   return prisma.user.findMany({ where: { role: 'admin' } });
 * });
 */
export async function withOrgContext<T>(
  orgId: number,
  callback: () => Promise<T>
): Promise<T> {
  // Définir l'organisation courante pour RLS
  await prisma.$executeRaw`SET LOCAL app.current_org_id = ${orgId}`;
  
  try {
    return await callback();
  } catch (error) {
    console.error('[withOrgContext] Erreur:', error);
    throw error;
  }
}

/**
 * Version batch pour exécuter plusieurs opérations dans une transaction
 * avec le même contexte d'organisation
 * 
 * @param orgId - ID de l'organisation
 * @param operations - Tableau d'opérations à exécuter
 * @returns Tableau des résultats
 * 
 * @example
 * const [users, tasks] = await withOrgContextBatch(session.orgId, [
 *   () => prisma.user.findMany(),
 *   () => prisma.task.findMany({ where: { status: 'pending' } })
 * ]);
 */
export async function withOrgContextBatch<T extends any[]>(
  orgId: number,
  operations: (() => Promise<any>)[]
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    // Définir le contexte pour cette transaction
    await tx.$executeRaw`SET LOCAL app.current_org_id = ${orgId}`;
    
    // Exécuter toutes les opérations
    const results = await Promise.all(
      operations.map(op => op())
    );
    
    return results as T;
  });
}

/**
 * Vérifie si RLS est activé sur une table
 * Utile pour le débogage
 * 
 * @param tableName - Nom de la table
 * @returns true si RLS est activé
 */
export async function checkRLSEnabled(tableName: string): Promise<boolean> {
  const result = await prisma.$queryRaw<{ relrowsecurity: boolean }[]>`
    SELECT relrowsecurity
    FROM pg_class
    WHERE relname = ${tableName}
  `;
  
  return result[0]?.relrowsecurity ?? false;
}

/**
 * Récupère toutes les politiques RLS d'une table
 * Utile pour le débogage
 * 
 * @param tableName - Nom de la table
 * @returns Liste des politiques
 */
export async function getRLSPolicies(tableName: string) {
  return await prisma.$queryRaw<any[]>`
    SELECT 
      polname as policy_name,
      polcmd as command,
      polpermissive as permissive,
      pg_get_expr(polqual, polrelid) as using_expression,
      pg_get_expr(polwithcheck, polrelid) as with_check_expression
    FROM pg_policy
    WHERE polrelid = ${tableName}::regclass
  `;
}

/**
 * Middleware Next.js pour extraire l'orgId de la session
 * et l'attacher à la requête
 * 
 * Utilisation dans src/middleware.ts ou dans les API routes:
 * 
 * const session = await getSession(req);
 * if (!session?.orgId) {
 *   return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
 * }
 * 
 * // Toutes les requêtes Prisma suivantes utiliseront automatiquement ce contexte
 * return await withOrgContext(session.orgId, async () => {
 *   // Vos requêtes ici
 *   const data = await prisma.user.findMany();
 *   return NextResponse.json(data);
 * });
 */

export default prisma;
