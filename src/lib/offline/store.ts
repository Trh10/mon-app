/**
 * Offline Store - Système de stockage local pour le mode hors ligne
 * Utilise IndexedDB pour stocker les factures localement
 */

const DB_NAME = 'MonAppOfflineDB';
const DB_VERSION = 1;

// Stores (tables) dans la base de données
const STORES = {
  INVOICES: 'invoices',
  PENDING_SYNC: 'pendingSync',
  SETTINGS: 'settings',
  CACHE: 'cache'
};

interface OfflineInvoice {
  id: string;
  localId: string;
  clientName: string;
  clientEmail?: string;
  items: InvoiceItem[];
  total: number;
  status: 'draft' | 'pending' | 'synced';
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  orgId: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PendingSyncItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'invoice' | 'payment' | 'client';
  data: any;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

class OfflineStore {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Erreur ouverture IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('✅ IndexedDB initialisé');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store pour les factures
        if (!db.objectStoreNames.contains(STORES.INVOICES)) {
          const invoiceStore = db.createObjectStore(STORES.INVOICES, { keyPath: 'localId' });
          invoiceStore.createIndex('status', 'status', { unique: false });
          invoiceStore.createIndex('orgId', 'orgId', { unique: false });
          invoiceStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Store pour les éléments en attente de synchronisation
        if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
          const syncStore = db.createObjectStore(STORES.PENDING_SYNC, { keyPath: 'id' });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Store pour les paramètres
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }

        // Store pour le cache
        if (!db.objectStoreNames.contains(STORES.CACHE)) {
          const cacheStore = db.createObjectStore(STORES.CACHE, { keyPath: 'key' });
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        console.log('✅ Stores IndexedDB créés');
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // ============ FACTURES ============

  async saveInvoice(invoice: Omit<OfflineInvoice, 'localId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    await this.init();
    
    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const invoiceData: OfflineInvoice = {
      ...invoice,
      localId,
      id: invoice.id || localId,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };

    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.INVOICES, 'readwrite');
      const request = store.add(invoiceData);
      
      request.onsuccess = () => {
        console.log('✅ Facture sauvegardée localement:', localId);
        // Ajouter à la queue de sync
        this.addToPendingSync({
          type: 'create',
          entity: 'invoice',
          data: invoiceData
        });
        resolve(localId);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async updateInvoice(localId: string, updates: Partial<OfflineInvoice>): Promise<void> {
    await this.init();
    
    const invoice = await this.getInvoice(localId);
    if (!invoice) {
      throw new Error('Facture non trouvée');
    }

    const updatedInvoice = {
      ...invoice,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.INVOICES, 'readwrite');
      const request = store.put(updatedInvoice);
      
      request.onsuccess = () => {
        // Ajouter à la queue de sync si déjà synced
        if (invoice.status === 'synced') {
          this.addToPendingSync({
            type: 'update',
            entity: 'invoice',
            data: updatedInvoice
          });
        }
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async getInvoice(localId: string): Promise<OfflineInvoice | null> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.INVOICES);
      const request = store.get(localId);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllInvoices(orgId?: string): Promise<OfflineInvoice[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.INVOICES);
      const request = orgId 
        ? store.index('orgId').getAll(orgId)
        : store.getAll();
      
      request.onsuccess = () => {
        const invoices = request.result || [];
        // Trier par date de création décroissante
        invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(invoices);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingInvoices(): Promise<OfflineInvoice[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.INVOICES);
      const request = store.index('status').getAll('pending');
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async markInvoiceAsSynced(localId: string, serverId: string): Promise<void> {
    await this.init();
    
    const invoice = await this.getInvoice(localId);
    if (!invoice) return;

    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.INVOICES, 'readwrite');
      const updatedInvoice = {
        ...invoice,
        id: serverId,
        status: 'synced' as const,
        syncedAt: new Date().toISOString()
      };
      
      const request = store.put(updatedInvoice);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteInvoice(localId: string): Promise<void> {
    await this.init();
    
    const invoice = await this.getInvoice(localId);
    
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.INVOICES, 'readwrite');
      const request = store.delete(localId);
      
      request.onsuccess = () => {
        // Si déjà synced, ajouter delete à la queue
        if (invoice?.status === 'synced' && invoice.id !== invoice.localId) {
          this.addToPendingSync({
            type: 'delete',
            entity: 'invoice',
            data: { id: invoice.id }
          });
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ============ SYNC QUEUE ============

  async addToPendingSync(item: Omit<PendingSyncItem, 'id' | 'createdAt' | 'retryCount'>): Promise<void> {
    await this.init();
    
    const syncItem: PendingSyncItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.PENDING_SYNC, 'readwrite');
      const request = store.add(syncItem);
      
      request.onsuccess = () => {
        console.log('📋 Ajouté à la queue de sync:', syncItem.type, syncItem.entity);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSyncItems(): Promise<PendingSyncItem[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.PENDING_SYNC);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const items = request.result || [];
        // Trier par date de création
        items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingSyncItem(id: string): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.PENDING_SYNC, 'readwrite');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updatePendingSyncItem(id: string, updates: Partial<PendingSyncItem>): Promise<void> {
    await this.init();
    
    return new Promise(async (resolve, reject) => {
      const store = this.getStore(STORES.PENDING_SYNC, 'readwrite');
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (!item) {
          resolve();
          return;
        }
        
        const updatedItem = { ...item, ...updates };
        const putRequest = store.put(updatedItem);
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // ============ SETTINGS ============

  async setSetting(key: string, value: any): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.SETTINGS, 'readwrite');
      const request = store.put({ key, value });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSetting<T>(key: string): Promise<T | null> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.SETTINGS);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ CACHE ============

  async setCache(key: string, data: any, ttlSeconds: number = 3600): Promise<void> {
    await this.init();
    
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.CACHE, 'readwrite');
      const request = store.put({ key, data, expiresAt });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCache<T>(key: string): Promise<T | null> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.CACHE);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        
        // Vérifier expiration
        if (new Date(result.expiresAt) < new Date()) {
          // Supprimer le cache expiré
          this.deleteCache(key);
          resolve(null);
          return;
        }
        
        resolve(result.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCache(key: string): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.CACHE, 'readwrite');
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearExpiredCache(): Promise<void> {
    await this.init();
    
    const store = this.getStore(STORES.CACHE, 'readwrite');
    const index = store.index('expiresAt');
    const now = new Date().toISOString();
    
    const range = IDBKeyRange.upperBound(now);
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  // ============ STATS ============

  async getStats(): Promise<{
    totalInvoices: number;
    pendingInvoices: number;
    syncedInvoices: number;
    pendingSyncItems: number;
  }> {
    await this.init();
    
    const invoices = await this.getAllInvoices();
    const pendingSync = await this.getPendingSyncItems();
    
    return {
      totalInvoices: invoices.length,
      pendingInvoices: invoices.filter(i => i.status === 'pending').length,
      syncedInvoices: invoices.filter(i => i.status === 'synced').length,
      pendingSyncItems: pendingSync.length
    };
  }

  // ============ CLEANUP ============

  async clearAll(): Promise<void> {
    if (!this.db) return;
    
    const storeNames = [STORES.INVOICES, STORES.PENDING_SYNC, STORES.SETTINGS, STORES.CACHE];
    
    for (const storeName of storeNames) {
      await new Promise<void>((resolve, reject) => {
        const store = this.getStore(storeName, 'readwrite');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    
    console.log('🗑️ Toutes les données locales supprimées');
  }
}

// Instance singleton
export const offlineStore = new OfflineStore();

// Export des types
export type { OfflineInvoice, InvoiceItem, PendingSyncItem };
