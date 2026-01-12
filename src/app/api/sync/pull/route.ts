import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Tables à synchroniser (dans l'ordre pour respecter les foreign keys)
const SYNC_TABLES = [
  'organization',
  'user',
  'invoiceClient',
  'expenseCategory',
  'invoice',
  'invoiceLine',
  'invoiceSection',
  'invoiceSectionLine',
  'invoicePayment',
  'expense',
  'treasuryMonth',
  'requisition',
  'workflowStep',
  'need',
  'needWorkflowStep',
  'needAttachment',
  'meeting',
  'task',
  'taskRun',
  'message',
  'activityLog',
];

/**
 * API de synchronisation - Envoyer les données au client offline
 * POST /api/sync/pull
 */
export async function POST(request: Request) {
  try {
    const { lastSyncAt, tables } = await request.json();
    
    const result: Record<string, any[]> = {};
    const syncDate = lastSyncAt ? new Date(lastSyncAt) : null;
    
    // Pour chaque table demandée
    for (const tableName of (tables || SYNC_TABLES)) {
      const modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);
      const model = (prisma as any)[modelName];
      
      if (!model) continue;
      
      try {
        // Récupérer les enregistrements modifiés depuis la dernière sync
        const whereClause = syncDate ? {
          updatedAt: { gte: syncDate }
        } : {};
        
        const records = await model.findMany({
          where: whereClause,
          orderBy: { createdAt: 'asc' }
        });
        
        // Convertir les champs JSON en String pour SQLite
        result[tableName] = records.map((record: any) => 
          convertJsonFieldsToString(tableName, record)
        );
        
      } catch (error) {
        console.error(`Erreur sync pull ${tableName}:`, error);
        result[tableName] = [];
      }
    }
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Erreur sync pull:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Convertit les champs JSON en String pour SQLite
 */
function convertJsonFieldsToString(tableName: string, record: any): any {
  const jsonFields: Record<string, string[]> = {
    message: ['metadata'],
    task: ['metadata'],
    meeting: ['participants', 'extractedActions', 'tasksCreated'],
    emailAccount: ['provider', 'credentials'],
    invoice: ['clientSnapshot', 'acomptes'],
    treasuryMonth: ['expensesByCategory'],
  };
  
  const fields = jsonFields[tableName.toLowerCase()] || [];
  const converted = { ...record };
  
  // Ajouter un syncId unique
  converted.syncId = `${tableName}-${record.id}`;
  
  for (const field of fields) {
    if (converted[field] && typeof converted[field] === 'object') {
      converted[field] = JSON.stringify(converted[field]);
    }
  }
  
  return converted;
}
