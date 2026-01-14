import { NextRequest, NextResponse } from 'next/server';
import { invoiceService } from '@/lib/invoices/prisma-invoice-service';
import { canAccessInvoices, Company } from '@/lib/invoices/invoice-types';

// Vérifier l'accès utilisateur
async function checkAccess(request: NextRequest): Promise<{ authorized: boolean; userId?: string; userRole?: string }> {
  try {
    const userSessionCookie = request.cookies.get('user-session')?.value;
    if (!userSessionCookie) {
      console.log('[Clients API] Pas de cookie session');
      return { authorized: false };
    }
    
    const userData = JSON.parse(userSessionCookie);
    const userRole = userData.role || '';
    
    console.log('[Clients API] User:', userData.name, 'Role:', userRole, 'canAccess:', canAccessInvoices(userRole));
    
    if (!canAccessInvoices(userRole)) {
      return { authorized: false };
    }
    
    return { authorized: true, userId: userData.id, userRole };
  } catch (err) {
    console.error('[Clients API] Erreur checkAccess:', err);
    return { authorized: false };
  }
}

// GET - Liste tous les clients
export async function GET(request: NextRequest) {
  const access = await checkAccess(request);
  if (!access.authorized) {
    return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const company = searchParams.get('company') as Company | null;
    
    if (id) {
      const client = await invoiceService.getClientById(id);
      if (!client) {
        return NextResponse.json({ success: false, error: 'Client non trouvé' }, { status: 404 });
      }
      return NextResponse.json({ success: true, client });
    }
    
    const clients = await invoiceService.getAllClients(company || undefined);
    return NextResponse.json({ success: true, clients });
  } catch (error: any) {
    console.error('GET /api/invoices/clients error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Créer un nouveau client
export async function POST(request: NextRequest) {
  const access = await checkAccess(request);
  if (!access.authorized) {
    return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
  }
  
  try {
    const data = await request.json();
    
    // Validation basique
    if (!data.companyName) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nom de l\'entreprise requis' 
      }, { status: 400 });
    }
    
    const client = await invoiceService.createClient({
      company: data.company || 'allinone',
      companyName: data.companyName,
      contactName: data.contactName || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      city: data.city || '',
      country: data.country || '',
      taxNumber: data.taxNumber || '',
      notes: data.notes || '',
    });
    
    return NextResponse.json({ success: true, client }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/invoices/clients error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Mettre à jour un client
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
    
    const client = await invoiceService.updateClient(data.id, {
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
      taxNumber: data.taxNumber,
      notes: data.notes,
    });
    
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client non trouvé' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    console.error('PUT /api/invoices/clients error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Supprimer un client
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
    
    await invoiceService.deleteClient(id);
    return NextResponse.json({ success: true, message: 'Client supprimé' });
  } catch (error: any) {
    console.error('DELETE /api/invoices/clients error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
