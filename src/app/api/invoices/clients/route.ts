import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllClients, 
  getClientById, 
  createClient, 
  updateClient, 
  deleteClient 
} from '@/lib/invoices/invoice-store';
import { canAccessInvoices, Company } from '@/lib/invoices/invoice-types';

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
      const client = getClientById(id);
      if (!client) {
        return NextResponse.json({ success: false, error: 'Client non trouvé' }, { status: 404 });
      }
      return NextResponse.json({ success: true, client });
    }
    
    const clients = getAllClients(company || undefined);
    return NextResponse.json({ success: true, clients });
  } catch (error: any) {
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
    if (!data.companyName || !data.email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nom de l\'entreprise et email requis' 
      }, { status: 400 });
    }
    
    const client = createClient({
      companyName: data.companyName,
      contactName: data.contactName || '',
      email: data.email,
      phone: data.phone || '',
      address: data.address || '',
      city: data.city || '',
      country: data.country || 'Congo-Kinshasa',
      taxNumber: data.taxNumber,
      notes: data.notes,
      company: data.company || 'icones',
    });
    
    return NextResponse.json({ success: true, client }, { status: 201 });
  } catch (error: any) {
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
    
    const client = updateClient(data.id, data);
    
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client non trouvé' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, client });
  } catch (error: any) {
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
    
    const deleted = deleteClient(id);
    
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Client non trouvé' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Client supprimé' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
