import { NextRequest, NextResponse } from 'next/server';
import { findCompanyByName, findUserByName, publicUser, getUsers } from '@/lib/auth/store';

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
    const company = findCompanyByName(companyName);
    if (!company) return NextResponse.json({ error: 'Entreprise inconnue' }, { status: 404 });
    const user = findUserByName(company.id, name);
    if (user) {
      return NextResponse.json({ exists: true, user: publicUser(user) });
    }
    return NextResponse.json({ exists: false });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}