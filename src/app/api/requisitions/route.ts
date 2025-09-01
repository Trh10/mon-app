import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  Requisition, 
  CreateRequisitionData, 
  UpdateRequisitionData, 
  WorkflowStep, 
  RequisitionStatus,
  DEFAULT_APPROVAL_CONFIG,
  canAccessRequisitions
} from '@/lib/requisitions/requisition-types';
import {
  getRequisitions,
  addRequisition,
  updateRequisition,
  deleteRequisition,
  getRequisitionsByCompany
} from '@/lib/requisitions/requisition-store';
import { addAuditLog } from '@/lib/audit/audit-store';
import { createEmailNotification } from '@/lib/notifications/email-service';

// Générer un ID unique
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Récupérer l'utilisateur actuel depuis la session
async function getCurrentUser(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('user-session');
    
    if (!sessionCookie) {
      return null;
    }

    return JSON.parse(sessionCookie.value);
  } catch (error) {
    console.error('Erreur parsing session:', error);
    return null;
  }
}

// Créer le workflow d'approbation selon le budget
function createWorkflow(requisition: Requisition): WorkflowStep[] {
  const { budget } = requisition;
  let requiredLevels: number[] = [];

  if (budget < DEFAULT_APPROVAL_CONFIG.SMALL_BUDGET_THRESHOLD) {
    requiredLevels = DEFAULT_APPROVAL_CONFIG.SMALL_BUDGET_LEVELS;
  } else if (budget < DEFAULT_APPROVAL_CONFIG.MEDIUM_BUDGET_THRESHOLD) {
    requiredLevels = DEFAULT_APPROVAL_CONFIG.MEDIUM_BUDGET_LEVELS;
  } else {
    requiredLevels = DEFAULT_APPROVAL_CONFIG.LARGE_BUDGET_LEVELS;
  }

  return requiredLevels.map((level, index) => ({
    id: generateId(),
    requisitionId: requisition.id,
    reviewerId: '', // À assigner dynamiquement
    reviewerName: level === 7 ? 'Administration' : level === 6 ? 'Finance' : 'Direction Générale',
    reviewerLevel: level,
    action: 'pending' as const,
    createdAt: new Date().toISOString(),
    isRequired: true,
    isCompleted: false
  }));
}

