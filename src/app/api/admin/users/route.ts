import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUsers, addUser, updateUser, deleteUser, getUsersByCompany } from '@/lib/users/user-store';
import { CreateUserData, UpdateUserData } from '@/lib/users/user-types';
import { addAuditLog } from '@/lib/audit/audit-store';

// Récupérer l'utilisateur actuel depuis la session
async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('user-session');
    if (!sessionCookie) return null;
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

// GET - Récupérer les utilisateurs
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    // Seuls les administrateurs (niveau 7+) peuvent gérer les utilisateurs
    if (user.level < 7) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const companyFilter = searchParams.get('company');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let users;
    
    if (companyFilter) {
      users = getUsersByCompany(companyFilter);
    } else {
      users = getUsers();
    }

    if (activeOnly) {
      users = users.filter(u => u.isActive);
    }

    // Ne pas retourner d'informations sensibles
    const safeUsers = users.map(u => ({
      ...u,
      // Retirer des champs sensibles si nécessaire
    }));

    return NextResponse.json({
      success: true,
      users: safeUsers,
      total: safeUsers.length
    });

  } catch (error) {
    console.error('Erreur GET utilisateurs:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer un utilisateur
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    // Seuls les administrateurs (niveau 7+) peuvent créer des utilisateurs
    if (user.level < 7) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    const userData: CreateUserData = await req.json();

    // Validation
    if (!userData.code || !userData.name || !userData.email || !userData.level || !userData.companyId) {
      return NextResponse.json(
        { success: false, error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      );
    }

    // Vérifier que le niveau est valide
    if (![1, 5, 6, 7, 10].includes(userData.level)) {
      return NextResponse.json(
        { success: false, error: 'Niveau utilisateur invalide' },
        { status: 400 }
      );
    }

    // Seul un DG peut créer d'autres DG
    if (userData.level === 10 && user.level !== 10) {
      return NextResponse.json(
        { success: false, error: 'Seul un Directeur Général peut créer d\'autres Directeurs Généraux' },
        { status: 403 }
      );
    }

    const newUser = addUser(userData);

    if (!newUser) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création de l\'utilisateur' },
        { status: 500 }
      );
    }

    // Log d'audit
    addAuditLog(
      'user-management',
      user.code,
      user.name,
      user.level,
      'created',
      {
        targetUserId: newUser.id,
        targetUserCode: newUser.code,
        targetUserLevel: newUser.level
      }
    );

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'Utilisateur créé avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur POST utilisateur:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - Mettre à jour un utilisateur
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    // Seuls les administrateurs (niveau 7+) peuvent modifier les utilisateurs
    if (user.level < 7) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ID utilisateur requis' },
        { status: 400 }
      );
    }

    const updateData: UpdateUserData = await req.json();

    // Seul un DG peut modifier le niveau d'un autre DG
    if (updateData.level === 10 && user.level !== 10) {
      return NextResponse.json(
        { success: false, error: 'Seul un Directeur Général peut modifier le niveau d\'un autre DG' },
        { status: 403 }
      );
    }

    const updatedUser = updateUser(userId, updateData);

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé ou erreur de mise à jour' },
        { status: 404 }
      );
    }

    // Log d'audit
    addAuditLog(
      'user-management',
      user.code,
      user.name,
      user.level,
      'updated',
      {
        targetUserId: updatedUser.id,
        targetUserCode: updatedUser.code,
        changedFields: Object.keys(updateData)
      }
    );

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Utilisateur mis à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur PUT utilisateur:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Supprimer (désactiver) un utilisateur
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    // Seuls les administrateurs (niveau 7+) peuvent supprimer des utilisateurs
    if (user.level < 7) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ID utilisateur requis' },
        { status: 400 }
      );
    }

    // Empêcher l'auto-suppression
    if (userId === user.id) {
      return NextResponse.json(
        { success: false, error: 'Vous ne pouvez pas supprimer votre propre compte' },
        { status: 400 }
      );
    }

    const success = deleteUser(userId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé ou erreur de suppression' },
        { status: 404 }
      );
    }

    // Log d'audit
    addAuditLog(
      'user-management',
      user.code,
      user.name,
      user.level,
      'deleted',
      {
        targetUserId: userId
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Utilisateur désactivé avec succès'
    });

  } catch (error) {
    console.error('Erreur DELETE utilisateur:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
