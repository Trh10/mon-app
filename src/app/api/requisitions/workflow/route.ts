import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  WorkflowActionData, 
  WorkflowAction,
  canAccessRequisitions,
  canApproveAtLevel,
  Requisition
} from '@/lib/requisitions/requisition-types';
import { getRequisitions, getRequisitionsByCompany, updateRequisition } from '@/lib/requisitions/requisition-store';
import { createEmailNotification } from '@/lib/notifications/email-service';
import { getUsers } from '@/lib/users/user-store';

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

// Envoyer une notification email selon l'action
async function sendWorkflowNotification(
  requisition: Requisition, 
  action: string, 
  approver: any, 
  comment?: string
) {
  try {
    const users = getUsers();
    const requester = users.find(u => u.code === requisition.requesterId);
    
    if (!requester || !requester.email) {
      console.log(`Impossible de trouver l'email du demandeur ${requisition.requesterId}`);
      return;
    }
    
    const variables = {
      id: requisition.id,
      title: requisition.title,
      budget: requisition.budget,
      requesterName: requisition.requesterName,
      approverName: approver.name,
      approvedAt: new Date().toLocaleDateString('fr-FR'),
      rejectedAt: new Date().toLocaleDateString('fr-FR'),
      rejectorName: approver.name,
      comment: comment || '',
      reason: comment || '',
      justification: requisition.justification
    };
    
    let notificationType: string;
    let priority: 'normal' | 'high' = 'normal';
    
    switch (action) {
      case 'approved':
        const remainingSteps = requisition.workflow.filter((step: any) => !step.isCompleted);
        if (remainingSteps.length === 0) {
          notificationType = 'requisition_approved';
          priority = 'high';
        } else {
          // Notification d'avancement (on peut créer un nouveau template pour ça)
          notificationType = 'requisition_approved'; // Pour l'instant, même template
        }
        break;
      case 'rejected':
        notificationType = 'requisition_rejected';
        priority = 'high';
        break;
      default:
        console.log(`Type d'action non supporté pour notification: ${action}`);
        return;
    }
    
    const notificationId = createEmailNotification(
      requester.email,
      requester.name,
      notificationType as any,
      variables,
      priority
    );
    
    if (notificationId) {
      console.log(`📧 Notification email créée: ${notificationId} pour ${requester.email}`);
    } else {
      console.log(`❌ Erreur création notification email pour ${requester.email}`);
    }
  } catch (error) {
    console.error('Erreur envoi notification workflow:', error);
  }
}

