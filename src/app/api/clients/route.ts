import { NextRequest, NextResponse } from 'next/server';
import { invoiceService } from '@/lib/invoices/prisma-invoice-service';
import type { Company } from '@/lib/invoices/invoice-types';

// GET - Liste des clients ou client spécifique
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') as Company | null;
    const id = searchParams.get('id');

    if (id) {
      // Récupérer un client spécifique
      const client = await invoiceService.getClientById(id);
      if (!client) {
        return NextResponse.json(
          { error: 'Client non trouvé' },
          { status: 404 }
        );
      }
      return NextResponse.json(client);
    }

    // Liste tous les clients (filtrés par company si spécifié)
    const clients = await invoiceService.getAllClients(company || undefined);
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Erreur lors de la récupération des clients:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST - Créer un nouveau client
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validation basique
    if (!data.company || !data.companyName) {
      return NextResponse.json(
        { error: 'Société et nom de l\'entreprise requis' },
        { status: 400 }
      );
    }

    const client = await invoiceService.createClient(data);
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création du client:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un client
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID du client requis' },
        { status: 400 }
      );
    }

    const client = await invoiceService.updateClient(id, updateData);
    if (!client) {
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du client:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un client
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID du client requis' },
        { status: 400 }
      );
    }

    await invoiceService.deleteClient(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression du client:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
