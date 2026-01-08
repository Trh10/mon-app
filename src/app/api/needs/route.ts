import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { 
  CreateNeedData, 
  UpdateNeedData, 
  DEFAULT_APPROVAL_CONFIG 
} from '@/lib/needs/need-types';

// Récupérer l'organizationId avec fallback
async function getOrganizationId(req: NextRequest): Promise<number | null> {
  try {
    // 1. Essayer la session
    const session = await getSession(req);
    if (session?.organizationId) {
      return session.organizationId;
    }

    // 2. Essayer le cookie
    const cookieStore = cookies();
    const orgCookie = cookieStore.get('organizationId');
    if (orgCookie?.value) {
      return parseInt(orgCookie.value, 10);
    }

    // 3. Fallback: première organisation
    const firstOrg = await prisma.organization.findFirst();
    return firstOrg?.id || null;
  } catch (error) {
    console.error('Erreur getOrganizationId:', error);
    return null;
  }
}

// Récupérer l'utilisateur actuel
async function getCurrentUser(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.userId) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId }
      });
      return user;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Créer le workflow d'approbation basé sur le budget
function createWorkflowSteps(budget: number): Array<{
  reviewerName: string;
  reviewerLevel: number;
  action: string;
  isRequired: boolean;
  isCompleted: boolean;
}> {
  const steps: Array<{
    reviewerName: string;
    reviewerLevel: number;
    action: string;
    isRequired: boolean;
    isCompleted: boolean;
  }> = [];

  const needsAdminReview = budget >= DEFAULT_APPROVAL_CONFIG.level7_required;
  const needsFinanceReview = budget >= DEFAULT_APPROVAL_CONFIG.level6_required;
  const needsDGApproval = budget >= DEFAULT_APPROVAL_CONFIG.level10_required;

  if (needsAdminReview) {
    steps.push({
      reviewerName: 'Administration',
      reviewerLevel: 7,
      action: 'pending',
      isRequired: true,
      isCompleted: false
    });
  }

  if (needsFinanceReview) {
    steps.push({
      reviewerName: 'Finance',
      reviewerLevel: 6,
      action: 'pending',
      isRequired: true,
      isCompleted: false
    });
  }

  if (needsDGApproval) {
    steps.push({
      reviewerName: 'Directeur Général',
      reviewerLevel: 10,
      action: 'pending',
      isRequired: true,
      isCompleted: false
    });
  }

  // Si aucune approbation requise, auto-approbation
  if (steps.length === 0) {
    steps.push({
      reviewerName: 'Approbation automatique',
      reviewerLevel: 5,
      action: 'approved',
      isRequired: true,
      isCompleted: true
    });
  }

  return steps;
}

