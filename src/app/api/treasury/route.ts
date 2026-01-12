// API pour la trésorerie et les dépenses
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Vérifier l'accès (simplifié)
async function checkAccess(request: NextRequest) {
  return { authorized: true };
}

// GET - Récupérer les données de trésorerie
export async function GET(request: NextRequest) {
  const access = await checkAccess(request);
  if (!access.authorized) {
    return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || 'icones';
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const type = searchParams.get('type'); // 'expenses', 'categories', 'summary'

    if (type === 'categories') {
      // Récupérer les catégories de dépenses
      const categories = await prisma.expenseCategory.findMany({
        where: { company, isActive: true },
        orderBy: { sortOrder: 'asc' }
      });
      return NextResponse.json({ success: true, categories });
    }

    if (type === 'expenses') {
      // Récupérer les dépenses du mois
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const expenses = await prisma.expense.findMany({
        where: {
          company,
          expenseDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: { category: true },
        orderBy: { expenseDate: 'desc' }
      });
      return NextResponse.json({ success: true, expenses });
    }

    // Par défaut: résumé de trésorerie
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Récupérer les factures payées (entrées)
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        company,
        status: 'paid',
        paidAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        paidAmount: true,
        paidAt: true,
        client: {
          select: { companyName: true }
        }
      },
      orderBy: { paidAt: 'desc' }
    });

    // Récupérer les dépenses du mois
    const expenses = await prisma.expense.findMany({
      where: {
        company,
        expenseDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: { category: true },
      orderBy: { expenseDate: 'desc' }
    });

    // Calculer les totaux
    const totalIncome = paidInvoices.reduce((sum, inv) => sum + (inv.paidAmount || inv.total), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const balance = totalIncome - totalExpenses;

    // Grouper les dépenses par catégorie
    const expensesByCategory: Record<string, { name: string; color: string; total: number; count: number }> = {};
    expenses.forEach(exp => {
      const catName = exp.category?.name || 'Non catégorisé';
      const catColor = exp.category?.color || '#666';
      if (!expensesByCategory[catName]) {
        expensesByCategory[catName] = { name: catName, color: catColor, total: 0, count: 0 };
      }
      expensesByCategory[catName].total += exp.amount;
      expensesByCategory[catName].count++;
    });

    return NextResponse.json({
      success: true,
      summary: {
        year,
        month,
        totalIncome,
        totalExpenses,
        balance,
        expensesByCategory: Object.values(expensesByCategory)
      },
      income: paidInvoices.map(inv => ({
        id: inv.id,
        type: 'invoice',
        description: `Facture ${inv.invoiceNumber} - ${inv.client.companyName}`,
        amount: inv.paidAmount || inv.total,
        date: inv.paidAt,
        invoiceNumber: inv.invoiceNumber
      })),
      expenses: expenses.map(exp => ({
        id: exp.id,
        type: 'expense',
        description: exp.description,
        amount: exp.amount,
        date: exp.expenseDate,
        category: exp.category?.name || 'Non catégorisé',
        categoryColor: exp.category?.color || '#666',
        vendor: exp.vendor,
        paymentMethod: exp.paymentMethod
      }))
    });
  } catch (error: any) {
    console.error('GET /api/treasury error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Créer une dépense ou catégorie
export async function POST(request: NextRequest) {
  const access = await checkAccess(request);
  if (!access.authorized) {
    return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { type } = data;

    if (type === 'category') {
      // Créer une catégorie
      const category = await prisma.expenseCategory.create({
        data: {
          company: data.company,
          name: data.name,
          color: data.color || '#6366f1',
          icon: data.icon,
          sortOrder: data.sortOrder || 0
        }
      });
      return NextResponse.json({ success: true, category });
    }

    // Créer une dépense
    const expense = await prisma.expense.create({
      data: {
        company: data.company,
        categoryId: data.categoryId,
        description: data.description,
        amount: parseFloat(data.amount),
        expenseDate: new Date(data.expenseDate),
        paymentMethod: data.paymentMethod,
        reference: data.reference,
        vendor: data.vendor,
        notes: data.notes,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        isRecurring: data.isRecurring || false,
        recurringType: data.recurringType
      },
      include: { category: true }
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error('POST /api/treasury error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Modifier une dépense ou catégorie
export async function PUT(request: NextRequest) {
  const access = await checkAccess(request);
  if (!access.authorized) {
    return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { type, id } = data;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });
    }

    if (type === 'category') {
      const category = await prisma.expenseCategory.update({
        where: { id },
        data: {
          name: data.name,
          color: data.color,
          icon: data.icon,
          isActive: data.isActive,
          sortOrder: data.sortOrder
        }
      });
      return NextResponse.json({ success: true, category });
    }

    // Modifier une dépense
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        description: data.description,
        amount: data.amount ? parseFloat(data.amount) : undefined,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
        paymentMethod: data.paymentMethod,
        reference: data.reference,
        vendor: data.vendor,
        notes: data.notes
      },
      include: { category: true }
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error('PUT /api/treasury error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Supprimer une dépense
export async function DELETE(request: NextRequest) {
  const access = await checkAccess(request);
  if (!access.authorized) {
    return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });
    }

    if (type === 'category') {
      await prisma.expenseCategory.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Catégorie supprimée' });
    }

    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Dépense supprimée' });
  } catch (error: any) {
    console.error('DELETE /api/treasury error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
