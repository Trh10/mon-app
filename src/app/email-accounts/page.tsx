"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Trash2, RefreshCw, Settings, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EmailAccount {
  id: string;
  email: string;
  provider: {
    id: string;
    name: string;
    type: string;
    icon: string;
    color: string;
  };
  isConnected: boolean;
  unreadCount: number;
}

export default function EmailAccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/email/accounts');
      const data = await response.json();
      setAccounts(data.accounts || []);
      setActiveAccount(data.activeAccount);
    } catch (error) {
      console.error('Erreur chargement comptes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce compte ?')) return;

    try {
      const response = await fetch('/api/email/accounts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId })
      });

      if (response.ok) {
        await loadAccounts();
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const handleSwitchAccount = async (accountId: string) => {
    try {
      const response = await fetch('/api/email/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId })
      });

      if (response.ok) {
        setActiveAccount(accountId);
      }
    } catch (error) {
      console.error('Erreur changement de compte:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des comptes email</h1>
          <p className="text-gray-600 mt-2">Gérez vos connexions email</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={loadAccounts}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Ajouter un compte
          </button>
        </div>

        {/* Liste des comptes */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Comptes connectés ({accounts.length})</h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Chargement...</span>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucun compte connecté</p>
                <button
                  onClick={() => router.push('/')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Connecter un compte
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      activeAccount === account.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${account.provider.color} rounded-full flex items-center justify-center text-white`}>
                        {account.provider.icon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{account.email}</div>
                        <div className="text-sm text-gray-600">
                          {account.provider.name} • {account.unreadCount} non lus
                        </div>
                      </div>
                      {activeAccount === account.id && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Actif
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {activeAccount !== account.id && (
                        <button
                          onClick={() => handleSwitchAccount(account.id)}
                          className="px-3 py-1 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
                        >
                          Activer
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Debug info */}
        {accounts.length > 0 && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Debug Info</h3>
            <pre className="text-xs text-gray-600 overflow-auto">
              {JSON.stringify({ accounts, activeAccount }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
