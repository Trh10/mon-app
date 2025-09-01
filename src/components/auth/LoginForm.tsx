"use client";

import { useState, useEffect } from 'react';
import { User, Lock, LogIn, Building } from 'lucide-react';

interface LoginFormProps {
  onLogin: (code: string, name?: string, companyName?: string) => void;
  loading?: boolean;
  error?: string;
}

export function LoginForm({ onLogin, loading, error }: LoginFormProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isFirstCompany, setIsFirstCompany] = useState(false);

  // Vérifier si c'est la première entreprise
  useEffect(() => {
    checkFirstCompany();
  }, []);

  const checkFirstCompany = async () => {
    try {
      const response = await fetch('/api/auth/check-first');
      const data = await response.json();
      setIsFirstCompany(data.isFirst);
    } catch (error) {
      console.error('Erreur vérification première entreprise:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isFirstCompany) {
      // Pour la première entreprise, on envoie le code choisi (4 chiffres), le nom et l'entreprise
      if (name.trim() && companyName.trim() && code.length === 4) {
        onLogin(code, name.trim(), companyName.trim());
      }
    } else {
      // Pour les utilisateurs suivants, juste le code complet (XXXX-YYYY)
      if (code.length >= 4) {
        onLogin(code);
      }
    }
  };

  const handleCodeChange = (value: string) => {
    // Ne permettre que les chiffres et max 4 caractères
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setCode(digits);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Accès Application
          </h1>
          <p className="text-gray-600">
            Entrez votre prénom et votre code d'accès
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isFirstCompany && (
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                Nom de votre entreprise
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Nom de votre entreprise"
                  required={isFirstCompany}
                />
              </div>
              <p className="mt-1 text-xs text-blue-600">
                🎉 Vous créez la première entreprise ! Un code entreprise sera généré automatiquement.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Prénom
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Votre prénom"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              {isFirstCompany ? 'Choisissez votre code DG (4 chiffres)' : 'Code d\'accès (4 chiffres)'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="code"
                type="password"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center text-lg font-mono tracking-widest"
                placeholder="••••"
                maxLength={4}
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {code.length}/4 chiffres
              {isFirstCompany && (
                <span className="block text-blue-600">Votre code final sera: [CODE-ENTREPRISE]-{code || 'XXXX'}</span>
              )}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || code.length !== 4 || (isFirstCompany && !companyName.trim())}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                {isFirstCompany ? 'Créer l\'entreprise' : 'Se connecter'}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          {isFirstCompany ? (
            <p>🏢 Vous allez créer la première entreprise sur cette application.</p>
          ) : (
            <p>Saisissez votre code au format: ENTREPRISE-XXXX</p>
          )}
        </div>
      </div>
    </div>
  );
}
