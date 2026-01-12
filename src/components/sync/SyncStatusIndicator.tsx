'use client';

import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';

interface SyncStatus {
  isOnline: boolean;
  lastSyncAt: string | null;
  pendingChanges: number;
  lastSyncSuccess: boolean;
}

export default function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: true,
    lastSyncAt: null,
    pendingChanges: 0,
    lastSyncSuccess: true
  });
  const [syncing, setSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Vérifier le statut périodiquement
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Toutes les 30 secondes
    
    // Écouter les événements online/offline
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/sync/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch {
      setStatus(prev => ({ ...prev, isOnline: false }));
    }
  };

  const handleOnline = () => {
    setStatus(prev => ({ ...prev, isOnline: true }));
    // Auto-sync quand on revient en ligne
    handleSync();
  };

  const handleOffline = () => {
    setStatus(prev => ({ ...prev, isOnline: false }));
  };

  const handleSync = async () => {
    if (syncing || !status.isOnline) return;
    
    setSyncing(true);
    try {
      const response = await fetch('/api/sync/trigger', { method: 'POST' });
      if (response.ok) {
        await checkStatus();
      }
    } catch (error) {
      console.error('Erreur sync:', error);
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Jamais';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="relative">
      {/* Bouton principal */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
          status.isOnline
            ? status.pendingChanges > 0
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-red-100 text-red-700 hover:bg-red-200'
        }`}
      >
        {status.isOnline ? (
          status.pendingChanges > 0 ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Cloud className="w-4 h-4" />
          )
        ) : (
          <CloudOff className="w-4 h-4" />
        )}
        
        <span className="text-sm font-medium">
          {status.isOnline 
            ? status.pendingChanges > 0 
              ? `${status.pendingChanges} en attente`
              : 'En ligne'
            : 'Hors ligne'
          }
        </span>
      </button>

      {/* Panneau détails */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
          <div className="space-y-3">
            {/* Statut connexion */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Connexion</span>
              <span className={`flex items-center gap-1 text-sm font-medium ${
                status.isOnline ? 'text-green-600' : 'text-red-600'
              }`}>
                {status.isOnline ? (
                  <>
                    <Check className="w-4 h-4" />
                    En ligne
                  </>
                ) : (
                  <>
                    <CloudOff className="w-4 h-4" />
                    Hors ligne
                  </>
                )}
              </span>
            </div>

            {/* Dernière sync */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Dernière sync</span>
              <span className="text-sm font-medium text-gray-900">
                {formatDate(status.lastSyncAt)}
              </span>
            </div>

            {/* Changements en attente */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">En attente</span>
              <span className={`text-sm font-medium ${
                status.pendingChanges > 0 ? 'text-yellow-600' : 'text-gray-900'
              }`}>
                {status.pendingChanges} modification(s)
              </span>
            </div>

            {/* Bouton sync */}
            <button
              onClick={handleSync}
              disabled={syncing || !status.isOnline}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                syncing || !status.isOnline
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
            </button>

            {/* Message mode offline */}
            {!status.isOnline && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-700">
                  Mode hors ligne actif. Vos modifications seront synchronisées automatiquement 
                  lorsque la connexion sera rétablie.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
