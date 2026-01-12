/**
 * Service de synchronisation Online ↔ Offline
 * Gère la synchronisation bidirectionnelle entre SQLite local et PostgreSQL distant
 */

// Types pour la synchronisation
interface SyncRecord {
  tableName: string;
  recordId: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  createdAt: Date;
}

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

// Vérifier si on est en ligne
export function isOnline(): boolean {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return true; // En mode serveur, on suppose qu'on est en ligne
}

// Tables à synchroniser (dans l'ordre pour respecter les foreign keys)
const SYNC_TABLES = [
  'Organization',
  'User',
  'InvoiceClient',
  'ExpenseCategory',
  'Invoice',
  'InvoiceLine',
  'InvoiceSection',
  'InvoiceSectionLine',
  'InvoicePayment',
  'Expense',
  'TreasuryMonth',
  'Requisition',
  'WorkflowStep',
  'Need',
  'NeedWorkflowStep',
  'NeedAttachment',
  'Meeting',
  'Task',
  'TaskRun',
  'Message',
  'ActivityLog',
];

/**
 * Récupère les enregistrements non synchronisés de la base locale
 */
export async function getUnsyncedRecords(localDb: any): Promise<SyncRecord[]> {
  const records: SyncRecord[] = [];
  
  // Lire la queue de synchronisation
  const queue = await localDb.syncQueue.findMany({
    where: { syncedAt: null },
    orderBy: { createdAt: 'asc' }
  });
  
  return queue.map((item: any) => ({
    tableName: item.tableName,
    recordId: item.recordId,
    action: item.action,
    data: JSON.parse(item.data),
    createdAt: item.createdAt
  }));
}

/**
 * Ajoute un enregistrement à la queue de synchronisation
 */
export async function addToSyncQueue(
  localDb: any,
  tableName: string,
  recordId: string,
  action: 'create' | 'update' | 'delete',
  data: any
): Promise<void> {
  await localDb.syncQueue.create({
    data: {
      tableName,
      recordId,
      action,
      data: JSON.stringify(data),
      createdAt: new Date()
    }
  });
  
  // Mettre à jour le compteur de changements
  await localDb.syncStatus.update({
    where: { id: 1 },
    data: { pendingChanges: { increment: 1 } }
  });
}

/**
 * Synchronise les données locales vers le serveur
 */
