"use client";
import { useState } from 'react';
import { Mail, Eye, EyeOff, Loader2, Settings } from 'lucide-react';

interface EmailCredentials {
  email: string;
  password: string;
  provider: 'gmail' | 'outlook' | 'yahoo' | 'custom';
  imapHost?: string;
  smtpHost?: string;
  imapPort?: number;
  smtpPort?: number;
}

interface EmailLoginProps {
  onConnect: (credentials: EmailCredentials & { emails: any[] }) => void;
}

export function EmailLogin({ onConnect }: EmailLoginProps) {
  const [credentials, setCredentials] = useState<EmailCredentials>({
    email: '',
    password: '',
    provider: 'gmail'
  });
  const [connecting, setConnecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    
    try {
      console.log('🔌 Tentative de connexion IMAP/SMTP...');
      
      // Tester la connexion IMAP
      const response = await fetch('/api/email/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Connexion réussie !');
        onConnect({ ...credentials, emails: data.emails || [] });
        
        // Sauvegarder les credentials (encodés)
        localStorage.setItem('email_credentials', btoa(JSON.stringify(credentials)));
      } else {
        console.error('❌ Erreur connexion:', data);
        setError(data.error || 'Erreur de connexion');
      }
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      setError('Impossible de se connecter au serveur email');
    } finally {
      setConnecting(false);
    }
  };

  // Détecter automatiquement le provider selon le domaine
  const handleEmailChange = (email: string) => {
    setCredentials(prev => ({ ...prev, email }));
    
    // Auto-détection du provider
    if (email.includes('@gmail.com')) {
      setCredentials(prev => ({ ...prev, provider: 'gmail' }));
    } else if (email.includes('@outlook.com') || email.includes('@hotmail.com') || email.includes('@live.com')) {
      setCredentials(prev => ({ ...prev, provider: 'outlook' }));
    } else if (email.includes('@yahoo.com') || email.includes('@yahoo.fr')) {
      setCredentials(prev => ({ ...prev, provider: 'yahoo' }));
    } else {
      // Domaine personnalisé - proposer la configuration manuelle
      setCredentials(prev => ({ ...prev, provider: 'custom' }));
      setShowAdvanced(true);
    }
  };

  const providers = {
    gmail: {
      name: 'Gmail',
      help: 'Utilisez un App Password au lieu de votre mot de passe principal',
      link: 'https://myaccount.google.com/apppasswords'
    },
    outlook: {
      name: 'Outlook/Hotmail',
      help: 'Utilisez votre mot de passe habituel',
      link: 'https://outlook.live.com/mail/options/mail/accounts'
    },
    yahoo: {
      name: 'Yahoo Mail',
      help: 'Activez les "mots de passe d\'application" dans les paramètres',
      link: 'https://login.yahoo.com/account/security'
    },
    custom: {
      name: 'Configuration personnalisée',
      help: 'Configurez manuellement les serveurs IMAP/SMTP',
      link: '#'
    }
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
            <p className="text-gray-600 mt-2">Connexion directe à votre boîte email</p>
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
                value={credentials.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                placeholder="votre@domaine.com"
                autoComplete="email"
              />
            </div>

            {/* Provider (affiché uniquement si pas custom) */}
            {credentials.provider !== 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fournisseur email
                </label>
                <select 
                  value={credentials.provider}
                  onChange={(e) => setCredentials(prev => ({ 
                    ...prev, 
                    provider: e.target.value as 'gmail' | 'outlook' | 'yahoo' | 'custom'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                >
                  <option value="gmail">Gmail</option>
                  <option value="outlook">Outlook/Hotmail</option>
                  <option value="yahoo">Yahoo Mail</option>
                  <option value="custom">Configuration personnalisée</option>
                </select>
              </div>
            )}

            {/* Configuration avancée pour domaines personnalisés */}
            {(credentials.provider === 'custom' || showAdvanced) && (
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Configuration serveurs</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Serveur IMAP</label>
                    <input
                      type="text"
                      value={credentials.imapHost || ''}
                      onChange={(e) => setCredentials(prev => ({ ...prev, imapHost: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400"
                      placeholder="imap.domaine.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Port IMAP</label>
                    <input
                      type="number"
                      value={credentials.imapPort || 993}
                      onChange={(e) => setCredentials(prev => ({ ...prev, imapPort: parseInt(e.target.value) }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Serveur SMTP</label>
                    <input
                      type="text"
                      value={credentials.smtpHost || ''}
                      onChange={(e) => setCredentials(prev => ({ ...prev, smtpHost: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400"
                      placeholder="smtp.domaine.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Port SMTP</label>
                    <input
                      type="number"
                      value={credentials.smtpPort || 587}
                      onChange={(e) => setCredentials(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900"
                    />
                  </div>
                </div>

                {/* Suggestions pour allinonerdc.com */}
                {credentials.email.includes('@allinonerdc.com') && (
                  <div className="bg-blue-50 p-3 rounded text-xs">
                    <strong>Suggestions pour allinonerdc.com :</strong>
                    <div>IMAP: mail.allinonerdc.com:993</div>
                    <div>SMTP: mail.allinonerdc.com:587</div>
                    <div className="mt-1 text-gray-600">
                      (Contactez votre admin si ces paramètres ne marchent pas)
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe {credentials.provider === 'gmail' && '(App Password)'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Configuration avancée toggle */}
            {credentials.provider !== 'custom' && !showAdvanced && (
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                ⚙️ Configuration avancée
              </button>
            )}

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
                {credentials.provider === 'custom' && (
                  <p className="text-red-600 text-xs mt-1">
                    Vérifiez les paramètres serveur IMAP/SMTP avec votre administrateur email.
                  </p>
                )}
              </div>
            )}

            {/* Bouton connexion */}
            <button
              onClick={handleConnect}
              disabled={connecting || !credentials.email || !credentials.password}
              className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </button>

            {/* Aide pour le provider sélectionné */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">
                ℹ️ {providers[credentials.provider].name}
              </h4>
              <p className="text-sm text-blue-700 mb-2">
                {providers[credentials.provider].help}
              </p>
              {providers[credentials.provider].link !== '#' && (
                <a 
                  href={providers[credentials.provider].link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Configurer les paramètres →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Info technique */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Connexion directe IMAP/SMTP • Vos données restent privées</p>
        </div>
      </div>
    </div>
  );
}