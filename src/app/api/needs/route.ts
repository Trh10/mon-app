import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  Need, 
  CreateNeedData, 
  UpdateNeedData, 
  WorkflowStep, 
  NeedStatus,
  DEFAULT_APPROVAL_CONFIG 
} from '@/lib/needs/need-types';

// Base de données en mémoire pour les besoins
let needs: Need[] = [
  {
    id: '1',
    title: 'Nouveaux ordinateurs portables',
    description: 'Achat de 5 ordinateurs portables pour l\'équipe développement',
    category: 'materiel',
    priority: 'haute',
    budget: 7500,
    justification: 'Les ordinateurs actuels sont obsolètes et ralentissent la productivité',
    requesterId: 'SOKO-1001',
    requesterName: 'Jean Dupont',
    companyId: 'zypuduz7t',
    companyCode: 'SOKO',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'soumis',
    workflow: [
      {
        id: 'w1',
        needId: '1',
        reviewerId: 'SOKO-1003',
        reviewerName: 'Marie Admin',
        reviewerLevel: 7,
        action: 'pending',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        isRequired: true,
        isCompleted: false
      }
    ]
  },
  {
    id: '2',
    title: 'Formation TypeScript',
    description: 'Formation avancée TypeScript pour 3 développeurs',
    category: 'formation',
    priority: 'moyenne',
    budget: 1200,
    justification: 'Montée en compétences sur les dernières technologies',
    requesterId: 'SOKO-1002',
    requesterName: 'Paul Martin',
    companyId: 'zypuduz7t',
    companyCode: 'SOKO',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    status: 'approuve',
    workflow: [
      {
        id: 'w2',
        needId: '2',
        reviewerId: 'SOKO-1003',
        reviewerName: 'Marie Admin',
        reviewerLevel: 7,
        action: 'approved',
        comment: 'Formation nécessaire pour les nouveaux projets',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        isRequired: true,
        isCompleted: true
      }
    ]
  },
  {
    id: '3',
    title: 'Serveur de développement',
    description: 'Serveur dédié pour l\'environnement de test',
    category: 'materiel',
    priority: 'haute',
    budget: 12000,
    justification: 'Infrastructure nécessaire pour les nouveaux projets',
    requesterId: 'SOKO-1001',
    requesterName: 'Jean Dupont',
    companyId: 'zypuduz7t',
    companyCode: 'SOKO',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    status: 'en_review',
    workflow: [
      {
        id: 'w3a',
        needId: '3',
        reviewerId: 'SOKO-1003',
        reviewerName: 'Marie Admin',
        reviewerLevel: 7,
        action: 'approved',
        comment: 'Approuvé par l\'administration',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        isRequired: true,
        isCompleted: true
      },
      {
        id: 'w3b',
        needId: '3',
        reviewerId: 'SOKO-1004',
        reviewerName: 'Sophie Finance',
        reviewerLevel: 6,
        action: 'pending',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRequired: true,
        isCompleted: false
      }
    ]
  }
];

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
    return null;
  }
}

// Créer le workflow d'approbation basé sur le budget et la hiérarchie
function createWorkflow(budget: number, companyId: string, requesterId: string): WorkflowStep[] {
  const workflow: WorkflowStep[] = [];
  const now = new Date().toISOString();

  // Règles d'approbation basées sur le budget
  const needsAdminReview = budget >= DEFAULT_APPROVAL_CONFIG.level7_required;
  const needsFinanceReview = budget >= DEFAULT_APPROVAL_CONFIG.level6_required;
  const needsDGApproval = budget >= DEFAULT_APPROVAL_CONFIG.level10_required;

  // Étape 1: Review Admin (si nécessaire)
  if (needsAdminReview) {
    workflow.push({
      id: generateId(),
      needId: '', // Sera défini plus tard
      reviewerId: '', // Sera défini par le système selon les admins disponibles
      reviewerName: 'Administration',
      reviewerLevel: 7,
      action: 'pending',
      createdAt: now,
      isRequired: true,
      isCompleted: false
    });
  }

  // Étape 2: Review Finance (si nécessaire)
  if (needsFinanceReview) {
    workflow.push({
      id: generateId(),
      needId: '',
      reviewerId: '',
      reviewerName: 'Finance',
      reviewerLevel: 6,
      action: 'pending',
      createdAt: now,
      isRequired: true,
      isCompleted: false
    });
  }

  // Étape 3: Approbation DG (si nécessaire)
  if (needsDGApproval) {
    workflow.push({
      id: generateId(),
      needId: '',
      reviewerId: '',
      reviewerName: 'Directeur Général',
      reviewerLevel: 10,
      action: 'pending',
      createdAt: now,
      isRequired: true,
      isCompleted: false
    });
  }

  // Si aucune approbation spéciale requise, approbation automatique
  if (!needsAdminReview && !needsFinanceReview && !needsDGApproval) {
    workflow.push({
      id: generateId(),
      needId: '',
      reviewerId: 'auto',
      reviewerName: 'Approbation automatique',
      reviewerLevel: 5,
      action: 'approved',
      createdAt: now,
      isRequired: true,
      isCompleted: true
    });
  }

  return workflow;
}

// GET - Récupérer les besoins
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        message: 'Non authentifié'
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');

    // Filtrer les besoins par entreprise
    let companyNeeds = needs.filter(need => need.companyId === currentUser.companyId);

    // Filtres supplémentaires
    if (status) {
      companyNeeds = companyNeeds.filter(need => need.status === status);
    }
    if (category) {
      companyNeeds = companyNeeds.filter(need => need.category === category);
    }
    if (priority) {
      companyNeeds = companyNeeds.filter(need => need.priority === priority);
    }

    // Permissions : Employés voient seulement leurs besoins
    if (currentUser.level === 5) {
      companyNeeds = companyNeeds.filter(need => need.requesterId === currentUser.id);
    }

    // Trier par date de création (plus récent en premier)
    companyNeeds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      needs: companyNeeds
    });

  } catch (error) {
    console.error('Erreur GET needs:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur serveur'
    }, { status: 500 });
  }
}

