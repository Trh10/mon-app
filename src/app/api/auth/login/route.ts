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

// Générer un code entreprise depuis le nom
function generateCompanyCode(companyName: string): string {
  // Prendre les 4 premières lettres, en majuscules, sans caractères spéciaux
  const cleaned = companyName
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .substring(0, 4);
  
  // Si moins de 4 caractères, compléter avec des chiffres
  if (cleaned.length < 4) {
    const padding = Math.floor(Math.random() * 1000).toString().padStart(4 - cleaned.length, '0');
    return cleaned + padding;
  }
  
  return cleaned;
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

// Vérifier si c'est la première entreprise
function isFirstCompany(): boolean {
  return companies.length === 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, name, companyName } = body;

    console.log('Requête de connexion:', { code, name, companyName });

    // Validation stricte des entrées
    if (!code || !name || !companyName) {
      return NextResponse.json({ 
        error: 'Tous les champs sont requis: nom, code et entreprise' 
      }, { status: 400 });
    }

    // Normaliser le nom de l'entreprise
    const normalizedCompany = companyName.trim().toLowerCase();

    // Cas 1: Première entreprise - créer l'entreprise et le premier utilisateur DG
    if (isFirstCompany() && name && companyName) {
      // Vérifier que c'est un code fondateur valide (doit être exactement 1234 pour créer la première entreprise)
      if (code !== '1234') {
        return NextResponse.json({ 
          error: 'Code fondateur incorrect. Pour créer la première entreprise, utilisez le code 1234' 
        }, { status: 401 });
      }

      const companyCode = generateCompanyCode(companyName);
      const fullCode = `${companyCode}-1000`;

      // Créer l'entreprise
      const newCompany = {
        id: generateId(),
        name: companyName,
        code: companyCode,
        createdAt: new Date().toISOString(),
        createdBy: name,
        isActive: true
      };
      companies.push(newCompany);

      // Créer le premier utilisateur DG
      const newUser = {
        id: generateId(),
        name: name,
        code: fullCode,
        level: 10,
        levelName: 'Directeur Général',
        permissions: getPermissionsByLevel(10),
        companyId: newCompany.id,
        companyCode: companyCode,
        createdBy: 'système',
        createdAt: new Date().toISOString()
      };
      userCodes.push(newUser);

      console.log('Première entreprise créée:', newCompany);
      console.log('Premier utilisateur DG créé:', newUser);

      // Ajouter quelques utilisateurs de test pour les workflows
      const testUsers = [
        {
          id: generateId(),
          name: 'Jean Dupont',
          code: companyCode + '-1001',
          level: 5,
          levelName: 'Employé',
          permissions: getPermissionsByLevel(5),
          companyId: newCompany.id,
          companyCode: companyCode,
          createdBy: newUser.id,
          createdAt: new Date().toISOString()
        },
        {
          id: generateId(),
          name: 'Paul Martin',
          code: companyCode + '-1002',
          level: 5,
          levelName: 'Employé',
          permissions: getPermissionsByLevel(5),
          companyId: newCompany.id,
          companyCode: companyCode,
          createdBy: newUser.id,
          createdAt: new Date().toISOString()
        },
        {
          id: generateId(),
          name: 'Marie Admin',
          code: companyCode + '-1003',
          level: 7,
          levelName: 'Administration',
          permissions: getPermissionsByLevel(7),
          companyId: newCompany.id,
          companyCode: companyCode,
          createdBy: newUser.id,
          createdAt: new Date().toISOString()
        },
        {
          id: generateId(),
          name: 'Sophie Finance',
          code: companyCode + '-1004',
          level: 6,
          levelName: 'Finance',
          permissions: getPermissionsByLevel(6),
          companyId: newCompany.id,
          companyCode: companyCode,
          createdBy: newUser.id,
          createdAt: new Date().toISOString()
        }
      ];

      userCodes.push(...testUsers);
      console.log('Utilisateurs de test créés:', testUsers.map(u => ({ name: u.name, code: u.code, level: u.level })));

      // Connexion automatique
      const cookieStore = cookies();
      cookieStore.set('user-session', JSON.stringify({
        id: newUser.id,
        name: newUser.name,
        code: newUser.code,
        level: newUser.level,
        levelName: newUser.levelName,
        permissions: newUser.permissions,
        companyId: newUser.companyId,
        companyCode: newUser.companyCode
      }), {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      return NextResponse.json({
        success: true,
        message: 'Entreprise créée avec succès',
        user: {
          id: newUser.id,
          name: newUser.name,
          code: newUser.code,
          level: newUser.level,
          levelName: newUser.levelName,
          permissions: newUser.permissions,
          companyId: newUser.companyId,
          companyCode: newUser.companyCode
        },
        isFirstUser: true
      });
    }

    // Cas 2: Connexion avec code existant
    if (code) {
      // D'abord, vérifier que l'entreprise existe
      const company = companies.find(c => 
        c.name.toLowerCase() === normalizedCompany && c.isActive
      );
      
      if (!company) {
        return NextResponse.json({
          success: false,
          message: `L'entreprise "${companyName}" n'existe pas. Vérifiez le nom ou créez une nouvelle entreprise.`
        }, { status: 404 });
      }

      // Ensuite, vérifier que le code appartient à cette entreprise
      const user = userCodes.find(u => 
        u.code === code && u.companyId === company.id
      );
      
      if (!user) {
        return NextResponse.json({
          success: false,
          message: `Code d'accès invalide pour l'entreprise "${companyName}". Vérifiez votre code ou contactez votre administrateur.`
        }, { status: 401 });
      }

      // Mettre à jour la dernière utilisation
      user.lastUsed = new Date().toISOString();

      console.log('Utilisateur connecté:', { name: user.name, company: company.name, level: user.level });

      // Configurer la session
      const cookieStore = cookies();
      cookieStore.set('user-session', JSON.stringify({
        id: user.id,
        name: user.name,
        code: user.code,
        level: user.level,
        levelName: user.levelName,
        permissions: user.permissions,
        companyId: user.companyId,
        companyCode: user.companyCode,
        company: company.name
      }), {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          code: user.code,
          level: user.level,
          levelName: user.levelName,
          permissions: user.permissions,
          companyId: user.companyId,
          companyCode: user.companyCode
        }
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Données manquantes'
    }, { status: 400 });

  } catch (error) {
    console.error('Erreur login:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur serveur'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Vérifier la session existante
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('user-session');
    
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false });
    }

    const session = JSON.parse(sessionCookie.value);
    return NextResponse.json({
      authenticated: true,
      user: session
    });

  } catch (error) {
    return NextResponse.json({ authenticated: false });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Déconnexion
    const cookieStore = cookies();
    cookieStore.delete('user-session');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la déconnexion' },
      { status: 500 }
    );
  }
}
