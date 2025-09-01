import { NextRequest, NextResponse } from 'next/server';

// Types pour la gestion des entreprises
interface Company {
  id: string;
  name: string;
  normalizedName: string;
  createdAt: string;
  founder: {
    name: string;
    email?: string;
  };
  settings: {
    employeeCode: string;
    founderCode: string;
  };
}

// Base de données temporaire en mémoire (sera remplacée par Firebase)
let companies: Company[] = [];

export async function POST(request: NextRequest) {
  try {
    const { companyName } = await request.json();

    if (!companyName || typeof companyName !== 'string') {
      return NextResponse.json(
        { error: 'Nom d\'entreprise requis' },
        { status: 400 }
      );
    }

    // Normaliser le nom pour la recherche (minuscules, sans espaces inutiles)
    const normalizedName = companyName.trim().toLowerCase();

    // Vérifier si l'entreprise existe
    const existingCompany = companies.find(
      company => company.normalizedName === normalizedName
    );

    if (existingCompany) {
      // Entreprise existe → Mode connexion employé
      return NextResponse.json({
        exists: true,
        companyId: existingCompany.id,
        companyName: existingCompany.name,
        screenType: 'employee-login',
        requiredCode: existingCompany.settings.employeeCode,
        message: `Connexion à "${existingCompany.name}"`
      });
    } else {
      // Entreprise n'existe pas → Mode création DG
      return NextResponse.json({
        exists: false,
        companyName: companyName.trim(),
        screenType: 'founder-setup',
        requiredCode: '1234',
        message: `Créer l'entreprise "${companyName.trim()}" et devenir Directeur Général`
      });
    }

  } catch (error) {
    console.error('Erreur lors de la vérification de l\'entreprise:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la vérification' },
      { status: 500 }
    );
  }
}

// Endpoint pour créer une nouvelle entreprise (DG)
export async function PUT(request: NextRequest) {
  try {
    const { companyName, founderName, code } = await request.json();

    // Vérifier le code fondateur
    if (code !== '1234') {
      return NextResponse.json(
        { error: 'Code fondateur incorrect' },
        { status: 401 }
      );
    }

    const normalizedName = companyName.trim().toLowerCase();

    // Vérifier que l'entreprise n'existe toujours pas
    const exists = companies.find(c => c.normalizedName === normalizedName);
    if (exists) {
      return NextResponse.json(
        { error: 'Cette entreprise existe déjà' },
        { status: 409 }
      );
    }

    // Créer la nouvelle entreprise
    const newCompany: Company = {
      id: `company_${Date.now()}`,
      name: companyName.trim(),
      normalizedName,
      createdAt: new Date().toISOString(),
      founder: {
        name: founderName.trim()
      },
      settings: {
        employeeCode: '0000', // Code par défaut pour les employés
        founderCode: '1234'   // Code fondateur
      }
    };

    companies.push(newCompany);

    return NextResponse.json({
      success: true,
      company: newCompany,
      user: {
        id: `user_${Date.now()}`,
        name: founderName.trim(),
        role: 'directeur_general',
        companyId: newCompany.id,
        isFounder: true
      },
      message: `Entreprise "${companyName}" créée avec succès !`
    });

  } catch (error) {
    console.error('Erreur lors de la création de l\'entreprise:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la création' },
      { status: 500 }
    );
  }
}
