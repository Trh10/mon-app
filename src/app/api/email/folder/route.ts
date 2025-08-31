import { NextRequest } from 'next/server';
import { UniversalSmartClient } from '@/lib/email/universal-smart-client';

export async function POST(request: NextRequest) {
  try {
    const { folder, email, password, timestamp } = await request.json();
    
    if (!folder || !email || !password) {
      return Response.json({ error: 'Dossier, email et password requis' }, { status: 400 });
    }

    const currentTime = '2025-08-29 14:04:36';
    const currentUser = 'Trh10';
    
    console.log(`📁 Changement vers dossier: ${folder} - Email: ${email} - User: ${currentUser} - ${currentTime} UTC`);
    
    const client = new UniversalSmartClient(email, password);
    
    const emails = await client.getEmailsByFolder(folder, 50);
    
    console.log(`✅ ${emails.length} emails récupérés de ${folder} - User: ${currentUser} - ${currentTime} UTC`);
    
    return Response.json({
      emails,
      folder,
      message: `Dossier ${folder} chargé avec succès`,
      timestamp: currentTime,
      user: currentUser
    });

  } catch (error: any) {
    console.error(`❌ Erreur changement dossier: ${error.message} - User: Trh10 - 2025-08-29 14:04:36`);
    
    return Response.json({
      error: 'Erreur lors du changement de dossier',
      details: error.message,
      timestamp: '2025-08-29 14:04:36',
      user: 'Trh10'
    }, { status: 500 });
  }
}