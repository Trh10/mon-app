"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CodeAuthUser {
  id: string;
  name: string;
  code: string;
  level: number;
  levelName?: string;
  permissions: string[];
  companyId: string;
  companyCode: string;
  isFirstUser?: boolean;
}

interface CodeAuthContextType {
  user: CodeAuthUser | null;
  login: (code: string, name?: string, companyName?: string) => Promise<{ success: boolean; error?: string }>;
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
    try {
      const response = await fetch('/api/auth/login');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Erreur vérification session:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (code: string, name?: string, companyName?: string) => {
    try {
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
      setUser(null);
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Le niveau 10 (DG) a toutes les permissions
    if (user.level === 10 || user.permissions.includes('all')) {
      return true;
    }
    
    return user.permissions.includes(permission);
  };

  const value = {
    user,
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
