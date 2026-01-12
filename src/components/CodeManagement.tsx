"use client";

import { useState, useEffect } from 'react';
import { Plus, Users, Edit2, Trash2, Shield, Eye, EyeOff } from 'lucide-react';
import { useCodeAuth } from './auth/CodeAuthContext';

interface UserCode {
  id: string;
  name: string;
  code: string;
  level: number;
  levelName: string;
  permissions: string[];
  createdAt: string;
  lastUsed?: string;
}

export function CodeManagement() {
  const { user, hasPermission } = useCodeAuth();
  const [codes, setCodes] = useState<UserCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCode, setEditingCode] = useState<UserCode | null>(null);
  
  // Formulaire
  const [formData, setFormData] = useState({
    name: '',
    level: 5,
    customCode: ''
  });
  const [showCodes, setShowCodes] = useState<{ [key: string]: boolean }>({});

  // Niveaux disponibles
  const availableLevels = [
    { value: 10, label: 'Directeur Général', color: 'bg-red-100 text-red-800' },
    { value: 7, label: 'Administration', color: 'bg-blue-100 text-blue-800' },
    { value: 6, label: 'Financier', color: 'bg-green-100 text-green-800' },
    { value: 5, label: 'Employé', color: 'bg-gray-100 text-gray-800' },
  ];

  // Vérifier si l'utilisateur peut gérer les codes
  if (!hasPermission('all')) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Accès restreint</h3>
          <p className="mt-1 text-sm text-gray-500">
            Vous n'avez pas les permissions pour gérer les codes d'accès.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    try {
      const response = await fetch('/api/auth/codes');
      if (response.ok) {
        const data = await response.json();
        setCodes(data.codes || []);
      }
    } catch (error) {
      console.error('Erreur chargement codes:', error);
    }
  };

  const generateRandomCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const code = formData.customCode || generateRandomCode();
      const levelInfo = availableLevels.find(l => l.value === formData.level);
      
      const response = await fetch('/api/auth/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          code: code,
          level: formData.level,
          levelName: levelInfo?.label || 'Employé'
        })
      });

      if (response.ok) {
        await loadCodes();
        setShowCreateForm(false);
        setFormData({ name: '', level: 5, customCode: '' });
      } else {
        const error = await response.json();
        alert('Erreur: ' + error.error);
      }
    } catch (error) {
      alert('Erreur lors de la création du code');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (codeId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce code d\'accès ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/auth/codes?id=${codeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadCodes();
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  const toggleShowCode = (codeId: string) => {
    setShowCodes(prev => ({
      ...prev,
      [codeId]: !prev[codeId]
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Gestion des Codes d'Accès</h2>
            <p className="text-sm text-gray-500">
              Créez et gérez les codes d'accès pour votre équipe
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau Code
          </button>
        </div>
      </div>

      {/* Formulaire de création */}
      {showCreateForm && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'employé
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  placeholder="Prénom de l'employé"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Niveau d'accès
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                >
                  {availableLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label} (Niveau {level.value})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code personnalisé (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.customCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, customCode: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  placeholder="4 chiffres (auto si vide)"
                  maxLength={4}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? 'Création...' : 'Créer le Code'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des codes */}
      <div className="divide-y divide-gray-200">
        {codes.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun code créé</h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer des codes d'accès pour votre équipe.
            </p>
          </div>
        ) : (
          codes.map((code) => {
            const levelInfo = availableLevels.find(l => l.value === code.level);
            const isCodeVisible = showCodes[code.id];
            
            return (
              <div key={code.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900">{code.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded text-xs ${levelInfo?.color}`}>
                          {code.levelName}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-500">Code:</span>
                          <span className="font-mono text-sm">
                            {isCodeVisible ? code.code : '••••'}
                          </span>
                          <button
                            onClick={() => toggleShowCode(code.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {isCodeVisible ? (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Eye className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Créé le {new Date(code.createdAt).toLocaleDateString()}
                        {code.lastUsed && (
                          <span> • Dernière utilisation: {new Date(code.lastUsed).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(code.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