// GET - Récupérer les réquisitions
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // VÉRIFICATION DES PERMISSIONS : Seuls niveaux 6, 7, 10 peuvent voir les réquisitions
    if (!canAccessRequisitions(user.level)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Accès non autorisé. Seuls les responsables Finance, Administration et Direction peuvent consulter les réquisitions.',
          userLevel: user.level,
          requiredLevels: [6, 7, 10]
        },
        { status: 403 }
      );
    }

    // Filtrer par entreprise
    const userRequisitions = getRequisitionsByCompany(user.companyId);

    // Filtres optionnels
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const categoryFilter = searchParams.get('category');
    const priorityFilter = searchParams.get('priority');

    let filteredRequisitions = userRequisitions;

    if (statusFilter) {
      filteredRequisitions = filteredRequisitions.filter((req: Requisition) => req.status === statusFilter);
    }

    if (categoryFilter) {
      filteredRequisitions = filteredRequisitions.filter((req: Requisition) => req.category === categoryFilter);
    }

    if (priorityFilter) {
      filteredRequisitions = filteredRequisitions.filter((req: Requisition) => req.priority === priorityFilter);
    }

    return NextResponse.json({
      success: true,
      requisitions: filteredRequisitions,
      totalCount: filteredRequisitions.length,
      userAccess: {
        level: user.level,
        canView: true,
        canApprove: user.level === 6 || user.level === 7 || user.level === 10
      }
    });

  } catch (error) {
    console.error('Erreur GET réquisitions:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle réquisition
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

  // Autoriser tout utilisateur authentifié à créer une réquisition (l'acquisiteur peut être niveau 5)
  // L'accès en lecture/approbation reste limité aux niveaux 6, 7, 10.

    const data: CreateRequisitionData = await req.json();

    // Validation
    if (!data.title || !data.description || !data.category || !data.priority || !data.budget || !data.justification) {
      return NextResponse.json(
        { success: false, error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    if (data.budget <= 0) {
      return NextResponse.json(
        { success: false, error: 'Le budget doit être positif' },
        { status: 400 }
      );
    }

    const newRequisition: Requisition = {
      id: generateId(),
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      budget: data.budget,
      justification: data.justification,
      status: 'soumis',
      requesterId: user.code,
      requesterName: user.name,
      companyId: user.companyId,
      companyCode: user.companyCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workflow: []
    };

    // Créer le workflow d'approbation
    newRequisition.workflow = createWorkflow(newRequisition);

    // Ajouter à la base de données
    addRequisition(newRequisition);

    // Ajouter un log d'audit
    addAuditLog(
      newRequisition.id,
      user.code,
      user.name,
      user.level,
      'created',
      {
        newStatus: 'soumis',
        budget: data.budget,
        category: data.category,
        priority: data.priority
      },
      req.headers.get('x-forwarded-for') || 'unknown',
      req.headers.get('user-agent') || 'unknown'
    );

    // Créer notification email de confirmation pour le demandeur
    if (user.email) {
      const notificationId = createEmailNotification(
        user.email,
        user.name,
        'requisition_created',
        {
          id: newRequisition.id,
          title: newRequisition.title,
          budget: newRequisition.budget,
          status: 'Soumise',
          requesterName: user.name
        },
        'normal'
      );
      
      if (notificationId) {
        console.log(`📧 Notification de création envoyée: ${notificationId} pour ${user.email}`);
      }
    }

    return NextResponse.json({
      success: true,
      requisition: newRequisition,
      message: 'Réquisition créée avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur POST réquisition:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour une réquisition
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    if (!canAccessRequisitions(user.level)) {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requisitionId = searchParams.get('id');

    if (!requisitionId) {
      return NextResponse.json(
        { success: false, error: 'ID de réquisition requis' },
        { status: 400 }
      );
    }

    const data: UpdateRequisitionData = await req.json();

    const allRequisitions = getRequisitions();
    const requisitionIndex = allRequisitions.findIndex((req: Requisition) => 
      req.id === requisitionId && req.companyId === user.companyId
    );

    if (requisitionIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Réquisition non trouvée' },
        { status: 404 }
      );
    }

    const requisition = allRequisitions[requisitionIndex];

    // Seul le demandeur ou un niveau supérieur peut modifier
    if (requisition.requesterId !== user.code && user.level < 7) {
      return NextResponse.json(
        { success: false, error: 'Pas d\'autorisation pour modifier cette réquisition' },
        { status: 403 }
      );
    }

    // Mettre à jour les champs modifiables
    const updates: Partial<Requisition> = {
      updatedAt: new Date().toISOString()
    };
    
    if (data.title) updates.title = data.title;
    if (data.description) updates.description = data.description;
    if (data.category) updates.category = data.category;
    if (data.priority) updates.priority = data.priority;
    if (data.budget) updates.budget = data.budget;
    if (data.justification) updates.justification = data.justification;
    if (data.status) updates.status = data.status;

    // Si le budget change, recréer le workflow
    if (data.budget && data.budget !== requisition.budget) {
      const updatedRequisition = { ...requisition, ...updates };
      updates.workflow = createWorkflow(updatedRequisition);
      // La modification du budget invalide une éventuelle approbation
      updates.approvedAt = undefined;
    }

    // Si le statut est modifié manuellement et n'est plus 'approuve', effacer approvedAt
    if (data.status && data.status !== 'approuve') {
      updates.approvedAt = undefined;
    }

    const updatedRequisition = updateRequisition(requisitionId, updates);

    return NextResponse.json({
      success: true,
      requisition: updatedRequisition,
      message: 'Réquisition mise à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur PUT réquisition:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une réquisition
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requisitionId = searchParams.get('id');

    if (!requisitionId) {
      return NextResponse.json(
        { success: false, error: 'ID de réquisition requis' },
        { status: 400 }
      );
    }

    const allRequisitions = getRequisitions();
    const requisition = allRequisitions.find((req: Requisition) => 
      req.id === requisitionId && req.companyId === user.companyId
    );

    if (!requisition) {
      return NextResponse.json(
        { success: false, error: 'Réquisition non trouvée' },
        { status: 404 }
      );
    }

    // NOUVELLES RÈGLES DE SUPPRESSION :
    // 1. Le demandeur peut supprimer ses propres réquisitions (au cas où il y a une erreur)
    // 2. Les administrateurs (niveau >= 7) peuvent supprimer n'importe quelle réquisition
    // 3. Optionnel : empêcher suppression si déjà approuvée (sauf admin)
    
    const isOwner = requisition.requesterId === user.code;
    const isAdmin = user.level >= 7;
    const isApproved = requisition.status === 'approuve';
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Vous ne pouvez supprimer que vos propres réquisitions' },
        { status: 403 }
      );
    }
    
    // Empêcher la suppression des réquisitions approuvées, sauf pour les admins
    if (isApproved && !isAdmin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Impossible de supprimer une réquisition déjà approuvée. Contactez un administrateur si nécessaire.' 
        },
        { status: 403 }
      );
    }

    // Ajouter un log d'audit avant suppression
    addAuditLog(
      requisition.id,
      user.code,
      user.name,
      user.level,
      'deleted',
      {
        deletedStatus: requisition.status,
        budget: requisition.budget,
        category: requisition.category,
        priority: requisition.priority,
        wasOwner: isOwner,
        wasAdmin: isAdmin
      },
      req.headers.get('x-forwarded-for') || 'unknown',
      req.headers.get('user-agent') || 'unknown'
    );

    // Retirer de la base de données
    const deleted = deleteRequisition(requisitionId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la suppression' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Réquisition "${requisition.title}" supprimée avec succès`,
      deletedBy: {
        name: user.name,
        role: user.levelName,
        isOwner: isOwner,
        isAdmin: isAdmin
      }
    });

  } catch (error) {
    console.error('Erreur DELETE réquisition:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
