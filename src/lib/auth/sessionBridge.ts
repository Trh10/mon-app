import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Try to recover organizationId and userId from the lightweight 'user-session' cookie
 * used by the CodeAuthContext. If needed, it will create the Organization (by slug)
 * and the User (by externalId) in Prisma so the rest of the app can work.
 */
export async function ensureOrgAndUserFromCookie(req: NextRequest): Promise<{
  organizationId: number;
  userId: number | null;
  created?: boolean;
} | null> {
  try {
    // NextRequest has cookies access via .cookies
    const cookie = (req as any).cookies?.get?.("user-session")?.value as string | undefined;
    if (!cookie) return null;
    let parsed: any;
    try { parsed = JSON.parse(cookie); } catch { return null; }
    if (!parsed || (!parsed.companyId && !parsed.company && !parsed.companyCode)) return null;

    const slug = String(parsed.companyId || parsed.company || parsed.companyCode || "default").toLowerCase();
    const name = String(parsed.company || parsed.companyCode || slug).toUpperCase();

    // Ensure Organization exists
    const org = await prisma.organization.upsert({
      where: { slug },
      update: {},
      create: { slug, name },
    });

    // Ensure User exists (optional)
    let userId: number | null = null;
    const externalId = parsed.id ? String(parsed.id) : undefined;
    const userName = parsed.name || "Utilisateur";
    
    if (externalId) {
      let user = await prisma.user.findFirst({
        where: { organizationId: org.id, externalId },
      });
      if (!user) {
        // Créer l'utilisateur avec le bon nom
        user = await prisma.user.create({
          data: {
            organizationId: org.id,
            externalId,
            name: userName,
            displayName: userName,
            role: (parsed.role && String(parsed.role).toLowerCase().includes("directeur")) ? "admin" : "user",
          },
        });
      } else {
        // Mettre à jour le nom si différent (synchronisation)
        if (user.name !== userName || user.displayName !== userName) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              name: userName,
              displayName: userName,
            },
          });
        }
      }
      userId = user.id;
    }

    return { organizationId: org.id, userId };
  } catch (e) {
    // Silent fallback
    return null;
  }
}
