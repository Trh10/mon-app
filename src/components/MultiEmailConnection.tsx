'use client';

import { useState, useEffect } from 'react';
import { Mail, Plus, Settings, LogOut, Check, AlertCircle } from 'lucide-react';

interface EmailProvider {
  id: string;
  name: string;
  type: 'gmail' | 'outlook' | 'yahoo' | 'imap' | 'exchange' | 'other';
  icon: string;
  color: string;
}

interface EmailAccount {
  id: string;
  email: string;
  provider: EmailProvider;
  isConnected: boolean;
  lastSync: string;
  unreadCount: number;
}

const EMAIL_PROVIDERS: EmailProvider[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    type: 'gmail',
    icon: '📧',
    color: 'bg-red-500'
  },
  {
    id: 'outlook',
    name: 'Outlook',
    type: 'outlook',
    icon: '📮',
    color: 'bg-blue-500'
  },
  {
    id: 'yahoo',
    name: 'Yahoo Mail',
    type: 'yahoo',
    icon: '💜',
    color: 'bg-purple-500'
  },
  {
    id: 'imap',
    name: 'IMAP/SMTP',
    type: 'imap',
    icon: '⚙️',
    color: 'bg-gray-500'
  },
  {
    id: 'exchange',
    name: 'Exchange',
    type: 'exchange',
    icon: '🏢',
    color: 'bg-blue-700'
  },
  {
    id: 'other',
    name: 'Autre',
    type: 'other',
    icon: '📬',
    color: 'bg-green-500'
  }
];