export async function syncToServer(
  localDb: any,
  serverUrl: string
): Promise<SyncResult> {
  if (!isOnline()) {
    return { success: false, synced: 0, failed: 0, errors: ['Pas de connexion internet'] };
  }
  
  const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };
  const unsyncedRecords = await getUnsyncedRecords(localDb);
  
  for (const record of unsyncedRecords) {
    try {
      const response = await fetch(`${serverUrl}/api/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      
      if (response.ok) {
        // Marquer comme synchronisé
        await localDb.syncQueue.updateMany({
          where: { 
            tableName: record.tableName,
            recordId: record.recordId,
            syncedAt: null
          },
          data: { syncedAt: new Date() }
        });
        result.synced++;
      } else {
        const error = await response.text();
        result.errors.push(`${record.tableName}/${record.recordId}: ${error}`);
        result.failed++;
        
        // Incrémenter le compteur de retry
        await localDb.syncQueue.updateMany({
          where: { 
            tableName: record.tableName,
            recordId: record.recordId,
            syncedAt: null
          },
          data: { 
            retries: { increment: 1 },
            error
          }
        });
      }
    } catch (error: any) {
      result.errors.push(`${record.tableName}/${record.recordId}: ${error.message}`);
      result.failed++;
    }
  }
  
  // Mettre à jour le statut
  await localDb.syncStatus.update({
    where: { id: 1 },
    data: { 
      lastSyncAt: new Date(),
      lastSyncSuccess: result.failed === 0,
      pendingChanges: result.failed
    }
  });
  
  result.success = result.failed === 0;
  return result;
}

/**
 * Récupère les données du serveur vers le local
 */
export async function syncFromServer(
  localDb: any,
  serverUrl: string,
  lastSyncAt?: Date
): Promise<SyncResult> {
  if (!isOnline()) {
    return { success: false, synced: 0, failed: 0, errors: ['Pas de connexion internet'] };
  }
  
  const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };
  
  try {
    const response = await fetch(`${serverUrl}/api/sync/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        lastSyncAt: lastSyncAt?.toISOString(),
        tables: SYNC_TABLES
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erreur serveur: ${response.status}`);
    }
    
    const serverData = await response.json();
    
    // Appliquer les changements du serveur
    for (const tableName of SYNC_TABLES) {
      const records = serverData[tableName] || [];
      
      for (const record of records) {
        try {
          // Convertir JSON en String pour SQLite
          const localRecord = convertJsonFieldsToString(tableName, record);
          
          // Upsert (insert ou update)
          await upsertRecord(localDb, tableName, localRecord);
          result.synced++;
        } catch (error: any) {
          result.errors.push(`${tableName}: ${error.message}`);
          result.failed++;
        }
      }
    }
    
    // Mettre à jour le statut
    await localDb.syncStatus.update({
      where: { id: 1 },
      data: { 
        lastSyncAt: new Date(),
        lastSyncSuccess: result.failed === 0
      }
    });
    
  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message);
  }
  
  return result;
}

/**
 * Synchronisation complète bidirectionnelle
 */
export async function fullSync(
  localDb: any,
  serverUrl: string
): Promise<{ push: SyncResult; pull: SyncResult }> {
  // D'abord envoyer les changements locaux
  const pushResult = await syncToServer(localDb, serverUrl);
  
  // Puis récupérer les changements du serveur
  const status = await localDb.syncStatus.findFirst();
  const pullResult = await syncFromServer(localDb, serverUrl, status?.lastSyncAt);
  
  return { push: pushResult, pull: pullResult };
}

/**
 * Convertit les champs JSON en String pour SQLite
 */
function convertJsonFieldsToString(tableName: string, record: any): any {
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
  
  for (const field of fields) {
    if (converted[field] && typeof converted[field] === 'object') {
      converted[field] = JSON.stringify(converted[field]);
    }
  }
  
  return converted;
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
  
  for (const field of fields) {
    if (converted[field] && typeof converted[field] === 'string') {
      try {
        converted[field] = JSON.parse(converted[field]);
      } catch {
        // Garder comme string si ce n'est pas du JSON valide
      }
    }
  }
  
  return converted;
}

/**
 * Insère ou met à jour un enregistrement
 */
async function upsertRecord(db: any, tableName: string, record: any): Promise<void> {
  const modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);
  const model = db[modelName];
  
  if (!model) {
    throw new Error(`Model ${tableName} not found`);
  }
  
  // Retirer les champs de synchronisation pour l'upsert
  const { syncId, lastSynced, needsSync, ...data } = record;
  
  // Déterminer la clé primaire
  const idField = record.id ? 'id' : 'syncId';
  const idValue = record.id || record.syncId;
  
  await model.upsert({
    where: { [idField]: idValue },
    create: { ...data, syncId, lastSynced: new Date(), needsSync: false },
    update: { ...data, lastSynced: new Date(), needsSync: false }
  });
}

/**
 * Initialise la base de données locale
 */
export async function initLocalDatabase(localDb: any): Promise<void> {
  // Créer l'entrée de statut si elle n'existe pas
  const status = await localDb.syncStatus.findFirst();
  if (!status) {
    await localDb.syncStatus.create({
      data: {
        lastSyncAt: null,
        lastSyncSuccess: false,
        pendingChanges: 0,
        serverUrl: process.env.NEXT_PUBLIC_SERVER_URL || 'https://mon-app1.vercel.app'
      }
    });
  }
}

/**
 * Obtient le statut de synchronisation
 */
export async function getSyncStatus(localDb: any): Promise<{
  isOnline: boolean;
  lastSyncAt: Date | null;
  pendingChanges: number;
  lastSyncSuccess: boolean;
}> {
  const status = await localDb.syncStatus.findFirst();
  
  return {
    isOnline: isOnline(),
    lastSyncAt: status?.lastSyncAt || null,
    pendingChanges: status?.pendingChanges || 0,
    lastSyncSuccess: status?.lastSyncSuccess || false
  };
}
