"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CodeAuthUser {
  id: string;
  name: string;
  company: string;
  role: string;
  level?: number;
  levelName?: string;
  permissions?: string[];
  companyId?: string;
  companyCode?: string;
  isFirstUser?: boolean;
}

interface CodeAuthContextType {
  user: CodeAuthUser | null;
  isAuthenticated: boolean;
  login: (code: string, name?: string, companyName?: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
}

const CodeAuthContext = createContext<CodeAuthContextType | undefined>(undefined);

export function CodeAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CodeAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Vérifier la session au chargement
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setLoading(true);
    try {
      // Vérifier si on est côté client
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      const newSessionData = localStorage.getItem('user-session');
      if (newSessionData) {
        try {
          const userData = JSON.parse(newSessionData);
          // Valider la structure des données
          if (userData && userData.id && userData.name) {
            setUser(userData);
          } else {
            // Données corrompues, nettoyer
            localStorage.removeItem('user-session');
            setUser(null);
          }
        } catch (parseError) {
          console.error('Données de session corrompues:', parseError);
          localStorage.removeItem('user-session');
          setUser(null);
        }
      } else {
        // Fallback vers l'ancien système de cookies
        try {
          const response = await fetch('/api/auth/login');
          if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
              setUser({
                id: data.user.id,
                name: data.user.name,
                company: data.user.companyCode || data.user.companyId,
                role: data.user.levelName || 'Employé',
                level: data.user.level,
                permissions: data.user.permissions,
                companyId: data.user.companyId,
                companyCode: data.user.companyCode
              });
            }
          }
        } catch (fetchError) {
          console.error('Erreur lors de la vérification de session:', fetchError);
        }
      }
    } catch (error) {
      console.error('Erreur générale de vérification session:', error);
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user-session');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (code: string, name?: string, companyName?: string, role?: string) => {
    try {
      // Utiliser la nouvelle API employee-login
      if (name && role) {
        const response = await fetch('/api/auth/employee-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            companyName, 
            employeeName: name, 
            role,
            code 
          }),
        });

        const data = await response.json();

        if (data.success) {
          const userData = data.user;
          setUser(userData);
          
          // Auto-enregistrement désactivé (route supprimée)
          // Si besoin, réactiver plus tard avec une vraie implémentation côté serveur.
          
          return { success: true };
        } else {
          return { success: false, error: data.error || 'Erreur de connexion' };
        }
      }
      
      // Fallback vers l'ancienne API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, name, companyName }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.message || data.error };
      }
    } catch (error) {
      return { success: false, error: 'Erreur de connexion' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/login', { method: 'DELETE' });
      localStorage.removeItem('user-session');
      setUser(null);
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Si l'utilisateur a un niveau 10 (DG) ou le rôle de Directeur Général
    if (user.level === 10 || user.role === 'Directeur Général') {
      return true;
    }
    
    // Vérifier les permissions si elles existent
    if (user.permissions && user.permissions.includes('all')) {
      return true;
    }
    
    return user.permissions ? user.permissions.includes(permission) : false;
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading,
    hasPermission,
  };

  return (
    <CodeAuthContext.Provider value={value}>
      {children}
    </CodeAuthContext.Provider>
  );
}

export function useCodeAuth() {
  const context = useContext(CodeAuthContext);
  if (context === undefined) {
    throw new Error('useCodeAuth must be used within a CodeAuthProvider');
  }
  return context;
}
