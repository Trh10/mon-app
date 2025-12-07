import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const BESOINS_FILE = path.join(DATA_DIR, 'besoins.json');
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'besoins');

// Initialiser les fichiers
async function ensureDataFiles() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  if (!existsSync(BESOINS_FILE)) {
    await writeFile(BESOINS_FILE, JSON.stringify({ besoins: [] }, null, 2));
  }
}

// Lire les besoins
async function getBesoins() {
  await ensureDataFiles();
  const data = await readFile(BESOINS_FILE, 'utf-8');
  const parsed = JSON.parse(data);
  return parsed.besoins || parsed || [];
}

// Sauvegarder les besoins
async function saveBesoins(besoins: any[]) {
  await ensureDataFiles();
  await writeFile(BESOINS_FILE, JSON.stringify({ besoins }, null, 2));
}

// GET - Récupérer un besoin par ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const besoins = await getBesoins();
    const besoin = besoins.find((b: any) => b.id === params.id);
    
    if (!besoin) {
      return NextResponse.json(
        { error: 'Besoin non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(besoin);
  } catch (error) {
    console.error('Erreur GET besoin:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un besoin
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let updateData: any;
    let uploadedFiles: { name: string; url: string; type: string }[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const dataString = formData.get('data') as string;
      updateData = JSON.parse(dataString);

      // Traiter les nouveaux fichiers
      const files = formData.getAll('files') as File[];
      
      for (const file of files) {
        if (file && file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const filepath = path.join(UPLOAD_DIR, filename);
          
          await mkdir(UPLOAD_DIR, { recursive: true });
          await writeFile(filepath, buffer);
          
          uploadedFiles.push({
            name: file.name,
            url: `/uploads/besoins/${filename}`,
            type: file.type
          });
        }
      }
    } else {
      updateData = await request.json();
    }

    const besoins = await getBesoins();
    const index = besoins.findIndex((b: any) => b.id === params.id);
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Besoin non trouvé' },
        { status: 404 }
      );
    }

    // Fusionner les documents existants avec les nouveaux
    const existingDocs = updateData.documents || besoins[index].documents || [];
    const allDocs = [...existingDocs, ...uploadedFiles];

    besoins[index] = {
      ...besoins[index],
      ...updateData,
      documents: allDocs,
      dateModification: new Date().toISOString()
    };

    await saveBesoins(besoins);

    return NextResponse.json(besoins[index]);
  } catch (error) {
    console.error('Erreur PUT besoin:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un besoin
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const besoins = await getBesoins();
    const besoin = besoins.find((b: any) => b.id === params.id);
    
    if (!besoin) {
      return NextResponse.json(
        { error: 'Besoin non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer les fichiers associés
    if (besoin.documents && besoin.documents.length > 0) {
      for (const doc of besoin.documents) {
        if (doc.url && doc.url.startsWith('/uploads/')) {
          const filePath = path.join(process.cwd(), 'public', doc.url);
          if (existsSync(filePath)) {
            try {
              await unlink(filePath);
            } catch (e) {
              console.error('Erreur suppression fichier:', e);
            }
          }
        }
      }
    }

    // Supprimer le besoin de la liste
    const filteredBesoins = besoins.filter((b: any) => b.id !== params.id);
    await saveBesoins(filteredBesoins);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE besoin:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}

// PATCH - Changer le statut (workflow de validation)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { statut, commentaires, validePar } = body;

    const besoins = await getBesoins();
    const index = besoins.findIndex((b: any) => b.id === params.id);
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Besoin non trouvé' },
        { status: 404 }
      );
    }

    besoins[index] = {
      ...besoins[index],
      statut,
      commentaires: commentaires || besoins[index].commentaires,
      validePar: validePar || besoins[index].validePar,
      dateValidation: new Date().toISOString()
    };

    await saveBesoins(besoins);

    return NextResponse.json(besoins[index]);
  } catch (error) {
    console.error('Erreur PATCH besoin:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du statut' },
      { status: 500 }
    );
  }
}
