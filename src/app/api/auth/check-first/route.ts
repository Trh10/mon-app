import { NextRequest, NextResponse } from 'next/server';

// Base de données en mémoire pour les entreprises
let companies: Array<{
  id: string;
  name: string;
  code: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}> = [];

export async function GET(req: NextRequest) {
  try {
    const isFirst = companies.length === 0;
    
    return NextResponse.json({
      isFirst,
      companiesCount: companies.length
    });

  } catch (error) {
    console.error('Erreur check-first:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
