import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPin } from '@/lib/hash';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { companyName } = await request.json();
    if (!companyName || typeof companyName !== 'string') {
      return NextResponse.json({ error: 'Nom d\'entreprise requis' }, { status: 400 });
    }
    
    const normalizedName = companyName.trim().toLowerCase();
    
    // Chercher l'organisation dans Prisma
    const org = await prisma.organization.findFirst({
      where: {
        OR: [
          { slug: normalizedName },
          { name: { contains: companyName.trim(), mode: 'insensitive' } }
        ]
      }
    });
    
    if (org) {
      return NextResponse.json({
        exists: true,
        companyId: org.id,
        companyName: org.name,
        screenType: 'employee-login',
        message: `Connexion à "${org.name}"`
      });
    }
    
    return NextResponse.json({
      exists: false,
      companyName: companyName.trim(),
      screenType: 'founder-setup',
      requiredCode: '1234',
      message: `Créer l'entreprise "${companyName.trim()}" et devenir Directeur Général`
    });
  } catch (e) {
    console.error('Erreur check-company:', e);
    return NextResponse.json({ error: 'Erreur serveur lors de la vérification' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { companyName, founderName, code, pin } = await request.json();
    if (!companyName || !founderName || !code || !pin) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    }
    if (code !== '1234') {
      return NextResponse.json({ error: 'Code fondateur incorrect' }, { status: 401 });
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN fondateur invalide (4-6 chiffres)' }, { status: 400 });
    }
    
    // Vérifier les PINs trop simples
    const simplePins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '1230'];
    if (simplePins.includes(pin)) {
      return NextResponse.json({ error: 'PIN trop simple. Choisissez un PIN plus sécurisé.' }, { status: 400 });
    }
    
    const normalizedName = companyName.trim().toLowerCase();
    const slug = normalizedName.replace(/[^a-z0-9]/g, '-').slice(0, 50);
    
    // Vérifier si l'organisation existe déjà
    const existing = await prisma.organization.findFirst({
      where: {
        OR: [
          { slug },
          { name: { equals: companyName.trim(), mode: 'insensitive' } }
        ]
      }
    });
    
    if (existing) {
      return NextResponse.json({ error: 'Entreprise déjà existante' }, { status: 409 });
    }
    
    // Créer l'organisation
    const org = await prisma.organization.create({
      data: {
        slug,
        name: companyName.trim(),
      }
    });
    
    // Créer l'utilisateur fondateur (DG)
    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        name: founderName.trim(),
        displayName: founderName.trim(),
        role: 'admin',
        pinHash: hashPin(pin),
        externalId: `founder_${org.id}_${Date.now()}`,
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      company: { id: org.id, name: org.name, code: slug.toUpperCase().slice(0, 4) },
      user: { id: user.id, name: user.name, role: 'Directeur Général' },
      message: 'Entreprise créée' 
    });
  } catch (e: any) {
    console.error('Erreur création entreprise:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur lors de la création' }, { status: 500 });
  }
}
