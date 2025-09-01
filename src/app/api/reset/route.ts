import { NextRequest, NextResponse } from 'next/server';
import { existsSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';

const DATA_FILES = [
  'email-accounts.json',
  'notifications.json',
  'audit.json',
  'requisitions.json',
  'users.json'
];

export async function DELETE() {
  try {
    const dataDir = join(process.cwd(), 'data');
    let deletedFiles = [];
    let errors = [];

    // Supprimer chaque fichier de données
    for (const fileName of DATA_FILES) {
      const filePath = join(dataDir, fileName);
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
          deletedFiles.push(fileName);
        }
      } catch (error) {
        errors.push(`Erreur suppression ${fileName}: ${error}`);
      }
    }

    // Nettoyer aussi les cookies/session dans le navigateur
    const response = NextResponse.json({
      success: true,
      message: 'Toutes les données nettoyées',
      deletedFiles,
      errors: errors.length > 0 ? errors : undefined
    });

    // Supprimer les cookies de session
    response.cookies.delete('user-session');
    response.cookies.delete('google-auth');
    response.cookies.delete('email-credentials');

    return response;

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erreur lors du nettoyage: ' + error
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const dataDir = join(process.cwd(), 'data');
    let existingFiles = [];

    if (existsSync(dataDir)) {
      for (const fileName of DATA_FILES) {
        const filePath = join(dataDir, fileName);
        if (existsSync(filePath)) {
          existingFiles.push(fileName);
        }
      }
    }

    return NextResponse.json({
      success: true,
      dataDirectory: dataDir,
      existingFiles,
      message: existingFiles.length > 0 
        ? `${existingFiles.length} fichiers trouvés` 
        : 'Aucune donnée trouvée'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erreur vérification: ' + error
    }, { status: 500 });
  }
}
