'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NotificationSettings from '../../components/admin/NotificationSettings';
import { Settings, Users, History, Mail, Filter } from 'lucide-react';

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('notifications');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/login');
      const data = await response.json();
      
      if (!data.success || !data.user) {
        router.push('/');
        return;
      }
      
      // Vérifier les permissions admin
      if (![1, 5, 6, 7, 10].includes(data.user.role)) {
        router.push('/');
        return;
      }
      
      setUser(data.user);
    } catch (error) {
      console.error('Erreur vérification auth:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    {
      id: 'notifications',
      label: 'Notifications Email',
      icon: Mail,
      description: 'Configuration des emails automatiques'
    },
    {
      id: 'users',
      label: 'Gestion Utilisateurs',
      icon: Users,
      description: 'Gérer les comptes utilisateurs'
    },
    {
      id: 'audit',
      label: 'Audit et Logs',
      icon: History,
      description: 'Historique des actions'
    },
    {
      id: 'filters',
      label: 'Filtres Avancés',
      icon: Filter,
      description: 'Configuration des recherches'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
              <p className="text-gray-600">
                Connecté en tant que {user.name} ({user.levelName})
              </p>
            </div>
            <button
              onClick={() => router.push('/requisitions')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retour aux Réquisitions
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map(({ id, label, icon: Icon, description }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <div className="text-left">
                    <div>{label}</div>
                    <div className="text-xs text-gray-400">{description}</div>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'notifications' && (
            <NotificationSettings />
          )}
          
          {activeTab === 'users' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Gestion des Utilisateurs</h2>
              <p className="text-gray-600 mb-4">
                Interface de gestion des utilisateurs en cours de développement.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Gestion des Utilisateurs
                </h3>
                <p className="text-gray-500">
                  Cette fonctionnalité sera disponible prochainement.
                  Elle permettra de créer, modifier et supprimer des comptes utilisateurs.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'audit' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Audit et Logs</h2>
              <p className="text-gray-600 mb-4">
                Consultation de l'historique des actions en cours de développement.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Audit et Logs
                </h3>
                <p className="text-gray-500">
                  Cette interface permettra de consulter l'historique complet des actions
                  et de générer des rapports d'audit.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'filters' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Filtres Avancés</h2>
              <p className="text-gray-600 mb-4">
                Configuration des filtres et recherches avancées en cours de développement.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Filtres Avancés
                </h3>
                <p className="text-gray-500">
                  Interface de configuration des filtres personnalisés
                  et des recherches avancées pour les réquisitions.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
