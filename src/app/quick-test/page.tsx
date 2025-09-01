'use client';

import { useState } from 'react';

export default function QuickTestPage() {
  const [loading, setLoading] = useState(false);

  const testAccounts = [
    {
      provider: { id: 'gmail', name: 'Gmail', type: 'gmail', icon: '📧', color: 'bg-red-500' },
      credentials: { email: 'test@gmail.com', password: 'testpass123' }
    },
    {
      provider: { id: 'outlook', name: 'Outlook', type: 'outlook', icon: '📮', color: 'bg-blue-500' },
      credentials: { email: 'test@outlook.com', password: 'testpass123' }
    },
    {
      provider: { id: 'yahoo', name: 'Yahoo Mail', type: 'yahoo', icon: '💜', color: 'bg-purple-500' },
      credentials: { email: 'test@yahoo.com', password: 'testpass123' }
    }
  ];

  const addTestAccount = async (account: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/email/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(account),
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Compte ${account.credentials.email} ajouté avec succès !`);
        window.location.reload();
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      alert('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const resetAllData = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les données ?')) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/reset', {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Toutes les données ont été nettoyées !');
        window.location.reload();
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      alert('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h1 className="text-2xl font-bold mb-4">🧪 Test Rapide - Comptes Email</h1>
        <p className="text-gray-600 mb-6">
          Cliquez sur les boutons ci-dessous pour ajouter des comptes de test et voir le changement dans le header.
        </p>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-800 mb-2">🧹 Nettoyage complet</h3>
          <p className="text-sm text-red-700 mb-3">
            Supprime toutes les connexions Gmail persistantes et remet tout à zéro.
          </p>
          <button
            onClick={resetAllData}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Nettoyage...' : 'Nettoyer toutes les données'}
          </button>
        </div>
        
        <div className="space-y-3">
          {testAccounts.map((account, index) => (
            <button
              key={index}
              onClick={() => addTestAccount(account)}
              disabled={loading}
              className={`w-full flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 text-left disabled:opacity-50`}
            >
              <div className={`w-10 h-10 rounded-full ${account.provider.color} flex items-center justify-center text-white text-lg`}>
                {account.provider.icon}
              </div>
              <div>
                <div className="font-medium">{account.credentials.email}</div>
                <div className="text-sm text-gray-600">{account.provider.name}</div>
              </div>
              <div className="ml-auto">
                <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                  {loading ? 'Ajout...' : 'Ajouter'}
                </span>
              </div>
            </button>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Instructions :</h3>
          <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
            <li>Cliquez sur "Ajouter" pour un compte</li>
            <li>Regardez le header en haut - le bouton email se met à jour !</li>
            <li>Il affichera "Connecté à Gmail/Outlook/Yahoo" selon votre choix</li>
            <li>Cliquez sur le bouton dans le header pour changer de compte</li>
          </ol>
        </div>
        
        <div className="mt-4 flex space-x-3">
          <a 
            href="/" 
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Voir le Header Principal
          </a>
          <a 
            href="/email-accounts" 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            target="_blank"
          >
            Gestion Complète
          </a>
        </div>
      </div>
    </div>
  );
}
