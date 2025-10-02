import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session.organizationId || !session.userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const minBudget = searchParams.get('minBudget');
    const maxBudget = searchParams.get('maxBudget');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const db: any = prisma;
    const where: any = { organizationId: session.organizationId };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { justification: { contains: search } }
      ];
    }

    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (minBudget || maxBudget) {
      where.budget = {};
      if (minBudget) where.budget.gte = parseFloat(minBudget);
      if (maxBudget) where.budget.lte = parseFloat(maxBudget);
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [requisitions, total] = await Promise.all([
      db.requisition.findMany({
        where,
        include: { workflow: { orderBy: { reviewerLevel: 'asc' } }, requester: { select: { id: true, name: true, role: true } } },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.requisition.count({ where })
    ]);

    const allFiltered = await db.requisition.findMany({ where, select: { status: true, category: true, priority: true, budget: true } });
    const stats = {
      total,
      totalBudget: allFiltered.reduce((sum: number, req: any) => sum + req.budget, 0),
      byStatus: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byPriority: {} as Record<string, number>
    };
    allFiltered.forEach((req: any) => {
      stats.byStatus[req.status] = (stats.byStatus[req.status] || 0) + 1;
      stats.byCategory[req.category] = (stats.byCategory[req.category] || 0) + 1;
      stats.byPriority[req.priority] = (stats.byPriority[req.priority] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      requisitions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: (page * limit) < total, hasPrev: page > 1 },
      stats,
      filters: { search, status, category, priority, minBudget, maxBudget, dateFrom, dateTo, sortBy, sortOrder }
    });
  } catch (error) {
    console.error('Erreur recherche avancée:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}