// GET - Récupérer les besoins
export async function GET(req: NextRequest) {
  try {
    const organizationId = await getOrganizationId(req);
    
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        message: 'Organisation non trouvée'
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');

    // Construire le filtre
    const where: any = { organizationId };
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    const needs = await prisma.need.findMany({
      where,
      include: {
        workflow: true,
        attachments: true,
        requester: {
          select: {
            id: true,
            name: true,
            displayName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transformer pour compatibilité avec le format attendu
    const formattedNeeds = needs.map(need => ({
      id: need.id,
      title: need.title,
      description: need.description,
      category: need.category,
      priority: need.priority,
      budget: need.budget,
      justification: need.justification || '',
      status: need.status,
      requesterId: need.requesterId?.toString() || '',
      requesterName: need.requesterName || need.requester?.name || need.requester?.displayName || 'Inconnu',
      companyId: need.organizationId.toString(),
      companyCode: 'ORG',
      createdAt: need.createdAt.toISOString(),
      updatedAt: need.updatedAt.toISOString(),
      workflow: need.workflow.map(step => ({
        id: step.id,
        needId: step.needId,
        reviewerId: step.reviewerId?.toString() || '',
        reviewerName: step.reviewerName,
        reviewerLevel: step.reviewerLevel,
        action: step.action,
        comment: step.comment,
        createdAt: step.createdAt.toISOString(),
        isRequired: step.isRequired,
        isCompleted: step.isCompleted
      })),
      attachments: need.attachments.map(att => ({
        id: att.id,
        needId: att.needId,
        fileName: att.fileName,
        fileSize: att.fileSize,
        fileType: att.fileType,
        uploadedBy: att.uploadedBy,
        uploadedAt: att.createdAt.toISOString(),
        url: att.url
      }))
    }));

    return NextResponse.json({
      success: true,
      needs: formattedNeeds
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
    const organizationId = await getOrganizationId(req);
    
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        message: 'Organisation non trouvée'
      }, { status: 401 });
    }

    const currentUser = await getCurrentUser(req);
    const needData: CreateNeedData = await req.json();

    // Validation des données
    if (!needData.title || !needData.description || !needData.category) {
      return NextResponse.json({
        success: false,
        message: 'Données manquantes (titre, description et catégorie requis)'
      }, { status: 400 });
    }

    if (needData.budget < 0) {
      return NextResponse.json({
        success: false,
        message: 'Le budget ne peut pas être négatif'
      }, { status: 400 });
    }

    // Créer les étapes de workflow
    const workflowSteps = createWorkflowSteps(needData.budget);

    // Déterminer le statut initial
    const initialStatus = workflowSteps.length === 1 && workflowSteps[0].action === 'approved'
      ? 'approuve'
      : 'soumis';

    // Créer le besoin avec ses étapes de workflow
    const newNeed = await prisma.need.create({
      data: {
        title: needData.title,
        description: needData.description,
        category: needData.category,
        priority: needData.priority,
        budget: needData.budget,
        justification: needData.justification || '',
        status: initialStatus,
        requesterId: currentUser?.id || null,
        requesterName: currentUser?.name || currentUser?.displayName || 'Utilisateur',
        organizationId,
        workflow: {
          create: workflowSteps
        }
      },
      include: {
        workflow: true,
        attachments: true
      }
    });

    console.log('Nouveau besoin créé:', newNeed.id);

    return NextResponse.json({
      success: true,
      message: 'Besoin créé avec succès',
      need: {
        id: newNeed.id,
        title: newNeed.title,
        description: newNeed.description,
        category: newNeed.category,
        priority: newNeed.priority,
        budget: newNeed.budget,
        justification: newNeed.justification,
        status: newNeed.status,
        requesterId: newNeed.requesterId?.toString() || '',
        requesterName: newNeed.requesterName || 'Utilisateur',
        companyId: newNeed.organizationId.toString(),
        companyCode: 'ORG',
        createdAt: newNeed.createdAt.toISOString(),
        updatedAt: newNeed.updatedAt.toISOString(),
        workflow: newNeed.workflow.map(step => ({
          id: step.id,
          needId: step.needId,
          reviewerId: step.reviewerId?.toString() || '',
          reviewerName: step.reviewerName,
          reviewerLevel: step.reviewerLevel,
          action: step.action,
          comment: step.comment,
          createdAt: step.createdAt.toISOString(),
          isRequired: step.isRequired,
          isCompleted: step.isCompleted
        })),
        attachments: []
      }
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
    const organizationId = await getOrganizationId(req);
    
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        message: 'Organisation non trouvée'
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

    // Vérifier que le besoin existe et appartient à l'organisation
    const existingNeed = await prisma.need.findFirst({
      where: {
        id: needId,
        organizationId
      }
    });

    if (!existingNeed) {
      return NextResponse.json({
        success: false,
        message: 'Besoin non trouvé'
      }, { status: 404 });
    }

    const updateData: UpdateNeedData = await req.json();

    // Mettre à jour le besoin
    const updatedNeed = await prisma.need.update({
      where: { id: needId },
      data: {
        ...(updateData.title && { title: updateData.title }),
        ...(updateData.description && { description: updateData.description }),
        ...(updateData.category && { category: updateData.category }),
        ...(updateData.priority && { priority: updateData.priority }),
        ...(updateData.budget !== undefined && { budget: updateData.budget }),
        ...(updateData.justification && { justification: updateData.justification }),
        ...(updateData.status && { status: updateData.status })
      },
      include: {
        workflow: true,
        attachments: true
      }
    });

    console.log('Besoin mis à jour:', updatedNeed.id);

    return NextResponse.json({
      success: true,
      message: 'Besoin mis à jour avec succès',
      need: {
        id: updatedNeed.id,
        title: updatedNeed.title,
        description: updatedNeed.description,
        category: updatedNeed.category,
        priority: updatedNeed.priority,
        budget: updatedNeed.budget,
        justification: updatedNeed.justification,
        status: updatedNeed.status,
        requesterId: updatedNeed.requesterId?.toString() || '',
        requesterName: updatedNeed.requesterName || 'Utilisateur',
        companyId: updatedNeed.organizationId.toString(),
        companyCode: 'ORG',
        createdAt: updatedNeed.createdAt.toISOString(),
        updatedAt: updatedNeed.updatedAt.toISOString(),
        workflow: updatedNeed.workflow.map(step => ({
          id: step.id,
          needId: step.needId,
          reviewerId: step.reviewerId?.toString() || '',
          reviewerName: step.reviewerName,
          reviewerLevel: step.reviewerLevel,
          action: step.action,
          comment: step.comment,
          createdAt: step.createdAt.toISOString(),
          isRequired: step.isRequired,
          isCompleted: step.isCompleted
        })),
        attachments: updatedNeed.attachments.map(att => ({
          id: att.id,
          needId: att.needId,
          fileName: att.fileName,
          fileSize: att.fileSize,
          fileType: att.fileType,
          uploadedBy: att.uploadedBy,
          uploadedAt: att.createdAt.toISOString(),
          url: att.url
        }))
      }
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
    const organizationId = await getOrganizationId(req);
    
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        message: 'Organisation non trouvée'
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

    // Vérifier que le besoin existe et appartient à l'organisation
    const existingNeed = await prisma.need.findFirst({
      where: {
        id: needId,
        organizationId
      }
    });

    if (!existingNeed) {
      return NextResponse.json({
        success: false,
        message: 'Besoin non trouvé'
      }, { status: 404 });
    }

    // Supprimer le besoin (les relations seront supprimées automatiquement grâce à onDelete: Cascade)
    await prisma.need.delete({
      where: { id: needId }
    });

    console.log('Besoin supprimé:', needId);

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
