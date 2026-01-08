import { NextRequest, NextResponse } from 'next/server';
import invoiceService from '@/lib/invoices/prisma-invoice-service';
import { canAccessInvoices, calculateInvoiceTotals, InvoiceLine, Company } from '@/lib/invoices/invoice-types';

// Vérifier l'accès utilisateur
async function checkAccess(request: NextRequest): Promise<{ authorized: boolean; userId?: string; userRole?: string }> {
  try {
    const userSessionCookie = request.cookies.get('user-session')?.value;
    if (!userSessionCookie) {
      return { authorized: false };
    }
    
    const userData = JSON.parse(userSessionCookie);
    const userRole = userData.role || '';
    
    if (!canAccessInvoices(userRole)) {
      return { authorized: false };
    }
    
    return { authorized: true, userId: userData.id, userRole };
  } catch {
    return { authorized: false };
  }
}

// GET - Liste toutes les factures ou une facture spécifique
export async function GET(request: NextRequest) {
  const access = await checkAccess(request);
  if (!access.authorized) {
    return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clientId = searchParams.get('clientId');
    const stats = searchParams.get('stats');
    const company = searchParams.get('company') as Company | null;
    
    // Statistiques
    if (stats === 'true') {
      const invoiceStats = await invoiceService.getInvoiceStats(company || undefined);
      return NextResponse.json({ success: true, stats: invoiceStats });
    }
    
    // Facture spécifique
    if (id) {
      const invoice = await invoiceService.getInvoiceById(id);
      if (!invoice) {
        return NextResponse.json({ success: false, error: 'Facture non trouvée' }, { status: 404 });
      }
      return NextResponse.json({ success: true, invoice });
    }
    
    // Factures par client ou toutes les factures
    const { invoices, total } = await invoiceService.getAllInvoices(company || undefined, {
      clientId: clientId || undefined
    });
    
    return NextResponse.json({ success: true, invoices, total });
  } catch (error: any) {
    console.error('GET /api/invoices error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Créer une nouvelle facture
export async function POST(request: NextRequest) {
  const access = await checkAccess(request);
  if (!access.authorized) {
    return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
  }
  
  try {
    const data = await request.json();
    
    // Validation basique
    if (!data.clientId) {
      return NextResponse.json({ success: false, error: 'Client requis' }, { status: 400 });
    }
    
    // Récupérer les initiales de l'utilisateur et l'entreprise
    const userInitials = data.userInitials || 'XX';
    const company: Company = data.company || 'icones';
    const templateCode = data.templateCode;
    
    // Pour ALL IN ONE
    if (company === 'allinone') {
      if (!data.lines || data.lines.length === 0) {
        return NextResponse.json({ success: false, error: 'Au moins une ligne requise' }, { status: 400 });
      }
      
      // Préparer les lignes
      const lines = data.lines.map((line: any) => ({
        description: line.description || '',
        quantity: parseFloat(line.quantity) || 0,
        unitPrice: parseFloat(line.unitPrice) || 0,
        chargesTTC: parseFloat(line.chargesTTC) || 0,
      }));
      
      const subtotal = lines.reduce((sum: number, l: any) => sum + (l.quantity * l.unitPrice), 0);
      
      const invoice = await invoiceService.createInvoice({
        template: data.template || 'creation_entreprise',
        company: company,
        clientId: data.clientId,
        issueDate: new Date(data.issueDate || new Date()),
        dueDate: new Date(data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        lines,
        subtotal: data.subtotal || subtotal,
        taxRate: data.taxRate || 0,
        taxAmount: data.taxAmount || 0,
        total: data.total || subtotal,
        serviceType: data.serviceType,
        templateCode: templateCode,
        placementTVAEnabled: data.placementTVAEnabled || false,
        chargesTTCMode: data.chargesTTCMode !== false,
        transfertDeduction: data.transfertDeduction || 0,
        paymentTerms: data.paymentTerms || 'Net 30 jours',
        publicNotes: data.publicNotes,
        notes: data.notes,
        managementFeeRate: data.managementFeeRate,
        createdBy: access.userId || 'unknown',
        createdByInitials: userInitials,
      });
      
      return NextResponse.json({ success: true, invoice }, { status: 201 });
    }
    
    // Pour ICONES - Facture B (avec sections)
    if (data.template === 'facture_b' || data.template === 'proforma_b') {
      if (!data.sections || data.sections.length === 0) {
        return NextResponse.json({ success: false, error: 'Au moins une section requise' }, { status: 400 });
      }
      
      const invoice = await invoiceService.createInvoice({
        template: data.template,
        company: company,
        clientId: data.clientId,
        issueDate: new Date(data.issueDate || new Date()),
        dueDate: new Date(data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        lines: [],
        sections: data.sections,
        projectName: data.projectName,
        projectDescription: data.projectDescription,
        subtotal: data.subtotal || 0,
        taxRate: 0,
        taxAmount: 0,
        total: data.total || 0,
        paymentTerms: data.paymentTerms || 'Net 30 jours',
        publicNotes: data.publicNotes,
        notes: data.notes,
        commissionRate: data.commissionRate || 17,
        managementFeeRate: data.managementFeeRate || 5,
        createdBy: access.userId || 'unknown',
        createdByInitials: userInitials,
      });
      
      return NextResponse.json({ success: true, invoice }, { status: 201 });
    }
    
    // Pour ICONES - Facture A (format simple)
    if (!data.lines || data.lines.length === 0) {
      return NextResponse.json({ success: false, error: 'Au moins une ligne requise' }, { status: 400 });
    }
    
    // Préparer les lignes avec calcul des totaux
    const lines = data.lines.map((line: any) => ({
      description: line.description || '',
      quantity: parseFloat(line.quantity) || 0,
      unitPrice: parseFloat(line.unitPrice) || 0,
    }));
    
    const taxRate = parseFloat(data.taxRate) || 0;
    const subtotal = lines.reduce((sum: number, l: any) => sum + (l.quantity * l.unitPrice), 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    
    const invoice = await invoiceService.createInvoice({
      template: data.template || 'facture_a',
      company: company,
      clientId: data.clientId,
      issueDate: new Date(data.issueDate || new Date()),
      dueDate: new Date(data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      lines,
      subtotal,
      taxRate,
      taxAmount,
      total,
      paymentTerms: data.paymentTerms || 'Net 30 jours',
      publicNotes: data.publicNotes,
      notes: data.notes,
      commissionRate: data.commissionRate,
      managementFeeRate: data.managementFeeRate,
      createdBy: access.userId || 'unknown',
      createdByInitials: userInitials,
    });
    
    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/invoices error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Mettre à jour une facture
export async function PUT(request: NextRequest) {
  const access = await checkAccess(request);
  if (!access.authorized) {
    return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
  }
  
  try {
    const data = await request.json();
    
    if (!data.id) {
      return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });
    }
    
    const invoice = await invoiceService.updateInvoice(data.id, {
      status: data.status,
      paymentTerms: data.paymentTerms,
      publicNotes: data.publicNotes,
      notes: data.notes,
      subtotal: data.subtotal,
      taxRate: data.taxRate,
      taxAmount: data.taxAmount,
      total: data.total,
    });
    
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Facture non trouvée' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    console.error('PUT /api/invoices error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Supprimer une facture
export async function DELETE(request: NextRequest) {
  const access = await checkAccess(request);
  if (!access.authorized) {
    return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });
    }
    
    await invoiceService.deleteInvoice(id);
    
    return NextResponse.json({ success: true, message: 'Facture supprimée' });
  } catch (error: any) {
    console.error('DELETE /api/invoices error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