// POST - Créer un nouveau besoin
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        message: 'Non authentifié'
      }, { status: 401 });
    }

    // Vérifier les permissions de création
    if (!currentUser.permissions.includes('create_needs') && !currentUser.permissions.includes('all')) {
      return NextResponse.json({
        success: false,
        message: 'Permission insuffisante'
      }, { status: 403 });
    }

    const needData: CreateNeedData = await req.json();

    // Validation des données
    if (!needData.title || !needData.description || !needData.category) {
      return NextResponse.json({
        success: false,
        message: 'Données manquantes'
      }, { status: 400 });
    }

    if (needData.budget < 0) {
      return NextResponse.json({
        success: false,
        message: 'Le budget ne peut pas être négatif'
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const needId = generateId();

    // Créer le workflow d'approbation
    const workflow = createWorkflow(needData.budget, currentUser.companyId, currentUser.id);
    
    // Mettre à jour les IDs du workflow
    workflow.forEach(step => {
      step.needId = needId;
    });

    // Déterminer le statut initial
    const initialStatus: NeedStatus = workflow.length > 0 && workflow[0].action === 'approved' 
      ? 'approuve' 
      : 'soumis';

    const newNeed: Need = {
      id: needId,
      title: needData.title,
      description: needData.description,
      category: needData.category,
      priority: needData.priority,
      budget: needData.budget,
      justification: needData.justification,
      status: initialStatus,
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      companyId: currentUser.companyId,
      companyCode: currentUser.companyCode,
      createdAt: now,
      updatedAt: now,
      workflow: workflow,
      attachments: []
    };

    needs.push(newNeed);

    console.log('Nouveau besoin créé:', newNeed);

    return NextResponse.json({
      success: true,
      message: 'Besoin créé avec succès',
      need: newNeed
    });

  } catch (error) {
    console.error('Erreur POST needs:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur serveur'
    }, { status: 500 });
  }
}

// PUT - Mettre à jour un besoin
export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        message: 'Non authentifié'
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const needId = searchParams.get('id');

    if (!needId) {
      return NextResponse.json({
        success: false,
        message: 'ID du besoin requis'
      }, { status: 400 });
    }

    const needIndex = needs.findIndex(n => 
      n.id === needId && n.companyId === currentUser.companyId
    );

    if (needIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Besoin non trouvé'
      }, { status: 404 });
    }

    const need = needs[needIndex];

    // Vérifier les permissions de modification
    const canEdit = 
      need.requesterId === currentUser.id ||  // Créateur du besoin
      currentUser.permissions.includes('all') || // DG
      (currentUser.level >= 7 && currentUser.permissions.includes('admin_review')); // Admin

    if (!canEdit) {
      return NextResponse.json({
        success: false,
        message: 'Permission insuffisante'
      }, { status: 403 });
    }

    // Seuls les besoins en brouillon peuvent être modifiés entièrement
    if (need.status !== 'brouillon' && need.requesterId === currentUser.id) {
      return NextResponse.json({
        success: false,
        message: 'Impossible de modifier un besoin déjà soumis'
      }, { status: 400 });
    }

    const updateData: UpdateNeedData = await req.json();

    // Mettre à jour les champs
    if (updateData.title) need.title = updateData.title;
    if (updateData.description) need.description = updateData.description;
    if (updateData.category) need.category = updateData.category;
    if (updateData.priority) need.priority = updateData.priority;
    if (updateData.budget !== undefined) need.budget = updateData.budget;
    if (updateData.justification) need.justification = updateData.justification;
    if (updateData.status) need.status = updateData.status;

    need.updatedAt = new Date().toISOString();

    console.log('Besoin mis à jour:', need);

    return NextResponse.json({
      success: true,
      message: 'Besoin mis à jour avec succès',
      need: need
    });

  } catch (error) {
    console.error('Erreur PUT needs:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur serveur'
    }, { status: 500 });
  }
}

// DELETE - Supprimer un besoin
export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        message: 'Non authentifié'
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const needId = searchParams.get('id');

    if (!needId) {
      return NextResponse.json({
        success: false,
        message: 'ID du besoin requis'
      }, { status: 400 });
    }

    const needIndex = needs.findIndex(n => 
      n.id === needId && n.companyId === currentUser.companyId
    );

    if (needIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Besoin non trouvé'
      }, { status: 404 });
    }

    const need = needs[needIndex];

    // Seul le créateur ou un DG peut supprimer
    const canDelete = 
      need.requesterId === currentUser.id ||
      currentUser.permissions.includes('all');

    if (!canDelete) {
      return NextResponse.json({
        success: false,
        message: 'Permission insuffisante'
      }, { status: 403 });
    }

    // Seuls les besoins en brouillon peuvent être supprimés
    if (need.status !== 'brouillon') {
      return NextResponse.json({
        success: false,
        message: 'Impossible de supprimer un besoin déjà soumis'
      }, { status: 400 });
    }

    const deletedNeed = needs.splice(needIndex, 1)[0];

    console.log('Besoin supprimé:', deletedNeed);

    return NextResponse.json({
      success: true,
      message: 'Besoin supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur DELETE needs:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur serveur'
    }, { status: 500 });
  }
}
