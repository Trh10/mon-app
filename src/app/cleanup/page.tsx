'use client';

import { useState, useEffect } from 'react';
import { Trash2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export default function CleanupPage() {
  const [dataStatus, setDataStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    checkDataStatus();
    loadAccounts();
  }, []);

  const checkDataStatus = async () => {
    try {
      const response = await fetch('/api/reset');
      const data = await response.json();
      setDataStatus(data);
    } catch (error) {
      console.error('Erreur vérification:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/email/accounts');
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Erreur comptes:', error);
    }
  };

  const clearSessions = async () => {
    try {
      const response = await fetch('/api/clear-session', {
        method: 'POST'
      });
      
      const data = await response.json();
      if (data.success) {
        alert('✅ Sessions nettoyées !');
        window.location.reload();
      }
    } catch (error) {
      alert('❌ Erreur nettoyage sessions');
    }
  };

  const cleanupAll = async () => {
    if (!confirm('Voulez-vous vraiment supprimer TOUTES les données et connexions ?')) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/reset', {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        alert('✅ Nettoyage terminé ! Toutes les connexions Gmail/email ont été supprimées.');
        setDataStatus(null);
        setAccounts([]);
        checkDataStatus();
        loadAccounts();
      } else {
        alert('❌ Erreur: ' + data.error);
      }
    } catch (error) {
      alert('❌ Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h1 className="text-2xl font-bold mb-4 flex items-center">
          🧹 Nettoyage des Données Email
        </h1>
        <p className="text-gray-600">
          Cette page vous permet de supprimer toutes les connexions Gmail persistantes et remettre l'application à zéro.
        </p>
      </div>

      {/* État actuel */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">État actuel du système</h2>
          <button
            onClick={() => { checkDataStatus(); loadAccounts(); }}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Actualiser</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-3">Fichiers de données</h3>
            {dataStatus ? (
              <div className="space-y-2">
                {dataStatus.existingFiles?.length > 0 ? (
                  dataStatus.existingFiles.map((file: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>{file}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Aucun fichier de données</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500">Chargement...</div>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-3">Comptes email connectés</h3>
            <div className="space-y-2">
              {accounts.length > 0 ? (
                accounts.map((account, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>{account.email} ({account.provider.name})</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Aucun compte connecté</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action de nettoyage */}
      {(dataStatus?.existingFiles?.length > 0 || accounts.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-3">
            ⚠️ Nettoyage nécessaire
          </h2>
          <p className="text-red-700 mb-4">
            Des connexions ou données persistent. Cliquez sur le bouton ci-dessous pour tout supprimer et repartir à zéro.
          </p>
          
          <div className="flex space-x-3">
            <button
              onClick={cleanupAll}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
              <span>{loading ? 'Nettoyage en cours...' : 'Supprimer toutes les données'}</span>
            </button>
            
            <button
              onClick={clearSessions}
              className="flex items-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              <RefreshCw className="h-5 w-5" />
              <span>Nettoyer sessions</span>
            </button>
          </div>
        </div>
      )}

      {/* État propre */}
      {(!dataStatus?.existingFiles || dataStatus.existingFiles.length === 0) && accounts.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-800 mb-3">
            ✅ Système propre
          </h2>
          <p className="text-green-700 mb-4">
            Aucune connexion persistante détectée. Vous pouvez maintenant connecter vos comptes normalement.
          </p>
          
          <div className="flex space-x-3">
            <a 
              href="/" 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Aller à l'interface mail
            </a>
            <a 
              href="/email-accounts" 
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Connecter un compte
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
