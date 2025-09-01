"use client";
import { useState } from 'react';
import { Mail, Eye, EyeOff, Loader2, Settings } from 'lucide-react';

interface SimpleEmailLoginProps {
  onConnect: (credentials: any) => void;
}

export function SimpleEmailLogin({ onConnect }: SimpleEmailLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const handleConnect = async () => {
    if (!email || !password) {
      setError('Email et mot de passe requis');
      return;
    }

    setConnecting(true);
    setError('');
    setProgress('🔍 Auto-détection des serveurs email...');
    
    try {
      console.log('🚀 Tentative de connexion:', email);
      
      const response = await fetch('/api/email/universal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Connexion réussie !', data);
        setProgress('✅ Connexion réussie !');
        
        onConnect({ email, password, emails: data.emails || [] });
        
        // Sauvegarder les credentials
        localStorage.setItem('email_credentials', btoa(JSON.stringify({ email, password })));
      } else {
        console.error('❌ Erreur connexion:', data);
        setError(data.error || 'Erreur de connexion');
        setProgress('');
      }
    } catch (error: any) {
      console.error('❌ Erreur réseau:', error);
      setError('Impossible de se connecter au serveur');
      setProgress('');
    } finally {
      setConnecting(false);
    }
  };

  const getEmailProvider = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase();
    const providers: { [key: string]: string } = {
      'gmail.com': '📧 Gmail',
      'outlook.com': '📧 Outlook',
      'hotmail.com': '📧 Hotmail',
      'yahoo.com': '📧 Yahoo',
      'yahoo.fr': '📧 Yahoo France',
      'allinonerdc.com': '📧 AllInOne RDC (Infomaniak)'
    };
    return providers[domain] || `📧 ${domain}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 via-blue-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">ICONES BOX</h1>
            <p className="text-gray-600 mt-2">Connexion universelle • Marche avec TOUS les emails</p>
            <p className="text-xs text-gray-500 mt-1">Utilisateur: Trh10 • 2025-08-29 10:56:47 UTC</p>
          </div>

          {/* Formulaire */}
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="terachtshitenge@allinonerdc.com"
                autoComplete="email"
              />
              {email && email.includes('@') && (
                <div className="mt-1 text-sm text-gray-600">
                  {getEmailProvider(email)} • Auto-détection activée
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Progress */}
            {progress && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700 text-sm flex items-center gap-2">
                  {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {progress}
                </p>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Bouton connexion */}
            <button
              onClick={handleConnect}
              disabled={connecting || !email || !password}
              className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-orange-500 text-white py-4 px-4 rounded-lg font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Auto-détection en cours...
                </>
              ) : (
                'Se connecter automatiquement'
              )}
            </button>

            {/* Info spéciale pour ton domaine */}
            {email.includes('@allinonerdc.com') && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">
                  ✅ Configuration détectée : Infomaniak
                </h4>
                <div className="text-sm text-green-700 space-y-1">
                  <div>📧 IMAP: mail.infomaniak.com:993</div>
                  <div>📤 SMTP: mail.infomaniak.com:587</div>
                  <div>🔒 Connexion sécurisée SSL/TLS</div>
                </div>
              </div>
            )}

            {/* Info universelle */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">
                🌍 Connexion universelle
              </h4>
              <div className="text-sm text-blue-700 space-y-1">
                <div>✅ Gmail, Outlook, Yahoo</div>
                <div>✅ Domaines d'entreprise</div>
                <div>✅ Serveurs personnalisés</div>
                <div>✅ Auto-détection intelligente</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info technique */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>🔒 Connexion directe IMAP/SMTP • Auto-détection intelligente</p>
          <p>Développé pour Trh10 • 2025-08-29</p>
        </div>
      </div>
    </div>
  );
}