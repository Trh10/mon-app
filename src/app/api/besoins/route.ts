import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
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
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
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

// GET - Récupérer tous les besoins
export async function GET(request: NextRequest) {
  try {
    const besoins = await getBesoins();
    return NextResponse.json({ besoins });
  } catch (error) {
    console.error('Erreur GET besoins:', error);
    return NextResponse.json({ besoins: [] });
  }
}

// POST - Créer un nouveau besoin
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let besoinData: any;
    let documentUrl: string | undefined;
    let documentName: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const dataString = formData.get('data') as string;
      besoinData = JSON.parse(dataString);

      // Traiter le fichier uploadé (document unique)
      const file = formData.get('file') as File;
      
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filepath = path.join(UPLOAD_DIR, filename);
        
        await mkdir(UPLOAD_DIR, { recursive: true });
        await writeFile(filepath, buffer);
        
        documentUrl = `/uploads/besoins/${filename}`;
        documentName = file.name;
      }
    } else {
      besoinData = await request.json();
    }

    const besoins = await getBesoins();
    
    const newBesoin = {
      id: Date.now().toString(),
      reference: `EB-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      titre: besoinData.titre,
      demandeur: besoinData.demandeur || 'Inconnu',
      description: besoinData.description || '',
      produits: besoinData.produits || [],
      total: besoinData.total || 0,
      statut: 'soumis',
      dateCreation: new Date().toISOString(),
      isDocumentOnly: besoinData.isDocumentOnly || false,
      documentUrl: documentUrl,
      documentName: documentName
    };

    besoins.unshift(newBesoin);
    await saveBesoins(besoins);

    return NextResponse.json(newBesoin, { status: 201 });
  } catch (error) {
    console.error('Erreur POST besoin:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création' },
      { status: 500 }
    );
  }
}
