import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRequisitions } from '@/lib/requisitions/requisition-store';
import { Requisition } from '@/lib/requisitions/requisition-types';

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

// GET - Récupérer les réquisitions de l'utilisateur connecté
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer toutes les réquisitions
    const allRequisitions = getRequisitions();
    
    // Filtrer les réquisitions de l'utilisateur connecté
    const userRequisitions = allRequisitions.filter((req: Requisition) => 
      req.requesterId === user.code && req.companyId === user.companyId
    );

    // Calculer des statistiques
    const stats = {
      total: userRequisitions.length,
      en_attente: userRequisitions.filter(r => r.status === 'soumis').length,
      en_review: userRequisitions.filter(r => r.status === 'en_review').length,
      approuvees: userRequisitions.filter(r => r.status === 'approuve').length,
      rejetees: userRequisitions.filter(r => r.status === 'rejete').length,
      budget_total: userRequisitions.reduce((sum, r) => sum + r.budget, 0),
      budget_approuve: userRequisitions
        .filter(r => r.status === 'approuve')
        .reduce((sum, r) => sum + r.budget, 0)
    };

    // Enrichir les réquisitions avec des informations de workflow
    const enrichedRequisitions = userRequisitions.map((requisition: Requisition) => {
      const completedSteps = requisition.workflow.filter(step => step.isCompleted);
      const pendingSteps = requisition.workflow.filter(step => !step.isCompleted);
      const nextApprover = pendingSteps.length > 0 ? pendingSteps[0] : null;
      const lastApprover = completedSteps.length > 0 ? completedSteps[completedSteps.length - 1] : null;

      return {
        ...requisition,
        workflowInfo: {
          totalSteps: requisition.workflow.length,
          completedSteps: completedSteps.length,
          progress: Math.round((completedSteps.length / requisition.workflow.length) * 100),
          nextApprover: nextApprover ? {
            name: nextApprover.reviewerName,
            level: nextApprover.reviewerLevel
          } : null,
          lastApprover: lastApprover ? {
            name: lastApprover.reviewerName,
            level: lastApprover.reviewerLevel,
            action: lastApprover.action,
            comment: lastApprover.comment,
            date: lastApprover.completedAt
          } : null,
          approvalHistory: completedSteps.map((step: any) => ({
            approver: step.reviewerName,
            level: step.reviewerLevel,
            action: step.action,
            comment: step.comment,
            date: step.completedAt
          }))
        }
      };
    });

    // Trier par date de création (plus récent en premier)
    enrichedRequisitions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        requisitions: enrichedRequisitions,
        stats,
        user: {
          name: user.name,
          code: user.code,
          level: user.level,
          levelName: user.levelName
        }
      }
    });

  } catch (error) {
    console.error('Erreur GET my-requests:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
