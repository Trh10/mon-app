"use client";

import { useState } from 'react';
import { useCodeAuth } from './auth/CodeAuthContext';
import { APP_NAME } from '@/config/branding';
import { LoginForm } from './auth/LoginForm';

interface AppWithAuthProps {
  children: React.ReactNode;
}

export function AppWithAuth({ children }: AppWithAuthProps) {
  const { user, login, logout, loading } = useCodeAuth();
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (code: string, name?: string, companyName?: string) => {
    setLoginLoading(true);
    setLoginError('');
    
    const result = await login(code, name, companyName);
    
    if (!result.success) {
      setLoginError(result.error || 'Erreur de connexion');
    }
    
    setLoginLoading(false);
  };

  // Affichage pendant le chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si pas d'utilisateur connecté, afficher l'écran de login
  if (!user) {
    return (
      <LoginForm 
        onLogin={handleLogin}
        loading={loginLoading}
        error={loginError}
      />
    );
  }

  // Si utilisateur connecté, afficher l'application avec un header qui montre les infos utilisateur
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec infos utilisateur */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-900">
              {APP_NAME}
            </h1>
            <div className="text-sm text-gray-600">
              Connecté en tant que: <span className="font-medium">{user.name}</span>
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                Niveau {user.level}
              </span>
              {user.isFirstUser && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                  Administrateur Principal
                </span>
              )}
            </div>
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>
      
      {/* Contenu de l'application */}
      <div className="h-[calc(100vh-60px)]">
        {children}
      </div>
    </div>
  );
}
