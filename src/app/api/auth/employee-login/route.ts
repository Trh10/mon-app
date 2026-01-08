import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { prisma } from '@/lib/db';
import { 
  findCompanyByName,
  createUser,
  validateLogin,
  permissionsForLevel,
  getRoleLevel,
  findUserByName,
  publicUser,
  createCompany,
  normalizeCompanyName,
  normalizeUserName,
  getUsers
} from '@/lib/auth/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Configuration de la session iron-session
const sessionOptions = {
  password: process.env.SESSION_PASSWORD || "default-32-char-secret-change-in-production!",
  cookieName: "icones-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax" as const,
  },
};

// Helper pour créer/mettre à jour la session iron-session et le cookie legacy
async function setAuthSession(req: NextRequest, res: NextResponse, userData: any) {
  // 1. Session iron-session (utilisée par les APIs Prisma)
  const session = await getIronSession<any>(req, res, sessionOptions);
  
  // Trouver ou créer l'organisation et l'utilisateur Prisma correspondants
  let prismaUser = null;
  let organizationId = 1;
  
  try {
    // D'abord, chercher l'utilisateur par son externalId ou nom
    prismaUser = await prisma.user.findFirst({
      where: {
        OR: [
          { externalId: userData.id },
          { name: userData.name },
          { displayName: userData.name }
        ]
      },
      include: { organization: true }
    });
    
    if (prismaUser) {
      // Utilisateur trouvé - utiliser son organisation
      organizationId = prismaUser.organizationId;
    } else {
      // Utilisateur non trouvé - créer l'organisation et l'utilisateur
      const orgSlug = (userData.companyCode || 'default').toLowerCase();
      let org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
      
      if (!org) {
        org = await prisma.organization.create({
          data: {
            slug: orgSlug,
            name: userData.companyCode || 'Default Company',
          },
        });
      }
      organizationId = org.id;
      
      // Créer l'utilisateur
      prismaUser = await prisma.user.create({
        data: {
          organizationId: org.id,
          externalId: userData.id,
          name: userData.name,
          displayName: userData.name,
          role: userData.level >= 10 ? 'admin' : 'user',
        },
        include: { organization: true }
      });
    }
  } catch (e) {
    console.error('Prisma user sync failed:', e);
  }

  session.organizationId = prismaUser?.organizationId || organizationId;
  session.organizationSlug = prismaUser?.organization?.slug || 'default';
  session.userId = prismaUser?.id || parseInt(userData.id) || 1;
  session.userRole = userData.role;
  session.userName = userData.name;
  await session.save();

  // 2. Cookie legacy (pour compatibilité avec le frontend)
  const cookieStore = cookies();
  cookieStore.set('user-session', JSON.stringify(userData), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 3600
  });

  // 3. Cookie organizationId (fallback pour certaines APIs)
  cookieStore.set('organizationId', String(session.organizationId), {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 3600
  });
}

/*
  POST /api/auth/employee-login
  Body: { companyName, name, role, pin, createIfNotExists?: boolean }
  Behaviour:
    - Require existing company (no auto-create here)
    - If user exists: validate PIN and return
    - Else if createIfNotExists true: create new user with given role & pin (validated)
*/
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, name, role, pin, createIfNotExists } = body || {};

  if (!companyName || !name || !role || !pin) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN invalide (4-6 chiffres)' }, { status: 400 });
    }

    const company = findCompanyByName(companyName);
    if (!company) {
      return NextResponse.json({ error: 'Entreprise inconnue' }, { status: 404 });
    }

    // Protection: empêcher d'usurper nom DG/Admin/Finance existant
    const existing = findUserByName(company.id, name);
    const res = new NextResponse();
    
    if (existing) {
      // User exists -> login path
      try {
        const logged = validateLogin(company, name, pin);
        const userData = {
          id: logged.id,
          name: logged.name,
          role: logged.role,
          level: logged.level,
          companyId: logged.companyId,
          companyCode: logged.companyCode,
          permissions: logged.permissions
        };
        
        // Créer les sessions (iron-session + cookie legacy)
        await setAuthSession(req, res, userData);
        
        return NextResponse.json({ success: true, user: publicUser(logged), created: false });
      } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Échec connexion' }, { status: 401 });
      }
    }

    if (!createIfNotExists) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Impersonation / privilege escalation guard:
    // If trying to create a high-privilege role (DG/Admin/Finance) and another user with such role already exists with different name, restrict to prevent multiple privileged creations for now (simple rule).
    const loweredRole = String(role).toLowerCase();
    if (/(dg|directeur|admin|administr|finance|financ)/.test(loweredRole)) {
      const existingPrivileged = findUserByName(company.id, name);
      // If different name already holds privileged role we still allow new name but later we could restrict count; for now we just prevent using same name with different intended role mismatch.
      // Additional rule: forbid creating second DG explicitly
      if (loweredRole.includes('dg')) {
        // naive check: count existing DG
        // (import getUsers? we can rely on findUserByName only for same name; skip multi-DG enforcement if utility absent)
      }
    }

    try {
      // Interdire création immédiate d'un rôle DG si un DG existe déjà
      if (/dg|directeur/i.test(role)) {
        const existingDG = getUsers().find((u: any) => u.companyId === company.id && /dg|directeur/i.test(u.role));
        if (existingDG) {
          return NextResponse.json({ error: 'Un DG existe déjà. Demandez lui de créer votre compte.' }, { status: 403 });
        }
      }
      const user = createUser(company, name, role, pin, 'self');
      const userData = {
        id: user.id,
        name: user.name,
        role: user.role,
        level: user.level,
        companyId: user.companyId,
        companyCode: user.companyCode,
        permissions: user.permissions
      };
      
      // Créer les sessions (iron-session + cookie legacy)
      await setAuthSession(req, res, userData);
      
      return NextResponse.json({ success: true, user: publicUser(user), created: true });
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Erreur création utilisateur' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur login employé' }, { status: 500 });
  }
}
