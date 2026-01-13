import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { prisma } from '@/lib/db';
import { hashPin, verifyPin } from '@/lib/hash';

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
  const session = await getIronSession<any>(req, res, sessionOptions);

  session.organizationId = userData.organizationId;
  session.organizationSlug = userData.companyCode || 'default';
  session.userId = userData.id;
  session.userRole = userData.role;
  session.userName = userData.name;
  await session.save();

  // Cookie legacy (pour compatibilité avec le frontend)
  const cookieStore = cookies();
  cookieStore.set('user-session', JSON.stringify(userData), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 3600
  });

  // Cookie organizationId (fallback pour certaines APIs)
  cookieStore.set('organizationId', String(userData.organizationId), {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 3600
  });
}

// Configuration des rôles et permissions
const ROLE_CONFIG: Record<string, { level: number; permissions: string[]; displayName: string }> = {
  'Directeur Général': {
    level: 100,
    permissions: ['all', 'view_all', 'manage_users', 'manage_company', 'view_treasury', 'manage_treasury', 'create_invoices', 'delete_invoices', 'view_reports'],
    displayName: 'Directeur Général'
  },
  'Administration': {
    level: 80,
    permissions: ['view_all', 'view_treasury', 'manage_treasury', 'create_invoices', 'delete_invoices', 'view_reports', 'manage_meetings'],
    displayName: 'Administration'
  },
  'Finance': {
    level: 70,
    permissions: ['view_finances', 'view_treasury', 'manage_treasury', 'create_invoices', 'view_reports'],
    displayName: 'Finance'
  },
  'Comptable': {
    level: 70,
    permissions: ['view_finances', 'view_treasury', 'manage_treasury', 'create_invoices', 'view_reports'],
    displayName: 'Comptable'
  },
  'Assistant': {
    level: 40,
    permissions: ['create_invoices', 'view_invoices', 'manage_meetings', 'view_team'],
    displayName: 'Assistant(e)'
  },
  'Assistante': {
    level: 40,
    permissions: ['create_invoices', 'view_invoices', 'manage_meetings', 'view_team'],
    displayName: 'Assistante'
  },
  'Employé': {
    level: 10,
    permissions: ['view_own', 'view_team'],
    displayName: 'Employé'
  }
};

// Fonction pour normaliser et obtenir la config d'un rôle
function getRoleConfig(role: string): { level: number; permissions: string[]; displayName: string; normalizedRole: string } {
  const r = role.trim();
  
  // Chercher une correspondance exacte
  if (ROLE_CONFIG[r]) {
    return { ...ROLE_CONFIG[r], normalizedRole: r };
  }
  
  // Sinon, chercher par mot-clé
  const lowerRole = r.toLowerCase();
  if (lowerRole.includes('dg') || lowerRole.includes('directeur')) {
    return { ...ROLE_CONFIG['Directeur Général'], normalizedRole: 'Directeur Général' };
  }
  if (lowerRole.includes('admin')) {
    return { ...ROLE_CONFIG['Administration'], normalizedRole: 'Administration' };
  }
  if (lowerRole.includes('finance')) {
    return { ...ROLE_CONFIG['Finance'], normalizedRole: 'Finance' };
  }
  if (lowerRole.includes('comptab')) {
    return { ...ROLE_CONFIG['Comptable'], normalizedRole: 'Comptable' };
  }
  if (lowerRole.includes('assistant')) {
    return { ...ROLE_CONFIG['Assistant'], normalizedRole: 'Assistant' };
  }
  
  // Par défaut: Employé
  return { ...ROLE_CONFIG['Employé'], normalizedRole: 'Employé' };
}

// Fonction pour calculer le niveau d'un rôle
function getRoleLevel(role: string): number {
  return getRoleConfig(role).level;
}