// GET - Récupérer les réquisitions en attente d'approbation pour l'utilisateur
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier l'accès aux réquisitions
    if (!canAccessRequisitions(user.level)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Vous n\'êtes pas autorisé à consulter les workflows de réquisition.' 
        },
        { status: 403 }
      );
    }

    // Récupérer toutes les réquisitions de l'entreprise
    const companyRequisitions = getRequisitionsByCompany(user.companyId);

    // Trouver les révisions en attente pour le niveau de l'utilisateur
    const pendingReviews = [];

    for (const requisition of companyRequisitions) {
      // Trouver la première étape non complétée (flux séquentiel)
      const firstIncompleteIndex = requisition.workflow.findIndex((s: any) => !s.isCompleted);
      const firstIncomplete = firstIncompleteIndex >= 0 ? requisition.workflow[firstIncompleteIndex] : null;

      // Cas spécial: DG (10) voit la prochaine étape en attente (la première non complétée)
      // Autres niveaux: ne voient que si cette première étape correspond à leur niveau
      const pendingStep = firstIncomplete && firstIncomplete.action === 'pending'
        ? (user.level === 10
            ? firstIncomplete
            : (firstIncomplete.reviewerLevel === user.level ? firstIncomplete : null))
        : null;

      if (pendingStep) {
        pendingReviews.push({
          requisitionId: requisition.id,
          requisitionTitle: requisition.title,
          requisitionDescription: requisition.description,
          category: requisition.category,
          priority: requisition.priority,
          budget: requisition.budget,
          justification: requisition.justification,
          requesterName: requisition.requesterName,
          requesterId: requisition.requesterId,
          createdAt: requisition.createdAt,
          workflowStepId: pendingStep.id,
          currentStep: pendingStep,
          allSteps: requisition.workflow,
          // Contexte pour aider à la décision
          isFirstApproval: requisition.workflow.filter((s: any) => s.isCompleted).length === 0,
          previousApprovals: requisition.workflow.filter((s: any) => s.isCompleted && s.action === 'approved'),
          totalSteps: requisition.workflow.length
        });
      }
    }

    // Statistiques pour le tableau de bord
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const approvedThisMonthList = companyRequisitions
      .filter((r: any) => r.status === 'approuve' && r.approvedAt && r.approvedAt.startsWith(monthKey))
      .map((r: any) => ({
        id: r.id,
        titre: r.title,
        montant: r.budget,
        date: r.approvedAt,
        approbateur: (r.workflow && r.workflow.length > 0)
          ? (r.workflow[r.workflow.length - 1].reviewerName || 'DG')
          : 'DG'
      }));
    const approvedThisMonth = approvedThisMonthList.reduce((sum: number, r: any) => sum + (r.montant || 0), 0);

  const stats = {
      pendingCount: pendingReviews.length,
      totalRequisitions: companyRequisitions.length,
      byPriority: {
        urgente: pendingReviews.filter(r => r.priority === 'urgente').length,
        haute: pendingReviews.filter(r => r.priority === 'haute').length,
        moyenne: pendingReviews.filter(r => r.priority === 'moyenne').length,
        faible: pendingReviews.filter(r => r.priority === 'faible').length
      },
      byBudgetRange: {
        small: pendingReviews.filter(r => r.budget < 1100).length, // < $1100
        medium: pendingReviews.filter(r => r.budget >= 1100 && r.budget < 5400).length, // $1100-$5400
        large: pendingReviews.filter(r => r.budget >= 5400).length // >= $5400
      },
  approvedTotalThisMonth: approvedThisMonth,
  approvedListThisMonth: approvedThisMonthList
    };

    return NextResponse.json({
      success: true,
      pendingReviews,
      stats,
      userInfo: {
        level: user.level,
        name: user.name,
        canApprove: user.level === 6 || user.level === 7 || user.level === 10
      }
    });

  } catch (error) {
    console.error('Erreur GET workflow:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST - Effectuer une action d'approbation/rejet
export async function POST(req: NextRequest) {
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
        { success: false, error: 'Accès non autorisé aux workflows' },
        { status: 403 }
      );
    }

    const actionData: WorkflowActionData = await req.json();

    // Validation
    if (!actionData.requisitionId || !actionData.action) {
      return NextResponse.json(
        { success: false, error: 'Données d\'action invalides' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected', 'requested_info'].includes(actionData.action)) {
      return NextResponse.json(
        { success: false, error: 'Action non autorisée' },
        { status: 400 }
      );
    }

    // Récupérer les réquisitions
    const allRequisitions = getRequisitions();
    
    const requisitionIndex = allRequisitions.findIndex((req: Requisition) => 
      req.id === actionData.requisitionId && req.companyId === user.companyId
    );

    if (requisitionIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Réquisition non trouvée' },
        { status: 404 }
      );
    }

    const requisition = allRequisitions[requisitionIndex];

    // Trouver l'étape de workflow correspondante
    // Cas spécial DG: il peut approuver la première étape en attente, même si le niveau ne correspond pas
    // Imposer le flux séquentiel: seule la première étape non complétée est actionnable,
    // sauf pour le DG qui peut approuver cette première étape quel que soit le niveau.
    const firstIncompleteIndex = requisition.workflow.findIndex((s: any) => !s.isCompleted);
    const firstIncomplete = firstIncompleteIndex >= 0 ? requisition.workflow[firstIncompleteIndex] : null;

    const workflowStepIndex = (firstIncomplete && firstIncomplete.action === 'pending' &&
      (user.level === 10 || firstIncomplete.reviewerLevel === user.level))
      ? firstIncompleteIndex
      : -1;

    if (workflowStepIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Aucune révision en attente pour votre niveau' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur peut approuver à ce niveau
    if (!canApproveAtLevel(user.level, requisition.workflow[workflowStepIndex].reviewerLevel)) {
      return NextResponse.json(
        { success: false, error: 'Vous n\'êtes pas autorisé à approuver à ce niveau' },
        { status: 403 }
      );
    }

    // Mettre à jour l'étape de workflow
    requisition.workflow[workflowStepIndex] = {
      ...requisition.workflow[workflowStepIndex],
      action: actionData.action,
      comment: actionData.comment || '',
      reviewerId: user.code,
      reviewerName: user.name,
      isCompleted: true,
      completedAt: new Date().toISOString()
    };

    // Mettre à jour le statut de la réquisition selon l'action
    if (actionData.action === 'rejected') {
      requisition.status = 'rejete';
      
      // Envoyer notification de rejet
      await sendWorkflowNotification(requisition, 'rejected', user, actionData.comment);
      
    } else if (actionData.action === 'approved') {
      // Vérifier s'il reste des étapes
      const remainingSteps = requisition.workflow.filter((step: any) => !step.isCompleted);
      
      if (remainingSteps.length === 0) {
        // Toutes les étapes sont terminées - APPROUVÉ DÉFINITIVEMENT
        requisition.status = 'approuve';
        requisition.approvedAt = new Date().toISOString();
        
        // Notification pour l'acquisiteur : DG a approuvé définitivement
        console.log(`🎉 NOTIFICATION ACQUISITEUR: La réquisition "${requisition.title}" a été APPROUVÉE DÉFINITIVEMENT par le Directeur Général.`);
        console.log(`📧 Email automatique envoyé à ${requisition.requesterName} (${requisition.requesterId})`);
        
        // Envoyer notification d'approbation finale
        await sendWorkflowNotification(requisition, 'approved', user, actionData.comment);
        
      } else {
        // Il reste des étapes
        requisition.status = 'en_review';
        
        // Si c'est le DG qui vient d'approuver, informer l'acquisiteur de l'avancement
        if (user.level === 10) {
          console.log(`📋 NOTIFICATION ACQUISITEUR: Le Directeur Général a approuvé la réquisition "${requisition.title}". Elle passe maintenant aux étapes suivantes.`);
          console.log(`📧 Email de progression envoyé à ${requisition.requesterName} (${requisition.requesterId})`);
          
          // Pour l'instant, on envoie aussi une notification d'approbation
          await sendWorkflowNotification(requisition, 'approved', user, actionData.comment);
        }
      }
    } else if (actionData.action === 'requested_info') {
  requisition.status = 'en_review';
  requisition.approvedAt = undefined;
      
      // Notification pour l'acquisiteur : information demandée
      console.log(`❓ NOTIFICATION ACQUISITEUR: ${user.levelName} demande des informations supplémentaires sur "${requisition.title}"`);
      console.log(`📧 Email d'information envoyé à ${requisition.requesterName} (${requisition.requesterId})`);
    }

    requisition.updatedAt = new Date().toISOString();

  // Sauvegarder les modifications de façon persistante
  updateRequisition(requisition.id, requisition);

    // Préparer la réponse avec les informations de workflow
    const remainingApprovals = requisition.workflow.filter((step: any) => !step.isCompleted);
    const completedApprovals = requisition.workflow.filter((step: any) => step.isCompleted);

    // Message spécial si DG approuve définitivement
    let message = `Réquisition ${actionData.action === 'approved' ? 'approuvée' : 
                                  actionData.action === 'rejected' ? 'rejetée' : 
                                  'commentée'} avec succès`;
                                  
    if (actionData.action === 'approved' && remainingApprovals.length === 0) {
      message = `🎉 Réquisition APPROUVÉE DÉFINITIVEMENT ! L'acquisiteur ${requisition.requesterName} sera notifié.`;
    } else if (actionData.action === 'approved' && user.level === 10) {
      message = `✅ Approbation du Directeur Général enregistrée. L'acquisiteur ${requisition.requesterName} sera informé de l'avancement.`;
    }

    return NextResponse.json({
      success: true,
      message,
      requesterNotification: {
        shouldNotify: true,
        requesterName: requisition.requesterName,
        requesterId: requisition.requesterId,
        notificationType: actionData.action === 'approved' && remainingApprovals.length === 0 ? 'final_approval' : 
                         actionData.action === 'approved' ? 'approval_progress' : 
                         actionData.action === 'rejected' ? 'rejection' : 'info_request',
        message: actionData.action === 'approved' && remainingApprovals.length === 0 ? 
                 `Votre réquisition "${requisition.title}" a été approuvée définitivement par le Directeur Général !` :
                 actionData.action === 'approved' ? 
                 `Votre réquisition "${requisition.title}" a été approuvée par ${user.levelName}. Elle continue son processus d'approbation.` :
                 actionData.action === 'rejected' ?
                 `Votre réquisition "${requisition.title}" a été rejetée par ${user.levelName}.` :
                 `${user.levelName} demande des informations supplémentaires sur votre réquisition "${requisition.title}".`
      },
      requisition: {
        id: requisition.id,
        title: requisition.title,
        status: requisition.status,
        budget: requisition.budget
      },
      workflow: {
        currentStep: workflowStepIndex + 1,
        totalSteps: requisition.workflow.length,
        isComplete: remainingApprovals.length === 0,
        remainingApprovals: remainingApprovals.length,
        completedApprovals: completedApprovals.length,
        nextApprover: remainingApprovals.length > 0 ? 
          remainingApprovals[0].reviewerName : null
      },
      actionTaken: {
        action: actionData.action,
        by: user.name,
        level: user.level,
        at: new Date().toISOString(),
        comment: actionData.comment
      }
    });

  } catch (error) {
    console.error('Erreur POST workflow action:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
