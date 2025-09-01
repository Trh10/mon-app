import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Base de données partagée pour les entreprises  
let companies: Array<{
  id: string;
  name: string;
  code: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}> = [];

// Base de données partagée pour les codes utilisateurs
let userCodes: Array<{
  id: string;
  name: string;
  code: string; // Format: COMPANY-XXXX
  level: number;
  levelName?: string;
  permissions: string[];
  companyId: string;
  companyCode: string;
  createdBy?: string;
  createdAt: string;
  lastUsed?: string;
}> = [];

// Générer un ID unique
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function getPermissionsByLevel(level: number): string[] {
  switch (level) {
    case 10: return ['all'];
    case 7: return ['view_needs', 'execute_approved', 'manage_users'];
    case 6: return ['view_needs', 'financial_review'];
    case 5: return ['create_needs', 'view_own_needs'];
    default: return ['create_needs', 'view_own_needs'];
  }
}

function getLevelName(level: number): string {
  switch (level) {
    case 10: return 'Directeur Général';
    case 7: return 'Administration';
    case 6: return 'Financier';
    case 5: return 'Employé';
    default: return 'Employé';
  }
}

async function getCurrentUser(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('user-session');
    
    if (!sessionCookie) {
      return null;
    }

    return JSON.parse(sessionCookie.value);
  } catch (error) {
    return null;
  }
}

// Générer le prochain numéro de code pour une entreprise
function getNextCodeNumber(companyCode: string): string {
  const companyCodes = userCodes
    .filter(u => u.companyCode === companyCode)
    .map(u => parseInt(u.code.split('-')[1]))
    .sort((a, b) => b - a);
  
  if (companyCodes.length === 0) {
    return '1000'; // Premier code DG
  }
  
  const nextNumber = companyCodes[0] + 1;
  return nextNumber.toString().padStart(4, '0');
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    
    if (!currentUser || currentUser.level !== 10) {
      return NextResponse.json({
        success: false,
        message: 'Accès refusé - Niveau DG requis'
      }, { status: 403 });
    }

    // Filtrer les codes par entreprise de l'utilisateur
    const companyCodes = userCodes.filter(u => u.companyId === currentUser.companyId);

    return NextResponse.json({
      success: true,
      codes: companyCodes.map(code => ({
        id: code.id,
        name: code.name,
        code: code.code,
        level: code.level,
        levelName: code.levelName,
        permissions: code.permissions,
        createdBy: code.createdBy,
        createdAt: code.createdAt,
        lastUsed: code.lastUsed
      }))
    });

  } catch (error) {
    console.error('Erreur GET codes:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur serveur'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    
    if (!currentUser || currentUser.level !== 10) {
      return NextResponse.json({
        success: false,
        message: 'Accès refusé - Niveau DG requis'
      }, { status: 403 });
    }

    const { name, level } = await req.json();

    if (!name || !level) {
      return NextResponse.json({
        success: false,
        message: 'Nom et niveau requis'
      }, { status: 400 });
    }

    if (![5, 6, 7, 10].includes(level)) {
      return NextResponse.json({
        success: false,
        message: 'Niveau invalide (5, 6, 7, ou 10)'
      }, { status: 400 });
    }

    // Générer le code avec le préfixe de l'entreprise
    const codeNumber = getNextCodeNumber(currentUser.companyCode);
    const fullCode = `${currentUser.companyCode}-${codeNumber}`;

    // Vérifier que le code n'existe pas déjà
    const existingCode = userCodes.find(u => u.code === fullCode);
    if (existingCode) {
      return NextResponse.json({
        success: false,
        message: 'Code déjà existant'
      }, { status: 400 });
    }

    const newCode = {
      id: generateId(),
      name: name,
      code: fullCode,
      level: level,
      levelName: getLevelName(level),
      permissions: getPermissionsByLevel(level),
      companyId: currentUser.companyId,
      companyCode: currentUser.companyCode,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString()
    };

    userCodes.push(newCode);

    console.log('Nouveau code créé:', newCode);

    return NextResponse.json({
      success: true,
      message: 'Code créé avec succès',
      code: {
        id: newCode.id,
        name: newCode.name,
        code: newCode.code,
        level: newCode.level,
        levelName: newCode.levelName,
        permissions: newCode.permissions,
        createdBy: newCode.createdBy,
        createdAt: newCode.createdAt
      }
    });

  } catch (error) {
    console.error('Erreur POST codes:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur serveur'
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    
    if (!currentUser || currentUser.level !== 10) {
      return NextResponse.json({
        success: false,
        message: 'Accès refusé - Niveau DG requis'
      }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const codeId = searchParams.get('id');

    if (!codeId) {
      return NextResponse.json({
        success: false,
        message: 'ID du code requis'
      }, { status: 400 });
    }

    const codeIndex = userCodes.findIndex(u => 
      u.id === codeId && u.companyId === currentUser.companyId
    );
    
    if (codeIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Code non trouvé'
      }, { status: 404 });
    }

    // Ne pas permettre la suppression du propre code DG
    if (userCodes[codeIndex].code === currentUser.code) {
      return NextResponse.json({
        success: false,
        message: 'Impossible de supprimer votre propre code'
      }, { status: 400 });
    }

    const deletedCode = userCodes.splice(codeIndex, 1)[0];

    console.log('Code supprimé:', deletedCode);

    return NextResponse.json({
      success: true,
      message: 'Code supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur DELETE codes:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur serveur'
    }, { status: 500 });
  }
}
