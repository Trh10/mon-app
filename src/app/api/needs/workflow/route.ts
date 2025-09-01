import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Need, WorkflowActionData, WorkflowAction } from '@/lib/needs/need-types';

// Base de données partagée avec l'API needs
let needs: Need[] = [];

// Générer un ID unique
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Récupérer l'utilisateur actuel
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

// POST - Effectuer une action de workflow (approuver, rejeter, commenter)
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        message: 'Non authentifié'
      }, { status: 401 });
    }

    const actionData: WorkflowActionData = await req.json();

    if (!actionData.needId || !actionData.action) {
      return NextResponse.json({
        success: false,
        message: 'Données manquantes'
      }, { status: 400 });
    }

    // Trouver le besoin
    const needIndex = needs.findIndex(n => 
      n.id === actionData.needId && n.companyId === currentUser.companyId
    );

    if (needIndex === -1) {
      return NextResponse.json({
        success: false,
        message: 'Besoin non trouvé'
      }, { status: 404 });
    }

    const need = needs[needIndex];

    // Vérifier les permissions selon le niveau
    const canReview = 
      currentUser.permissions.includes('all') || // DG peut tout faire
      (currentUser.level === 7 && currentUser.permissions.includes('view_needs')) || // Admin
      (currentUser.level === 6 && currentUser.permissions.includes('financial_review')); // Finance

    if (!canReview) {
      return NextResponse.json({
        success: false,
        message: 'Permission insuffisante'
      }, { status: 403 });
    }

    // Trouver l'étape de workflow correspondante au niveau de l'utilisateur
    const workflowStep = need.workflow.find(step => 
      step.reviewerLevel === currentUser.level && !step.isCompleted
    );

    if (!workflowStep) {
      return NextResponse.json({
        success: false,
        message: 'Aucune action de workflow en attente pour votre niveau'
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Mettre à jour l'étape de workflow
    workflowStep.action = actionData.action;
    workflowStep.comment = actionData.comment;
    workflowStep.reviewerId = currentUser.id;
    workflowStep.reviewerName = currentUser.name;
    workflowStep.createdAt = now;
    workflowStep.isCompleted = true;

    // Déterminer le nouveau statut du besoin
    let newStatus = need.status;

    if (actionData.action === 'rejected') {
      newStatus = 'rejete';
    } else if (actionData.action === 'approved') {
      // Vérifier si toutes les étapes requises sont complétées
      const allStepsCompleted = need.workflow
        .filter(step => step.isRequired)
        .every(step => step.isCompleted && step.action === 'approved');

      if (allStepsCompleted) {
        newStatus = 'approuve';
      } else {
        newStatus = 'en_review';
      }
    } else if (actionData.action === 'requested_info') {
      newStatus = 'en_review';
    }

    // Mettre à jour le besoin
    need.status = newStatus;
    need.updatedAt = now;

    console.log(`Action workflow: ${actionData.action} sur besoin ${need.id} par ${currentUser.name}`);

    return NextResponse.json({
      success: true,
      message: `Action ${actionData.action} enregistrée avec succès`,
      need: need
    });

  } catch (error) {
    console.error('Erreur POST workflow:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur serveur'
    }, { status: 500 });
  }
}

// GET - Récupérer les besoins en attente de review pour l'utilisateur actuel
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        message: 'Non authentifié'
      }, { status: 401 });
    }

    // Filtrer les besoins par entreprise
    const companyNeeds = needs.filter(need => need.companyId === currentUser.companyId);

    // Trouver les besoins en attente de review pour ce niveau d'utilisateur
    const pendingNeeds = companyNeeds.filter(need => {
      return need.workflow.some(step => 
        step.reviewerLevel === currentUser.level && 
        !step.isCompleted &&
        step.action === 'pending'
      );
    });

    // Trier par priorité puis par date
    pendingNeeds.sort((a, b) => {
      const priorityOrder = { 'urgente': 4, 'haute': 3, 'moyenne': 2, 'faible': 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Priorité décroissante
      }
      
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // Date croissante
    });

    return NextResponse.json({
      success: true,
      needs: pendingNeeds,
      count: pendingNeeds.length
    });

  } catch (error) {
    console.error('Erreur GET workflow:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur serveur'
    }, { status: 500 });
  }
}
