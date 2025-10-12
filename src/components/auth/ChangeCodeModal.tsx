"use client";

import { useState } from "react";
import { X, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";

interface ChangeCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
}

export default function ChangeCodeModal({ isOpen, onClose, currentUser }: ChangeCodeModalProps) {
  const [currentCode, setCurrentCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [showCurrentCode, setShowCurrentCode] = useState(false);
  const [showNewCode, setShowNewCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validations
    if (newCode !== confirmCode) {
      setError("Les nouveaux codes ne correspondent pas");
      setLoading(false);
      return;
    }

    if (newCode.length < 4) {
      setError("Le nouveau code doit contenir au moins 4 caractères");
      setLoading(false);
      return;
    }

    if (currentCode === newCode) {
      setError("Le nouveau code doit être différent de l'ancien");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/change-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          currentCode,
          newCode
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setCurrentCode("");
        setNewCode("");
        setConfirmCode("");
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
      } else {
        setError(data.error || "Erreur lors du changement de code");
      }
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentCode("");
    setNewCode("");
    setConfirmCode("");
    setError("");
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Changer mon code d'accès</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700 mb-2">
                Code modifié avec succès !
              </h3>
              <p className="text-gray-600">
                Votre nouveau code sera actif dès la prochaine connexion.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Connecté en tant que:</strong> {currentUser.name} ({currentUser.role})
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code actuel
                </label>
                <div className="relative">
                  <input
                    type={showCurrentCode ? "text" : "password"}
                    value={currentCode}
                    onChange={(e) => setCurrentCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 text-black bg-white"
                    placeholder="Entrez votre code actuel"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentCode(!showCurrentCode)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrentCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau code
                </label>
                <div className="relative">
                  <input
                    type={showNewCode ? "text" : "password"}
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 text-black bg-white"
                    placeholder="Minimum 4 caractères"
                    minLength={4}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewCode(!showNewCode)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le nouveau code
                </label>
                <input
                  type="password"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                  placeholder="Répétez le nouveau code"
                  required
                />
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Important:</strong> Mémorisez bien votre nouveau code. 
                  Il sera nécessaire pour vos prochaines connexions.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                >
                  {loading ? "Modification..." : "Modifier le code"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
