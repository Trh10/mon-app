import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import {
  CreateRequisitionData,
  UpdateRequisitionData,
  DEFAULT_APPROVAL_CONFIG,
} from '@/lib/requisitions/requisition-types';
import { jsonSafe } from '@/lib/json';
// Prisma client may lag types after schema edits in editor; use local alias to avoid transient TS errors
const db: any = prisma as any;

// Récupérer l'utilisateur actuel depuis la session + BD
async function requireAuthedContext(req: NextRequest) {
  const session = await getSession(req);
  if (!session.organizationId || !session.userId) return null;
  const [org, user] = await Promise.all([
    prisma.organization.findUnique({ where: { id: session.organizationId } }),
    prisma.user.findUnique({ where: { id: session.userId } }),
  ]);
  if (!org || !user) return null;
  return { session, org, user };
}

// (Le workflow est calculé dynamiquement lors de la création/mise à jour)

// GET - Récupérer les réquisitions
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuthedContext(req);
    if (!ctx) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    // Filtres optionnels
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const categoryFilter = searchParams.get('category');
    const priorityFilter = searchParams.get('priority');

    const where: any = { organizationId: ctx.session.organizationId };
    if (statusFilter) where.status = statusFilter;
    if (categoryFilter) where.category = categoryFilter;
    if (priorityFilter) where.priority = priorityFilter;

    const list = await db.requisition.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { requester: true, workflow: { orderBy: { createdAt: 'asc' } } },
    });

    const shaped = list.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      priority: r.priority,
      budget: r.budget,
      justification: r.justification,
      status: r.status,
      requesterId: r.requesterId ? String(r.requesterId) : '',
      requesterName: r.requester?.displayName || r.requester?.name || '',
      companyId: String(r.organizationId),
      companyCode: ctx.org.slug,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      approvedAt: r.approvedAt ? r.approvedAt.toISOString() : undefined,
  workflow: r.workflow.map((w: any) => ({
        id: w.id,
        requisitionId: w.requisitionId,
        reviewerId: w.reviewerId ? String(w.reviewerId) : '',
        reviewerName: w.reviewerName,
        reviewerLevel: w.reviewerLevel,
        action: w.action as any,
        comment: w.comment || undefined,
        createdAt: w.createdAt.toISOString(),
        completedAt: w.completedAt ? w.completedAt.toISOString() : undefined,
        isRequired: w.isRequired,
        isCompleted: w.isCompleted,
      })),
      attachments: [],
    }));

    return NextResponse.json(jsonSafe({
      success: true,
      requisitions: shaped,
      totalCount: shaped.length,
      userAccess: {
        level: undefined,
        canView: true,
        canApprove: false,
      },
    }));

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
    const ctx = await requireAuthedContext(req);
    if (!ctx) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });

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

    // Créer en BD
  const created = await db.requisition.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        budget: data.budget,
        justification: data.justification,
        status: 'soumis',
        requesterId: ctx.user.id,
        organizationId: ctx.session.organizationId,
      },
    });

    // Créer le workflow d'approbation
    const stepsLevels = ((): number[] => {
      if (data.budget < DEFAULT_APPROVAL_CONFIG.SMALL_BUDGET_THRESHOLD) return DEFAULT_APPROVAL_CONFIG.SMALL_BUDGET_LEVELS;
      if (data.budget < DEFAULT_APPROVAL_CONFIG.MEDIUM_BUDGET_THRESHOLD) return DEFAULT_APPROVAL_CONFIG.MEDIUM_BUDGET_LEVELS;
      return DEFAULT_APPROVAL_CONFIG.LARGE_BUDGET_LEVELS;
    })();

  await db.workflowStep.createMany({
      data: stepsLevels.map((level) => ({
        requisitionId: created.id,
        reviewerId: null,
        reviewerName: level === 7 ? 'Administration' : level === 6 ? 'Finance' : 'Direction Générale',
        reviewerLevel: level,
        action: 'pending',
        isRequired: true,
        isCompleted: false,
      })),
    });

  const withWorkflow = await db.requisition.findUnique({
      where: { id: created.id },
      include: { requester: true, workflow: { orderBy: { createdAt: 'asc' } } },
    });

    const shaped = {
      id: withWorkflow!.id,
      title: withWorkflow!.title,
      description: withWorkflow!.description,
      category: withWorkflow!.category,
      priority: withWorkflow!.priority,
      budget: withWorkflow!.budget,
      justification: withWorkflow!.justification,
      status: withWorkflow!.status,
      requesterId: withWorkflow!.requesterId ? String(withWorkflow!.requesterId) : '',
      requesterName: withWorkflow!.requester?.displayName || withWorkflow!.requester?.name || '',
      companyId: String(withWorkflow!.organizationId),
      companyCode: ctx.org.slug,
      createdAt: withWorkflow!.createdAt.toISOString(),
      updatedAt: withWorkflow!.updatedAt.toISOString(),
      approvedAt: withWorkflow!.approvedAt ? withWorkflow!.approvedAt.toISOString() : undefined,
  workflow: withWorkflow!.workflow.map((w: any) => ({
        id: w.id,
        requisitionId: w.requisitionId,
        reviewerId: w.reviewerId ? String(w.reviewerId) : '',
        reviewerName: w.reviewerName,
        reviewerLevel: w.reviewerLevel,
        action: w.action as any,
        comment: w.comment || undefined,
        createdAt: w.createdAt.toISOString(),
        completedAt: w.completedAt ? w.completedAt.toISOString() : undefined,
        isRequired: w.isRequired,
        isCompleted: w.isCompleted,
      })),
      attachments: [],
    };

    return NextResponse.json({ success: true, requisition: jsonSafe(shaped), message: 'Réquisition créée avec succès' }, { status: 201 });

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
    const ctx = await requireAuthedContext(req);
    if (!ctx) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requisitionId = searchParams.get('id');

    if (!requisitionId) {
      return NextResponse.json(
        { success: false, error: 'ID de réquisition requis' },
        { status: 400 }
      );
    }

    const data: UpdateRequisitionData = await req.json();

  const existing = await db.requisition.findUnique({ where: { id: requisitionId } });
    if (!existing || existing.organizationId !== ctx.session.organizationId) {
      return NextResponse.json({ success: false, error: 'Réquisition non trouvée' }, { status: 404 });
    }

    // Autorisation simple: propriétaire ou rôle 'admin'
    const isOwner = existing.requesterId === ctx.user.id;
    const isAdmin = ctx.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    const updates: any = {};
    if (data.title) updates.title = data.title;
    if (data.description) updates.description = data.description;
    if (data.category) updates.category = data.category;
    if (data.priority) updates.priority = data.priority;
    if (data.budget) updates.budget = data.budget;
    if (data.justification) updates.justification = data.justification;
    if (data.status) updates.status = data.status;

    // reset approvedAt if status not 'approuve'
    if (data.status && data.status !== 'approuve') updates.approvedAt = null;

  const updated = await db.requisition.update({ where: { id: requisitionId }, data: updates });

    // If budget changed, rebuild workflow
    if (data.budget && data.budget !== existing.budget) {
  await db.workflowStep.deleteMany({ where: { requisitionId } });
      const stepsLevels = ((): number[] => {
        if (updated.budget < DEFAULT_APPROVAL_CONFIG.SMALL_BUDGET_THRESHOLD) return DEFAULT_APPROVAL_CONFIG.SMALL_BUDGET_LEVELS;
        if (updated.budget < DEFAULT_APPROVAL_CONFIG.MEDIUM_BUDGET_THRESHOLD) return DEFAULT_APPROVAL_CONFIG.MEDIUM_BUDGET_LEVELS;
        return DEFAULT_APPROVAL_CONFIG.LARGE_BUDGET_LEVELS;
      })();
  await db.workflowStep.createMany({
        data: stepsLevels.map((level) => ({
          requisitionId,
          reviewerId: null,
          reviewerName: level === 7 ? 'Administration' : level === 6 ? 'Finance' : 'Direction Générale',
          reviewerLevel: level,
          action: 'pending',
          isRequired: true,
          isCompleted: false,
        })),
      });
    }

  const withWorkflow = await db.requisition.findUnique({
      where: { id: requisitionId },
      include: { requester: true, workflow: { orderBy: { createdAt: 'asc' } } },
    });

    const shaped = {
      id: withWorkflow!.id,
      title: withWorkflow!.title,
      description: withWorkflow!.description,
      category: withWorkflow!.category,
      priority: withWorkflow!.priority,
      budget: withWorkflow!.budget,
      justification: withWorkflow!.justification,
      status: withWorkflow!.status,
      requesterId: withWorkflow!.requesterId ? String(withWorkflow!.requesterId) : '',
      requesterName: withWorkflow!.requester?.displayName || withWorkflow!.requester?.name || '',
      companyId: String(withWorkflow!.organizationId),
      companyCode: ctx.org.slug,
      createdAt: withWorkflow!.createdAt.toISOString(),
      updatedAt: withWorkflow!.updatedAt.toISOString(),
      approvedAt: withWorkflow!.approvedAt ? withWorkflow!.approvedAt.toISOString() : undefined,
  workflow: withWorkflow!.workflow.map((w: any) => ({
        id: w.id,
        requisitionId: w.requisitionId,
        reviewerId: w.reviewerId ? String(w.reviewerId) : '',
        reviewerName: w.reviewerName,
        reviewerLevel: w.reviewerLevel,
        action: w.action as any,
        comment: w.comment || undefined,
        createdAt: w.createdAt.toISOString(),
        completedAt: w.completedAt ? w.completedAt.toISOString() : undefined,
        isRequired: w.isRequired,
        isCompleted: w.isCompleted,
      })),
      attachments: [],
    };

    return NextResponse.json({ success: true, requisition: jsonSafe(shaped), message: 'Réquisition mise à jour avec succès' });

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
    const ctx = await requireAuthedContext(req);
    if (!ctx) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requisitionId = searchParams.get('id');

    if (!requisitionId) {
      return NextResponse.json(
        { success: false, error: 'ID de réquisition requis' },
        { status: 400 }
      );
    }

  const existing = await db.requisition.findUnique({ where: { id: requisitionId } });
    if (!existing || existing.organizationId !== ctx.session.organizationId) {
      return NextResponse.json({ success: false, error: 'Réquisition non trouvée' }, { status: 404 });
    }

    const isOwner = existing.requesterId === ctx.user.id;
    const isAdmin = ctx.user.role === 'admin';
    const isApproved = existing.status === 'approuve';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Vous ne pouvez supprimer que vos propres réquisitions' }, { status: 403 });
    }
    if (isApproved && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Impossible de supprimer une réquisition déjà approuvée. Contactez un administrateur si nécessaire.' }, { status: 403 });
    }

  await db.workflowStep.deleteMany({ where: { requisitionId } });
  await db.requisition.delete({ where: { id: requisitionId } });

    return NextResponse.json({ success: true, message: `Réquisition supprimée avec succès` });
  } catch (error) {
    console.error('Erreur DELETE réquisition:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
