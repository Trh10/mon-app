import { NextRequest, NextResponse } from 'next/server';
import { findCompanyByName, createCompany, createUser, findUserByName } from '@/lib/auth/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { companyName } = await request.json();
    if (!companyName || typeof companyName !== 'string') {
      return NextResponse.json({ error: 'Nom d\'entreprise requis' }, { status: 400 });
    }
    const company = findCompanyByName(companyName);
    if (company) {
      return NextResponse.json({
        exists: true,
        companyId: company.id,
        companyName: company.name,
        screenType: 'employee-login',
        // We no longer send employee PIN publicly; user will enter their PIN
        message: `Connexion à "${company.name}"`
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
    const existing = findCompanyByName(companyName);
    if (existing) {
      return NextResponse.json({ error: 'Entreprise déjà existante' }, { status: 409 });
    }
    const company = createCompany(companyName, founderName);
    const user = createUser(company, founderName, 'Directeur Général', pin, 'founder');
    return NextResponse.json({ success: true, company, user, message: 'Entreprise créée' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur serveur lors de la création' }, { status: 500 });
  }
}
