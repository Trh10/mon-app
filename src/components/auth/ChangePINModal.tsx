"use client";

import { useState } from 'react';
import { useCodeAuth } from '@/components/auth/CodeAuthContext';
import { Key, Eye, EyeOff, Shield, X } from 'lucide-react';

interface ChangePINModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePINModal({ isOpen, onClose }: ChangePINModalProps) {
  const { user } = useCodeAuth();
  const [formData, setFormData] = useState({
    currentPIN: '',
    newPIN: '',
    confirmPIN: ''
  });
  const [showPINs, setShowPINs] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations de sécurité
    if (formData.currentPIN.length < 4) {
      setError('Le PIN actuel doit contenir au moins 4 caractères');
      return;
    }

    if (formData.newPIN.length < 4) {
      setError('Le nouveau PIN doit contenir au moins 4 caractères');
      return;
    }

    if (formData.newPIN === formData.currentPIN) {
      setError('Le nouveau PIN doit être différent du PIN actuel');
      return;
    }

    if (formData.newPIN !== formData.confirmPIN) {
      setError('La confirmation du PIN ne correspond pas');
      return;
    }

    // Vérifications de sécurité avancées
    if (formData.newPIN === '1234' || formData.newPIN === '0000' || formData.newPIN === '1111') {
      setError('Ce PIN est trop simple. Choisissez un PIN plus sécurisé');
      return;
    }

    // Vérifier que ce n'est pas le nom de l'utilisateur
    if (formData.newPIN.toLowerCase() === user?.name.toLowerCase().substring(0, 4)) {
      setError('Le PIN ne doit pas être basé sur votre nom');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          currentPIN: formData.currentPIN,
          newPIN: formData.newPIN,
          companyId: user?.companyId
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert('✅ PIN modifié avec succès !');
        setFormData({ currentPIN: '', newPIN: '', confirmPIN: '' });
        onClose();
      } else {
        setError(result.error || 'Erreur lors de la modification du PIN');
      }
    } catch (error) {
      console.error('Erreur changement PIN:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPIN = (field: 'current' | 'new' | 'confirm') => {
    setShowPINs(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Key className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Changer votre PIN</h2>
                <p className="text-sm text-gray-600">Sécurisez votre accès personnel</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informations de sécurité */}
        <div className="p-6 bg-amber-50 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Consignes de sécurité :</p>
              <ul className="space-y-1 text-xs">
                <li>• Minimum 4 caractères</li>
                <li>• Évitez les suites simples (1234, 0000...)</li>
                <li>• N'utilisez pas votre nom ou des informations personnelles</li>
                <li>• Gardez votre PIN secret</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-red-700 text-sm">❌ {error}</div>
            </div>
          )}

          {/* PIN actuel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PIN actuel
            </label>
            <div className="relative">
              <input
                type={showPINs.current ? "text" : "password"}
                value={formData.currentPIN}
                onChange={(e) => setFormData({ ...formData, currentPIN: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="****"
                required
              />
              <button
                type="button"
                onClick={() => toggleShowPIN('current')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPINs.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nouveau PIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau PIN
            </label>
            <div className="relative">
              <input
                type={showPINs.new ? "text" : "password"}
                value={formData.newPIN}
                onChange={(e) => setFormData({ ...formData, newPIN: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nouveau PIN (min. 4 caractères)"
                required
                minLength={4}
              />
              <button
                type="button"
                onClick={() => toggleShowPIN('new')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPINs.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmation PIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le nouveau PIN
            </label>
            <div className="relative">
              <input
                type={showPINs.confirm ? "text" : "password"}
                value={formData.confirmPIN}
                onChange={(e) => setFormData({ ...formData, confirmPIN: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirmer le nouveau PIN"
                required
              />
              <button
                type="button"
                onClick={() => toggleShowPIN('confirm')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPINs.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Modification...' : 'Changer le PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
