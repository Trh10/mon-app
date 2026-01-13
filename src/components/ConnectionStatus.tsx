'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Check, AlertCircle } from 'lucide-react';

interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pendingCount?: number;
  lastSyncTime?: string;
}

export function ConnectionStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    online: true,
    syncing: false,
    pendingCount: 0
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Vérifier le statut initial
    setStatus(prev => ({
      ...prev,
      online: navigator.onLine
    }));

    // Écouter les événements de connexion
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, online: true }));
      // Trigger sync automatique
      triggerSync();
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, online: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Écouter les événements Electron
    if ((window as any).electronAPI) {
      (window as any).electronAPI.onConnectionChange((_event: any, online: boolean) => {
        setStatus(prev => ({ ...prev, online }));
        if (online) triggerSync();
      });
    }

    // Charger le nombre d'éléments en attente
    loadPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingCount = async () => {
    try {
      const { offlineStore } = await import('@/lib/offline');
      const items = await offlineStore.getPendingSyncItems();
      setStatus(prev => ({ ...prev, pendingCount: items.length }));
    } catch (error) {
      console.error('Erreur chargement pending count:', error);
    }
  };

  const triggerSync = async () => {
    if (status.syncing) return;
    
    setStatus(prev => ({ ...prev, syncing: true }));
    
    try {
      const { syncManager } = await import('@/lib/offline');
      await syncManager.syncNow();
      
      setStatus(prev => ({
        ...prev,
        syncing: false,
        lastSyncTime: new Date().toLocaleTimeString()
      }));
      
      // Recharger le count
      await loadPendingCount();
    } catch (error) {
      console.error('Erreur sync:', error);
      setStatus(prev => ({ ...prev, syncing: false }));
    }
  };

  return (
    <div className="relative">
      {/* Indicateur principal */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          status.online
            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
        }`}
      >
        {status.syncing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : status.online ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        
        <span className="hidden sm:inline">
          {status.syncing
            ? 'Synchronisation...'
            : status.online
            ? 'En ligne'
            : 'Hors ligne'}
        </span>

        {/* Badge pour éléments en attente */}
        {status.pendingCount && status.pendingCount > 0 && (
          <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {status.pendingCount}
          </span>
        )}
      </button>

      {/* Menu détaillé */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="space-y-3">
            {/* Statut connexion */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Statut</span>
              <span className={`flex items-center gap-1 font-medium ${
                status.online ? 'text-green-600' : 'text-red-600'
              }`}>
                {status.online ? (
                  <>
                    <Check className="w-4 h-4" />
                    Connecté
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Hors ligne
                  </>
                )}
              </span>
            </div>

            {/* Éléments en attente */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">En attente</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {status.pendingCount || 0} élément{(status.pendingCount || 0) > 1 ? 's' : ''}
              </span>
            </div>

            {/* Dernière sync */}
            {status.lastSyncTime && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Dernière sync</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {status.lastSyncTime}
                </span>
              </div>
            )}

            {/* Bouton sync manuelle */}
            <button
              onClick={triggerSync}
              disabled={!status.online || status.syncing}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                status.online && !status.syncing
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${status.syncing ? 'animate-spin' : ''}`} />
              {status.syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
            </button>

            {/* Message hors ligne */}
            {!status.online && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Vos modifications seront synchronisées automatiquement quand la connexion sera rétablie.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectionStatus;
