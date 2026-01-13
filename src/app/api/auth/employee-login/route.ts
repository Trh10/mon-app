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

// Fonction pour calculer le niveau d'un rôle
function getRoleLevel(role: string): number {
  const r = role.toLowerCase();
  if (r.includes('directeur') || r.includes('dg') || r === 'admin') return 100;
  if (r.includes('manager') || r.includes('responsable')) return 50;
  if (r.includes('finance') || r.includes('comptable')) return 40;
  return 10;
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
      
      // Convertir le rôle pour l'affichage
      let displayRole = existingUser.role;
      if (existingUser.role === 'admin') displayRole = 'Directeur Général';
      else if (existingUser.role === 'manager') displayRole = 'Manager';
      else if (existingUser.role === 'member') displayRole = 'Employé';
      
      const userData = {
        id: existingUser.id,
        name: existingUser.displayName || existingUser.name,
        role: displayRole,
        level: getRoleLevel(existingUser.role),
        organizationId: org.id,
        companyCode: org.slug.toUpperCase(),
        permissions: ['read', 'write']
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
    
    // Interdire création d'un rôle DG si un DG existe déjà
    if (/dg|directeur/i.test(role)) {
      const existingDG = await prisma.user.findFirst({
        where: {
          organizationId: org.id,
          role: 'admin'
        }
      });
      if (existingDG) {
        return NextResponse.json({ error: 'Un Directeur Général existe déjà. Demandez-lui de créer votre compte.' }, { status: 403 });
      }
    }

    // Déterminer le rôle Prisma
    let prismaRole = 'member';
    if (/dg|directeur|admin/i.test(role)) prismaRole = 'admin';
    else if (/manager|responsable/i.test(role)) prismaRole = 'manager';
    else if (/finance|comptable/i.test(role)) prismaRole = 'manager';

    try {
      const newUser = await prisma.user.create({
        data: {
          organizationId: org.id,
          name: name.trim(),
          displayName: name.trim(),
          role: prismaRole,
          pinHash: hashPin(pin),
          externalId: `emp_${org.id}_${Date.now()}`,
        }
      });

      // Convertir le rôle pour l'affichage
      let displayRole = role;
      
      const userData = {
        id: newUser.id,
        name: newUser.displayName || newUser.name,
        role: displayRole,
        level: getRoleLevel(role),
        organizationId: org.id,
        companyCode: org.slug.toUpperCase(),
        permissions: ['read', 'write']
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
