import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
  POST /api/auth/check-user
  Body: { companyName, name }
  Response:
    - { exists: true, user: { id, name, role, level, ... } }
    - { exists: false }
  Errors: 404 company not found, 400 validation
*/
export async function POST(req: NextRequest) {
  try {
    const { companyName, name } = await req.json();
    if (!companyName || !name) {
      return NextResponse.json({ error: 'Champs requis' }, { status: 400 });
    }
    
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
    
    const normalizedName = name.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        organizationId: org.id,
        OR: [
          { name: { equals: name.trim(), mode: 'insensitive' } },
          { displayName: { equals: name.trim(), mode: 'insensitive' } }
        ]
      }
    });
    
    if (user) {
      // Convertir le rôle admin en "Directeur Général" pour l'affichage
      let displayRole = user.role;
      if (user.role === 'admin') displayRole = 'Directeur Général';
      else if (user.role === 'manager') displayRole = 'Manager';
      else if (user.role === 'member') displayRole = 'Employé';
      
      return NextResponse.json({ 
        exists: true, 
        user: {
          id: user.id,
          name: user.displayName || user.name,
          role: displayRole,
          level: user.role === 'admin' ? 'founder' : 'employee'
        }
      });
    }
    return NextResponse.json({ exists: false });
  } catch (e) {
    console.error('Erreur check-user:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}