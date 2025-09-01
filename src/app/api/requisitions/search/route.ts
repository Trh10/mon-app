import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRequisitions, getRequisitionsByCompany } from '@/lib/requisitions/requisition-store';
import { Requisition, canAccessRequisitions } from '@/lib/requisitions/requisition-types';

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

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    if (!canAccessRequisitions(user.level)) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    
    // Paramètres de recherche
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const minBudget = searchParams.get('minBudget');
    const maxBudget = searchParams.get('maxBudget');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const requester = searchParams.get('requester');
    const approver = searchParams.get('approver');
    
    // Paramètres de tri
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Paramètres de pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Récupérer les réquisitions selon le niveau d'accès
    let requisitions: Requisition[];
    if (user.level >= 7) {
      // Admin peut voir toutes les réquisitions de l'entreprise
      requisitions = getRequisitionsByCompany(user.companyId);
    } else if (user.level === 6) {
      // Finance peut voir toutes les réquisitions de l'entreprise
      requisitions = getRequisitionsByCompany(user.companyId);
    } else {
      // Utilisateur normal voit seulement ses réquisitions
      requisitions = getRequisitionsByCompany(user.companyId).filter(
        (req: Requisition) => req.requesterId === user.code
      );
    }

    // Filtrage
    let filteredRequisitions = requisitions;

    // Recherche textuelle
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRequisitions = filteredRequisitions.filter((req: Requisition) =>
        req.title.toLowerCase().includes(searchLower) ||
        req.description.toLowerCase().includes(searchLower) ||
        req.justification.toLowerCase().includes(searchLower) ||
        req.id.toLowerCase().includes(searchLower) ||
        req.requesterName.toLowerCase().includes(searchLower)
      );
    }

    // Filtres spécifiques
    if (status) {
      filteredRequisitions = filteredRequisitions.filter((req: Requisition) => req.status === status);
    }

    if (category) {
      filteredRequisitions = filteredRequisitions.filter((req: Requisition) => req.category === category);
    }

    if (priority) {
      filteredRequisitions = filteredRequisitions.filter((req: Requisition) => req.priority === priority);
    }

    if (minBudget) {
      filteredRequisitions = filteredRequisitions.filter((req: Requisition) => req.budget >= parseFloat(minBudget));
    }

    if (maxBudget) {
      filteredRequisitions = filteredRequisitions.filter((req: Requisition) => req.budget <= parseFloat(maxBudget));
    }

    if (dateFrom) {
      filteredRequisitions = filteredRequisitions.filter((req: Requisition) => 
        new Date(req.createdAt) >= new Date(dateFrom)
      );
    }

    if (dateTo) {
      filteredRequisitions = filteredRequisitions.filter((req: Requisition) => 
        new Date(req.createdAt) <= new Date(dateTo)
      );
    }

    if (requester) {
      filteredRequisitions = filteredRequisitions.filter((req: Requisition) => 
        req.requesterName.toLowerCase().includes(requester.toLowerCase()) ||
        req.requesterId.toLowerCase().includes(requester.toLowerCase())
      );
    }

    if (approver) {
      filteredRequisitions = filteredRequisitions.filter((req: Requisition) => 
        req.workflow.some(step => 
          step.reviewerName?.toLowerCase().includes(approver.toLowerCase()) && 
          step.action === 'approved'
        )
      );
    }

    // Tri
    filteredRequisitions.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'budget':
          aValue = a.budget;
          bValue = b.budget;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'priority':
          const priorityOrder = { 'urgent': 3, 'haute': 2, 'normale': 1, 'basse': 0 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const total = filteredRequisitions.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRequisitions = filteredRequisitions.slice(startIndex, endIndex);

    // Statistiques
    const stats = {
      total: total,
      totalBudget: filteredRequisitions.reduce((sum, req) => sum + req.budget, 0),
      byStatus: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byPriority: {} as Record<string, number>
    };

    filteredRequisitions.forEach(req => {
      stats.byStatus[req.status] = (stats.byStatus[req.status] || 0) + 1;
      stats.byCategory[req.category] = (stats.byCategory[req.category] || 0) + 1;
      stats.byPriority[req.priority] = (stats.byPriority[req.priority] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      requisitions: paginatedRequisitions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: endIndex < total,
        hasPrev: page > 1
      },
      stats,
      filters: {
        search,
        status,
        category,
        priority,
        minBudget,
        maxBudget,
        dateFrom,
        dateTo,
        requester,
        approver,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('Erreur recherche avancée:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
