export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';

// GET - Récupérer les réquisitions de l'utilisateur connecté
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    
    if (!session.organizationId || !session.userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const db: any = prisma;
    // Récupérer les réquisitions de l'utilisateur connecté
    const userRequisitions = await db.requisition.findMany({
      where: { 
        organizationId: session.organizationId,
        requesterId: session.userId
      },
      include: {
        workflow: {
          orderBy: { reviewerLevel: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculer des statistiques
    const stats = {
      total: userRequisitions.length,
      en_attente: userRequisitions.filter((r: any) => r.status === 'soumis').length,
      en_review: userRequisitions.filter((r: any) => r.status === 'en_review').length,
      approuvees: userRequisitions.filter((r: any) => r.status === 'approuve').length,
      rejetees: userRequisitions.filter((r: any) => r.status === 'rejete').length,
      budget_total: userRequisitions.reduce((sum: number, r: any) => sum + r.budget, 0),
      budget_approuve: userRequisitions
        .filter((r: any) => r.status === 'approuve')
        .reduce((sum: number, r: any) => sum + r.budget, 0)
    };

    // Enrichir les réquisitions avec des informations de workflow
    const enrichedRequisitions = userRequisitions.map((requisition: any) => {
      const completedSteps = requisition.workflow.filter((step: any) => step.isCompleted);
      const pendingSteps = requisition.workflow.filter((step: any) => !step.isCompleted);
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
    enrichedRequisitions.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        requisitions: enrichedRequisitions,
        stats,
        user: {
          name: session.userName || 'Utilisateur',
          userId: session.userId,
          role: session.userRole
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
