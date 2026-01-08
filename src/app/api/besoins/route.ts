import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

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

// Générer une référence unique
function generateReference(): string {
  return `EB-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

// GET - Récupérer tous les besoins
export async function GET(req: NextRequest) {
  try {
    const organizationId = await getOrganizationId(req);
    
    if (!organizationId) {
      return NextResponse.json({ besoins: [] });
    }

    const needs = await prisma.need.findMany({
      where: { organizationId },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        attachments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transformer pour le format "besoins" attendu par le frontend legacy
    const besoins = needs.map(need => ({
      id: need.id,
      reference: `EB-${need.id.slice(-4).toUpperCase()}`,
      titre: need.title,
      demandeur: need.requesterName || need.requester?.name || need.requester?.displayName || 'Inconnu',
      description: need.description,
      produits: [],  // Compatibilité avec l'ancien format
      total: need.budget,
      statut: need.status,
      dateCreation: need.createdAt.toISOString(),
      isDocumentOnly: false,
      documentUrl: need.attachments?.[0]?.url || null,
      documentName: need.attachments?.[0]?.fileName || null
    }));

    return NextResponse.json({ besoins });
  } catch (error) {
    console.error('Erreur GET besoins:', error);
    return NextResponse.json({ besoins: [] });
  }
}

// POST - Créer un nouveau besoin
export async function POST(req: NextRequest) {
  try {
    const organizationId = await getOrganizationId(req);
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 401 }
      );
    }

    const currentUser = await getCurrentUser(req);

    const contentType = req.headers.get('content-type') || '';
    let besoinData: any;
    let documentUrl: string | undefined;
    let documentName: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const dataString = formData.get('data') as string;
      besoinData = JSON.parse(dataString);

      // TODO: Implémenter l'upload de fichiers vers un storage cloud pour la production
      // Pour l'instant, on ne gère pas les fichiers car Prisma n'a pas de support fichiers natif
      const file = formData.get('file') as File;
      if (file && file.size > 0) {
        // En production, uploader vers S3/Cloudinary/etc
        documentName = file.name;
        documentUrl = `/uploads/besoins/${Date.now()}-${file.name}`;
      }
    } else {
      besoinData = await req.json();
    }

    // Créer le besoin dans la base de données
    const newNeed = await prisma.need.create({
      data: {
        title: besoinData.titre || besoinData.title || 'Sans titre',
        description: besoinData.description || '',
        category: besoinData.category || 'autre',
        priority: besoinData.priority || 'moyenne',
        budget: besoinData.total || besoinData.budget || 0,
        justification: besoinData.justification || '',
        status: 'soumis',
        requesterId: currentUser?.id || null,
        requesterName: besoinData.demandeur || currentUser?.name || currentUser?.displayName || 'Utilisateur',
        organizationId,
        // Créer l'attachement si un document est fourni
        ...(documentUrl && documentName ? {
          attachments: {
            create: {
              fileName: documentName,
              fileSize: 0,
              fileType: 'application/octet-stream',
              uploadedBy: currentUser?.name || 'Utilisateur',
              url: documentUrl
            }
          }
        } : {})
      },
      include: {
        attachments: true
      }
    });

    // Retourner dans le format "besoins" attendu
    const response = {
      id: newNeed.id,
      reference: `EB-${newNeed.id.slice(-4).toUpperCase()}`,
      titre: newNeed.title,
      demandeur: newNeed.requesterName || 'Utilisateur',
      description: newNeed.description,
      produits: [],
      total: newNeed.budget,
      statut: newNeed.status,
      dateCreation: newNeed.createdAt.toISOString(),
      isDocumentOnly: !!documentUrl,
      documentUrl: documentUrl || null,
      documentName: documentName || null
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Erreur POST besoin:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un besoin
export async function PUT(req: NextRequest) {
  try {
    const organizationId = await getOrganizationId(req);
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const besoinId = searchParams.get('id');

    if (!besoinId) {
      return NextResponse.json(
        { error: 'ID du besoin requis' },
        { status: 400 }
      );
    }

    const updateData = await req.json();

    // Vérifier que le besoin existe
    const existingNeed = await prisma.need.findFirst({
      where: {
        id: besoinId,
        organizationId
      }
    });

    if (!existingNeed) {
      return NextResponse.json(
        { error: 'Besoin non trouvé' },
        { status: 404 }
      );
    }

    // Mettre à jour
    const updatedNeed = await prisma.need.update({
      where: { id: besoinId },
      data: {
        ...(updateData.titre && { title: updateData.titre }),
        ...(updateData.description && { description: updateData.description }),
        ...(updateData.statut && { status: updateData.statut }),
        ...(updateData.total !== undefined && { budget: updateData.total })
      }
    });

    return NextResponse.json({
      id: updatedNeed.id,
      reference: `EB-${updatedNeed.id.slice(-4).toUpperCase()}`,
      titre: updatedNeed.title,
      statut: updatedNeed.status,
      total: updatedNeed.budget,
      dateCreation: updatedNeed.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Erreur PUT besoin:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un besoin
export async function DELETE(req: NextRequest) {
  try {
    const organizationId = await getOrganizationId(req);
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const besoinId = searchParams.get('id');

    if (!besoinId) {
      return NextResponse.json(
        { error: 'ID du besoin requis' },
        { status: 400 }
      );
    }

    // Vérifier que le besoin existe
    const existingNeed = await prisma.need.findFirst({
      where: {
        id: besoinId,
        organizationId
      }
    });

    if (!existingNeed) {
      return NextResponse.json(
        { error: 'Besoin non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer
    await prisma.need.delete({
      where: { id: besoinId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE besoin:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}