// Vérifier si un PIN est trop simple
function isPinTooSimple(pin: string): boolean {
  const simplePins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '1230'];
  return simplePins.includes(pin);
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

    // Vérifier les PINs trop simples
    if (isPinTooSimple(pin)) {
      return NextResponse.json({ error: 'PIN trop simple. Choisissez un PIN plus sécurisé (évitez 0000, 1234, etc.)' }, { status: 400 });
    }

    // Trouver l'organisation dans Prisma
    const normalizedCompany = companyName.trim().toLowerCase();
    const org = await prisma.organization.findFirst({
      where: {
        OR: [
          { slug: normalizedCompany },
          { name: { contains: companyName.trim(), mode: 'insensitive' } }
        ]
      }
    });
    
    if (!org) {
      return NextResponse.json({ error: 'Entreprise inconnue' }, { status: 404 });
    }

    // Chercher l'utilisateur existant
    const existingUser = await prisma.user.findFirst({
      where: {
        organizationId: org.id,
        OR: [
          { name: { equals: name.trim(), mode: 'insensitive' } },
          { displayName: { equals: name.trim(), mode: 'insensitive' } }
        ]
      }
    });

    const res = new NextResponse();
    
    if (existingUser) {
      // User exists -> login path
      if (!existingUser.pinHash) {
        return NextResponse.json({ error: 'Utilisateur sans PIN configuré. Contactez l\'admin.' }, { status: 401 });
      }
      
      const pinValid = verifyPin(pin, existingUser.pinHash);
      if (!pinValid) {
        return NextResponse.json({ error: 'PIN incorrect' }, { status: 401 });
      }
      
      // Mettre à jour updatedAt pour la présence en ligne
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { updatedAt: new Date() }
      });
      
      // Obtenir la configuration du rôle stocké
      const roleConfig = getRoleConfig(existingUser.role);
      
      const userData = {
        id: existingUser.id,
        name: existingUser.displayName || existingUser.name,
        role: roleConfig.displayName,
        level: roleConfig.level,
        organizationId: org.id,
        companyCode: org.slug.toUpperCase(),
        permissions: roleConfig.permissions
      };
      
      await setAuthSession(req, res, userData);
      
      return NextResponse.json({ 
        success: true, 
        user: { id: userData.id, name: userData.name, role: userData.role },
        created: false 
      });
    }

    if (!createIfNotExists) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Création d'un nouvel utilisateur
    const loweredRole = String(role).toLowerCase();
    
    // Obtenir la configuration du rôle demandé
    const roleConfig = getRoleConfig(role);
    
    // Interdire création d'un rôle DG si un DG existe déjà
    if (roleConfig.normalizedRole === 'Directeur Général') {
      const existingDG = await prisma.user.findFirst({
        where: {
          organizationId: org.id,
          role: 'Directeur Général'
        }
      });
      if (existingDG) {
        return NextResponse.json({ error: 'Un Directeur Général existe déjà. Demandez-lui de créer votre compte.' }, { status: 403 });
      }
    }

    // Le rôle normalisé sera stocké directement (ex: 'Administration', 'Finance', etc.)
    const normalizedRole = roleConfig.normalizedRole;

    try {
      const newUser = await prisma.user.create({
        data: {
          organizationId: org.id,
          name: name.trim(),
          displayName: name.trim(),
          role: normalizedRole, // Stocker le rôle exact: 'Administration', 'Finance', etc.
          pinHash: hashPin(pin),
          externalId: `emp_${org.id}_${Date.now()}`,
        }
      });

      const userData = {
        id: newUser.id,
        name: newUser.displayName || newUser.name,
        role: roleConfig.displayName,
        level: roleConfig.level,
        organizationId: org.id,
        companyCode: org.slug.toUpperCase(),
        permissions: roleConfig.permissions
      };
      
      await setAuthSession(req, res, userData);
      
      return NextResponse.json({ 
        success: true, 
        user: { id: userData.id, name: userData.name, role: userData.role },
        created: true 
      });
    } catch (e: any) {
      console.error('Erreur création utilisateur:', e);
      return NextResponse.json({ error: e.message || 'Erreur création utilisateur' }, { status: 400 });
    }
  } catch (e) {
    console.error('Erreur serveur login employé:', e);
    return NextResponse.json({ error: 'Erreur serveur login employé' }, { status: 500 });
  }
}
