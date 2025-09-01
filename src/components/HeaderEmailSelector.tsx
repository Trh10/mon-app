'use client';

import { useState, useEffect } from 'react';
import { Mail, ChevronDown, Plus, Settings } from 'lucide-react';

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

interface Props {
  onAccountChange?: (account: EmailAccount | null) => void;
  onConnectNew?: () => void;
  compact?: boolean;
}

export default function HeaderEmailSelector({ onAccountChange, onConnectNew, compact = true }: Props) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

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
        
        if (data.activeAccount && onAccountChange) {
          const active = data.accounts.find((acc: EmailAccount) => acc.id === data.activeAccount);
          onAccountChange(active || null);
        }
      }
    } catch (error) {
      console.error('Erreur chargement comptes:', error);
    } finally {
      setLoading(false);
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
        setShowDropdown(false);
        
        if (onAccountChange) {
          const account = accounts.find(acc => acc.id === accountId);
          onAccountChange(account || null);
        }
      }
    } catch (error) {
      console.error('Erreur changement compte:', error);
    }
  };

  const getActiveAccount = () => {
    return accounts.find(acc => acc.id === activeAccount);
  };

  const getStatusText = () => {
    const active = getActiveAccount();
    if (!active) return 'Déconnecté';
    return `Connecté à ${active.provider.name}`;
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 rounded-lg text-white">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span className="text-sm">Chargement...</span>
      </div>
    );
  }

  const activeAcc = getActiveAccount();

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-white min-w-[200px]"
      >
        {activeAcc ? (
          <div className={`w-4 h-4 rounded-full ${activeAcc.provider.color} flex items-center justify-center text-white text-xs flex-shrink-0`}>
            {activeAcc.provider.icon}
          </div>
        ) : (
          <Mail className="h-4 w-4 text-blue-100 flex-shrink-0" />
        )}
        
        <div className="flex-1 text-left overflow-hidden">
          <div className="text-sm font-medium truncate">
            {activeAcc ? activeAcc.email.split('@')[0] : 'Email'}
          </div>
        </div>
        
        {activeAcc && activeAcc.unreadCount > 0 && (
          <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full flex-shrink-0">
            {activeAcc.unreadCount}
          </span>
        )}
        
        <ChevronDown className="h-4 w-4 text-blue-100 flex-shrink-0" />
      </button>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b">
            <h3 className="font-medium text-gray-900 text-sm">{getStatusText()}</h3>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {accounts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Mail className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Aucun compte connecté</p>
              </div>
            ) : (
              accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => switchAccount(account.id)}
                  className={`w-full flex items-center justify-between p-3 hover:bg-gray-50 text-left ${
                    activeAccount === account.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full ${account.provider.color} flex items-center justify-center text-white text-xs`}>
                      {account.provider.icon}
                    </div>
                    <div>
                      <div className="font-medium text-sm truncate">{account.email}</div>
                      <div className="text-xs text-gray-500">{account.provider.name}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {account.unreadCount > 0 && (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                        {account.unreadCount}
                      </span>
                    )}
                    {activeAccount === account.id && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
          
          <div className="p-2 border-t space-y-1">
            <button
              onClick={() => {
                setShowDropdown(false);
                if (onConnectNew) {
                  onConnectNew();
                }
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter un compte</span>
            </button>
            
            <button
              onClick={() => {
                setShowDropdown(false);
                window.open('/email-accounts', '_blank');
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded text-sm"
            >
              <Settings className="h-4 w-4" />
              <span>Gérer les comptes</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
