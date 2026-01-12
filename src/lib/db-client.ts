/**
 * Client de base de données adaptatif
 * Utilise PostgreSQL en mode web ou SQLite en mode desktop/offline
 */

import { PrismaClient } from '@prisma/client';

// Détecter le mode d'exécution
const isElectron = typeof process !== 'undefined' && 
                   process.versions && 
                   process.versions.electron;

const isOfflineMode = process.env.OFFLINE_MODE === 'true' || isElectron;

// Client PostgreSQL (mode web)
let postgresClient: PrismaClient | null = null;

// Client SQLite (mode offline) - sera importé dynamiquement
let sqliteClient: any = null;

/**
 * Obtient le client Prisma approprié selon le mode
 */
export function getDbClient(): PrismaClient {
  if (isOfflineMode) {
    return getOfflineClient();
  }
  return getOnlineClient();
}

/**
 * Client PostgreSQL pour le mode en ligne
 */
function getOnlineClient(): PrismaClient {
  if (!postgresClient) {
    postgresClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }
  return postgresClient;
}

/**
 * Client SQLite pour le mode hors ligne
 */
function getOfflineClient(): PrismaClient {
  if (!sqliteClient) {
    // En mode offline, utiliser le client SQLite généré
    // Note: Nécessite d'avoir exécuté: npx prisma generate --schema=prisma/schema-sqlite.prisma
    try {
      // Import dynamique du client SQLite
      const { PrismaClient: SqlitePrismaClient } = require('../prisma/generated/sqlite-client');
      sqliteClient = new SqlitePrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL_LOCAL || 'file:./local-data.db'
          }
        }
      });
    } catch (error) {
      console.error('Erreur client SQLite, fallback vers PostgreSQL:', error);
      return getOnlineClient();
    }
  }
  return sqliteClient;
}

/**
 * Vérifie si l'application est en mode hors ligne
 */
export function isOffline(): boolean {
  return isOfflineMode;
}

/**
 * Vérifie si on peut se connecter au serveur
 */
export async function canReachServer(): Promise<boolean> {
  if (typeof fetch === 'undefined') return false;
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || ''}/api/health`, {
      method: 'HEAD',
      cache: 'no-cache'
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Wrapper pour les opérations de base de données
 * Ajoute automatiquement les enregistrements à la queue de sync en mode offline
 */
export function createDbWrapper(client: PrismaClient) {
  if (!isOfflineMode) {
    return client;
  }
  
  // En mode offline, wrapper les opérations pour la sync
  return new Proxy(client, {
    get(target, prop) {
      const value = (target as any)[prop];
      
      // Si c'est un model Prisma
      if (typeof value === 'object' && value !== null) {
        return new Proxy(value, {
          get(modelTarget, modelProp) {
            const modelValue = (modelTarget as any)[modelProp];
            
            // Wrapper les opérations d'écriture
            if (typeof modelValue === 'function' && 
                ['create', 'update', 'delete', 'upsert'].includes(modelProp as string)) {
              return async (...args: any[]) => {
                const result = await modelValue.apply(modelTarget, args);
                
                // Ajouter à la queue de sync
                const { addToSyncQueue } = await import('./sync/syncService');
                await addToSyncQueue(
                  target,
                  prop as string,
                  result.id || result.syncId,
                  modelProp === 'delete' ? 'delete' : 
                    modelProp === 'create' ? 'create' : 'update',
                  result
                );
                
                return result;
              };
            }
            
            return modelValue;
          }
        });
      }
      
      return value;
    }
  });
}

// Export du client principal
export const db = getDbClient();
export const prisma = db; // Alias pour compatibilité

export default db;
