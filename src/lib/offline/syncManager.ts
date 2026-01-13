/**
 * Sync Manager - Gère la synchronisation automatique avec le serveur
 * Détecte la connexion et synchronise les données en attente
 */

import { offlineStore, OfflineInvoice, PendingSyncItem } from './store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mon-app1.vercel.app';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

class SyncManager {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(status: { online: boolean; syncing: boolean }) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupEventListeners();
      this.startAutoSync();
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Connexion rétablie');
      this.isOnline = true;
      this.notifyListeners();
      this.syncNow();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Connexion perdue');
      this.isOnline = false;
      this.notifyListeners();
    });

    // Écouter les événements Electron si disponibles
    if ((window as any).electronAPI) {
      (window as any).electronAPI.onConnectionChange((_event: any, online: boolean) => {
        this.isOnline = online;
        this.notifyListeners();
        if (online) {
          this.syncNow();
        }
      });

      (window as any).electronAPI.onSyncComplete((_event: any, result: SyncResult) => {
        console.log('✅ Sync terminée:', result);
      });
    }
  }

  private startAutoSync(): void {
    // Sync toutes les 30 secondes quand en ligne
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncNow();
      }
    }, 30000);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // S'abonner aux changements de statut
  subscribe(listener: (status: { online: boolean; syncing: boolean }) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const status = { online: this.isOnline, syncing: this.isSyncing };
    this.listeners.forEach(listener => listener(status));
  }

  getStatus(): { online: boolean; syncing: boolean } {
    return { online: this.isOnline, syncing: this.isSyncing };
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'HEAD',
        cache: 'no-cache'
      });
      this.isOnline = response.ok;
    } catch {
      this.isOnline = false;
    }
    this.notifyListeners();
    return this.isOnline;
  }

  async syncNow(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, synced: 0, failed: 0, errors: ['Sync déjà en cours'] };
    }

    if (!this.isOnline) {
      return { success: false, synced: 0, failed: 0, errors: ['Pas de connexion'] };
    }

    this.isSyncing = true;
    this.notifyListeners();

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    try {
      const pendingItems = await offlineStore.getPendingSyncItems();
      console.log(`🔄 Synchronisation de ${pendingItems.length} éléments...`);

      for (const item of pendingItems) {
        try {
          await this.processSyncItem(item);
          await offlineStore.removePendingSyncItem(item.id);
          result.synced++;
        } catch (error) {
          result.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          result.errors.push(`${item.entity} ${item.type}: ${errorMessage}`);
          
          // Incrémenter le compteur de retry
          await offlineStore.updatePendingSyncItem(item.id, {
            retryCount: item.retryCount + 1,
            lastError: errorMessage
          });

          // Supprimer après 5 échecs
          if (item.retryCount >= 5) {
            console.error(`❌ Abandon sync après 5 échecs:`, item);
            await offlineStore.removePendingSyncItem(item.id);
          }
        }
      }

      result.success = result.failed === 0;
      console.log(`✅ Sync terminée: ${result.synced} réussis, ${result.failed} échecs`);

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Erreur sync');
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return result;
  }

  private async processSyncItem(item: PendingSyncItem): Promise<void> {
    const { type, entity, data } = item;

    switch (entity) {
      case 'invoice':
        await this.syncInvoice(type, data);
        break;
      case 'payment':
        await this.syncPayment(type, data);
        break;
      case 'client':
        await this.syncClient(type, data);
        break;
      default:
        console.warn(`Type d'entité inconnu:`, entity);
    }
  }

  private async syncInvoice(type: string, data: OfflineInvoice): Promise<void> {
    const token = await this.getAuthToken();
    
    switch (type) {
      case 'create': {
        const response = await fetch(`${API_BASE_URL}/api/invoices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            clientName: data.clientName,
            clientEmail: data.clientEmail,
            items: data.items,
            total: data.total,
            orgId: data.orgId
          })
        });

        if (!response.ok) {
          throw new Error(`Erreur création facture: ${response.status}`);
        }

        const serverInvoice = await response.json();
        // Mettre à jour l'ID local avec l'ID serveur
        await offlineStore.markInvoiceAsSynced(data.localId, serverInvoice.id);
        break;
      }

      case 'update': {
        const response = await fetch(`${API_BASE_URL}/api/invoices/${data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          throw new Error(`Erreur mise à jour facture: ${response.status}`);
        }
        break;
      }

      case 'delete': {
        const response = await fetch(`${API_BASE_URL}/api/invoices/${data.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok && response.status !== 404) {
          throw new Error(`Erreur suppression facture: ${response.status}`);
        }
        break;
      }
    }
  }

  private async syncPayment(type: string, data: any): Promise<void> {
    // Implémenter la sync des paiements
    console.log('Sync paiement:', type, data);
  }

  private async syncClient(type: string, data: any): Promise<void> {
    // Implémenter la sync des clients
    console.log('Sync client:', type, data);
  }

  private async getAuthToken(): Promise<string> {
    // Récupérer le token depuis le localStorage ou les cookies
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || '';
    }
    return '';
  }
}

// Instance singleton
export const syncManager = new SyncManager();

// Hook React pour utiliser le sync manager
export function useSyncStatus() {
  if (typeof window === 'undefined') {
    return { online: true, syncing: false };
  }
  
  const [status, setStatus] = useState(syncManager.getStatus());

  useEffect(() => {
    const unsubscribe = syncManager.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

// Import React pour le hook
import { useState, useEffect } from 'react';

export type { SyncResult };
