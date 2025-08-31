"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SimpleEmailLogin } from "@/components/SimpleEmailLogin";

export default function LoginPage() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async (credentials: any) => {
    try {
      setIsConnecting(true);
      
      // Normaliser les credentials
      const normalizedCredentials = {
        email: credentials.email,
        password: credentials.password,
        provider: getProviderFromEmail(credentials.email),
        userName: credentials.email.split('@')[0],
        timestamp: new Date().toISOString()
      };

      // Sauvegarder les credentials dans localStorage
      localStorage.setItem('email_credentials', btoa(JSON.stringify(normalizedCredentials)));
      
      // Rediriger vers la page principale
      router.push('/');
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Fonction pour détecter le provider depuis l'email
  const getProviderFromEmail = (email: string): string => {
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (domain === 'gmail.com') {
      return 'gmail';
    } else if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com') {
      return 'outlook';
    } else if (domain === 'yahoo.com' || domain === 'yahoo.fr') {
      return 'yahoo';
    } else {
      return 'custom';
    }
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Connexion en cours...</p>
        </div>
      </div>
    );
  }

  return <SimpleEmailLogin onConnect={handleConnect} />;
}