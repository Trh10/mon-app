import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * API de synchronisation - Recevoir les données du client offline
 * POST /api/sync/push
 */
export async function POST(request: Request) {
  try {
    const record = await request.json();
    const { tableName, recordId, action, data } = record;
    
    // Valider les données
    if (!tableName || !recordId || !action) {
      return NextResponse.json(
        { error: 'Données invalides' },
        { status: 400 }
      );
    }
    
    // Obtenir le model Prisma
    const modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);
    const model = (prisma as any)[modelName];
    
    if (!model) {
      return NextResponse.json(
        { error: `Model ${tableName} non trouvé` },
        { status: 400 }
      );
    }
    
    // Convertir les champs String JSON vers JSON
    const convertedData = convertStringFieldsToJson(tableName, data);
    
    // Exécuter l'action
    switch (action) {
      case 'create':
        await model.create({ data: convertedData });
        break;
        
      case 'update':
        await model.update({
          where: { id: recordId },
          data: convertedData
        });
        break;
        
      case 'delete':
        await model.delete({
          where: { id: recordId }
        });
        break;
        
      default:
        return NextResponse.json(
          { error: `Action ${action} non supportée` },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ 
      success: true,
      recordId,
      action
    });
    
  } catch (error: any) {
    console.error('Erreur sync push:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Convertit les champs String en JSON pour PostgreSQL
 */
function convertStringFieldsToJson(tableName: string, record: any): any {
  const jsonFields: Record<string, string[]> = {
    Message: ['metadata'],
    Task: ['metadata'],
    Meeting: ['participants', 'extractedActions', 'tasksCreated'],
    EmailAccount: ['provider', 'credentials'],
    Invoice: ['clientSnapshot', 'acomptes'],
    TreasuryMonth: ['expensesByCategory'],
  };
  
  const fields = jsonFields[tableName] || [];
  const converted = { ...record };
  
  // Retirer les champs de sync qui n'existent pas en PostgreSQL
  delete converted.syncId;
  delete converted.lastSynced;
  delete converted.needsSync;
  delete converted.localPath;
  delete converted.localReceiptPath;
  
  for (const field of fields) {
    if (converted[field] && typeof converted[field] === 'string') {
      try {
        converted[field] = JSON.parse(converted[field]);
      } catch {
        // Garder comme null si ce n'est pas du JSON valide
        converted[field] = null;
      }
    }
  }
  
  return converted;
}