export default function MultiEmailConnection() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<EmailProvider | null>(null);
  const [connectionForm, setConnectionForm] = useState({
    email: '',
    password: '',
    imapServer: '',
    imapPort: '993',
    smtpServer: '',
    smtpPort: '587',
    useSSL: true
  });
  const [connecting, setConnecting] = useState(false);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/email/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
        setActiveAccount(data.activeAccount);
      }
    } catch (error) {
      console.error('Erreur chargement comptes:', error);
    }
  };

  const handleProviderSelect = (provider: EmailProvider) => {
    setSelectedProvider(provider);
    
    // Pré-remplir les serveurs selon le provider
    if (provider.type === 'gmail') {
      setConnectionForm(prev => ({
        ...prev,
        imapServer: 'imap.gmail.com',
        imapPort: '993',
        smtpServer: 'smtp.gmail.com',
        smtpPort: '587'
      }));
    } else if (provider.type === 'outlook') {
      setConnectionForm(prev => ({
        ...prev,
        imapServer: 'outlook.office365.com',
        imapPort: '993',
        smtpServer: 'smtp.office365.com',
        smtpPort: '587'
      }));
    } else if (provider.type === 'yahoo') {
      setConnectionForm(prev => ({
        ...prev,
        imapServer: 'imap.mail.yahoo.com',
        imapPort: '993',
        smtpServer: 'smtp.mail.yahoo.com',
        smtpPort: '587'
      }));
    }
  };

  const handleConnect = async () => {
    if (!selectedProvider || !connectionForm.email) return;

    setConnecting(true);
    try {
      const response = await fetch('/api/email/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: selectedProvider,
          credentials: connectionForm
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Ajouter le nouveau compte
        const newAccount: EmailAccount = {
          id: data.accountId,
          email: connectionForm.email,
          provider: selectedProvider,
          isConnected: true,
          lastSync: new Date().toISOString(),
          unreadCount: data.unreadCount || 0
        };
        
        setAccounts(prev => [...prev, newAccount]);
        setActiveAccount(newAccount.id);
        
        // Reset form
        setShowAddAccount(false);
        setSelectedProvider(null);
        setConnectionForm({
          email: '',
          password: '',
          imapServer: '',
          imapPort: '993',
          smtpServer: '',
          smtpPort: '587',
          useSSL: true
        });
        
        alert('Compte connecté avec succès !');
      } else {
        alert('Erreur de connexion: ' + data.error);
      }
    } catch (error) {
      alert('Erreur réseau');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      const response = await fetch(`/api/email/disconnect/${accountId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setAccounts(prev => prev.filter(acc => acc.id !== accountId));
        if (activeAccount === accountId) {
          setActiveAccount(null);
        }
      }
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  const switchAccount = async (accountId: string) => {
    try {
      const response = await fetch('/api/email/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId }),
      });
      
      if (response.ok) {
        setActiveAccount(accountId);
      }
    } catch (error) {
      console.error('Erreur changement compte:', error);
    }
  };

  const getConnectionStatus = () => {
    const activeAcc = accounts.find(acc => acc.id === activeAccount);
    if (!activeAcc) return 'Déconnecté';
    
    return `Connecté à ${activeAcc.provider.name}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header avec statut de connexion */}
      <div className="flex items-center justify-between bg-white rounded-lg border p-4">
        <div className="flex items-center space-x-3">
          <Mail className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold">Comptes Email</h2>
            <p className="text-sm text-gray-600">{getConnectionStatus()}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {activeAccount && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded">
              <Check className="h-4 w-4" />
              <span className="text-sm">Actif</span>
            </div>
          )}
          
          <button
            onClick={() => setShowAddAccount(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter un compte</span>
          </button>
        </div>
      </div>

      {/* Liste des comptes connectés */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Comptes connectés</h3>
        </div>
        
        <div className="divide-y">
          {accounts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Mail className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Aucun compte email connecté</p>
              <p className="text-sm">Cliquez sur "Ajouter un compte" pour commencer</p>
            </div>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                className={`p-4 flex items-center justify-between hover:bg-gray-50 ${
                  activeAccount === account.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full ${account.provider.color} flex items-center justify-center text-white text-lg`}>
                    {account.provider.icon}
                  </div>
                  <div>
                    <div className="font-medium">{account.email}</div>
                    <div className="text-sm text-gray-600 flex items-center space-x-2">
                      <span>{account.provider.name}</span>
                      {account.isConnected ? (
                        <span className="flex items-center text-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Connecté
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Déconnecté
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {account.unreadCount > 0 && (
                    <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                      {account.unreadCount}
                    </span>
                  )}
                  
                  {activeAccount !== account.id && (
                    <button
                      onClick={() => switchAccount(account.id)}
                      className="px-3 py-1 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
                    >
                      Activer
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDisconnect(account.id)}
                    className="p-1 text-gray-500 hover:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal d'ajout de compte */}
      {showAddAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Ajouter un compte email</h3>
                <button
                  onClick={() => {
                    setShowAddAccount(false);
                    setSelectedProvider(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {!selectedProvider ? (
                <div>
                  <p className="text-gray-600 mb-4">Choisissez votre fournisseur email :</p>
                  <div className="grid grid-cols-2 gap-3">
                    {EMAIL_PROVIDERS.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => handleProviderSelect(provider)}
                        className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 text-left"
                      >
                        <div className={`w-10 h-10 rounded-full ${provider.color} flex items-center justify-center text-white text-lg`}>
                          {provider.icon}
                        </div>
                        <span className="font-medium">{provider.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                    <div className={`w-8 h-8 rounded-full ${selectedProvider.color} flex items-center justify-center text-white`}>
                      {selectedProvider.icon}
                    </div>
                    <span className="font-medium">{selectedProvider.name}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input
                        type="email"
                        value={connectionForm.email}
                        onChange={(e) => setConnectionForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="votre@email.com"
                        className="w-full p-2 border rounded bg-white text-gray-900 placeholder-gray-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Mot de passe</label>
                      <input
                        type="password"
                        value={connectionForm.password}
                        onChange={(e) => setConnectionForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Votre mot de passe"
                        className="w-full p-2 border rounded bg-white text-gray-900 placeholder-gray-400"
                      />
                    </div>

                    {selectedProvider.type === 'imap' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Serveur IMAP</label>
                            <input
                              type="text"
                              value={connectionForm.imapServer}
                              onChange={(e) => setConnectionForm(prev => ({ ...prev, imapServer: e.target.value }))}
                              placeholder="imap.example.com"
                              className="w-full p-2 border rounded bg-white text-gray-900 placeholder-gray-400"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Port IMAP</label>
                            <input
                              type="text"
                              value={connectionForm.imapPort}
                              onChange={(e) => setConnectionForm(prev => ({ ...prev, imapPort: e.target.value }))}
                              className="w-full p-2 border rounded bg-white text-gray-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Serveur SMTP</label>
                            <input
                              type="text"
                              value={connectionForm.smtpServer}
                              onChange={(e) => setConnectionForm(prev => ({ ...prev, smtpServer: e.target.value }))}
                              placeholder="smtp.example.com"
                              className="w-full p-2 border rounded bg-white text-gray-900 placeholder-gray-400"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Port SMTP</label>
                            <input
                              type="text"
                              value={connectionForm.smtpPort}
                              onChange={(e) => setConnectionForm(prev => ({ ...prev, smtpPort: e.target.value }))}
                              className="w-full p-2 border rounded bg-white text-gray-900"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="useSSL"
                            checked={connectionForm.useSSL}
                            onChange={(e) => setConnectionForm(prev => ({ ...prev, useSSL: e.target.checked }))}
                          />
                          <label htmlFor="useSSL" className="text-sm">Utiliser SSL/TLS</label>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setSelectedProvider(null)}
                      className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                    >
                      Retour
                    </button>
                    <button
                      onClick={handleConnect}
                      disabled={connecting || !connectionForm.email || !connectionForm.password}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {connecting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                      <span>{connecting ? 'Connexion...' : 'Connecter'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
