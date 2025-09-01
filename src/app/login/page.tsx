"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Eye, EyeOff, Settings, Shield, Users, Building2 } from "lucide-react";
import { getStoredEmailCredentials, saveEmailCredentials } from "@/lib/email/credentials";

interface LoginCredentials {
  email: string;
  password: string;
  provider: 'gmail' | 'yahoo' | 'outlook' | 'hotmail' | 'imap';
  companyRole: 'directeur' | 'manager' | 'assistant' | 'employe';
  displayName: string;
  
  // IMAP personnalisé
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  secure?: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
    provider: 'gmail',
    companyRole: 'employe',
    displayName: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  // Vérifier si déjà connecté
  useEffect(() => {
    const stored = getStoredEmailCredentials();
    if (stored?.email && stored?.provider) {
      router.push('/');
    }
  }, [router]);

  // Auto-configuration des providers
  const providerConfigs = {
    gmail: {
      name: '📧 Gmail',
      color: 'from-red-500 to-red-600',
      help: 'Utilisez votre App Password',
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      secure: true
    },
    yahoo: {
      name: '🟣 Yahoo Mail',
      color: 'from-purple-500 to-purple-600',
      help: 'Activez l\'authentification à 2 facteurs',
      imapHost: 'imap.mail.yahoo.com',
      imapPort: 993,
      smtpHost: 'smtp.mail.yahoo.com',
      smtpPort: 587,
      secure: true
    },
    outlook: {
      name: '🔷 Outlook',
      color: 'from-blue-500 to-blue-600',
      help: 'Compte Microsoft personnel',
      imapHost: 'outlook.office365.com',
      imapPort: 993,
      smtpHost: 'smtp-mail.outlook.com',
      smtpPort: 587,
      secure: true
    },
    hotmail: {
      name: '🔷 Hotmail/Live',
      color: 'from-blue-500 to-blue-600',
      help: 'Même configuration qu\'Outlook',
      imapHost: 'outlook.office365.com',
      imapPort: 993,
      smtpHost: 'smtp-mail.outlook.com',
      smtpPort: 587,
      secure: true
    },
    imap: {
      name: '⚙️ IMAP Personnalisé',
      color: 'from-gray-500 to-gray-600',
      help: 'Configuration manuelle des serveurs',
      imapHost: '',
      imapPort: 993,
      smtpHost: '',
      smtpPort: 587,
      secure: true
    }
  };

  const roleHierarchy = {
    directeur: {
      name: '👑 Directeur Général',
      description: 'Accès complet - Peut tout voir et assigner',
      color: 'from-yellow-500 to-yellow-600',
      permissions: ['voir_tout', 'assigner_taches', 'valider_besoins', 'gestion_financiere']
    },
    manager: {
      name: '📊 Manager',
      description: 'Gestion d\'équipe - Validation des demandes',
      color: 'from-blue-500 to-blue-600',
      permissions: ['voir_equipe', 'assigner_taches', 'valider_besoins']
    },
    assistant: {
      name: '🤝 Assistant',
      description: 'Support administratif',
      color: 'from-green-500 to-green-600',
      permissions: ['voir_equipe', 'support_admin']
    },
    employe: {
      name: '👤 Employé',
      description: 'Utilisateur standard',
      color: 'from-gray-500 to-gray-600',
      permissions: ['demandes_besoins', 'taches_assignees']
    }
  };

  const handleProviderChange = (provider: keyof typeof providerConfigs) => {
    const config = providerConfigs[provider];
    setCredentials(prev => ({
      ...prev,
      provider,
      imapHost: config.imapHost,
      imapPort: config.imapPort,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      secure: config.secure
    }));
    setShowAdvanced(provider === 'imap');
  };

  const handleEmailChange = (email: string) => {
    setCredentials(prev => ({ ...prev, email }));
    
    // Auto-détection du provider
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain) {
      if (domain === 'gmail.com') {
        handleProviderChange('gmail');
      } else if (domain.includes('yahoo.')) {
        handleProviderChange('yahoo');
      } else if (domain === 'outlook.com' || domain === 'outlook.fr') {
        handleProviderChange('outlook');
      } else if (domain === 'hotmail.com' || domain === 'live.com') {
        handleProviderChange('hotmail');
      } else {
        handleProviderChange('imap');
      }
    }
  };

  const handleConnect = async () => {
    if (!credentials.email || !credentials.password || !credentials.displayName) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setConnecting(true);
    setError('');

    try {
      // Test de connexion email
      const response = await fetch('/api/email/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok) {
        // Sauvegarder les credentials
        saveEmailCredentials({
          email: credentials.email,
          provider: credentials.provider,
          userName: credentials.displayName,
          companyRole: credentials.companyRole,
          imapHost: credentials.imapHost,
          imapPort: credentials.imapPort,
          smtpHost: credentials.smtpHost,
          smtpPort: credentials.smtpPort,
          secure: credentials.secure,
          timestamp: new Date().toISOString()
        });

        // Redirection vers l'application
        router.push('/');
      } else {
        setError(data.error || 'Erreur de connexion');
      }
    } catch (error: any) {
      console.error('Erreur connexion:', error);
      setError('Impossible de se connecter au serveur email');
    } finally {
      setConnecting(false);
    }
  };

  const currentProvider = providerConfigs[credentials.provider];
  const currentRole = roleHierarchy[credentials.companyRole];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-green-600 p-8 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Mail className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">ICONES BOX</h1>
                <p className="text-blue-100">Plateforme collaborative d'entreprise</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-blue-100">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>Email unifié</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Gestion d'équipe</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>Workflow entreprise</span>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-700 font-medium">❌ {error}</div>
              </div>
            )}

            {/* Informations personnelles */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Informations personnelles
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom d'affichage *
                  </label>
                  <input
                    type="text"
                    value={credentials.displayName}
                    onChange={(e) => setCredentials(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Votre nom complet"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Poste dans l'entreprise *
                  </label>
                  <select
                    value={credentials.companyRole}
                    onChange={(e) => setCredentials(prev => ({ ...prev, companyRole: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(roleHierarchy).map(([key, role]) => (
                      <option key={key} value={key}>{role.name}</option>
                    ))}
                  </select>
                  <div className="mt-1 text-xs text-gray-600">
                    {currentRole.description}
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration email */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Configuration email
              </h2>

              {/* Provider selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fournisseur email
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(providerConfigs).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleProviderChange(key as any)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        credentials.provider === key
                          ? `border-blue-500 bg-gradient-to-r ${config.color} text-white`
                          : 'border-gray-200 hover:border-blue-300 text-gray-700'
                      }`}
                    >
                      <div className="text-sm font-medium">{config.name}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  💡 {currentProvider.help}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse email *
                  </label>
                  <input
                    type="email"
                    value={credentials.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe *
                    {credentials.provider === 'gmail' && (
                      <span className="text-xs text-blue-600"> (App Password)</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={credentials.password}
                      onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
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
              </div>

              {/* Configuration avancée IMAP */}
              {(showAdvanced || credentials.provider === 'imap') && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Configuration serveurs</span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs text-gray-600">Serveur IMAP</label>
                      <input
                        type="text"
                        value={credentials.imapHost || ''}
                        onChange={(e) => setCredentials(prev => ({ ...prev, imapHost: e.target.value }))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        placeholder="imap.domaine.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs text-gray-600">Port IMAP</label>
                      <input
                        type="number"
                        value={credentials.imapPort || 993}
                        onChange={(e) => setCredentials(prev => ({ ...prev, imapPort: parseInt(e.target.value) }))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs text-gray-600">Serveur SMTP</label>
                      <input
                        type="text"
                        value={credentials.smtpHost || ''}
                        onChange={(e) => setCredentials(prev => ({ ...prev, smtpHost: e.target.value }))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        placeholder="smtp.domaine.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs text-gray-600">Port SMTP</label>
                      <input
                        type="number"
                        value={credentials.smtpPort || 587}
                        onChange={(e) => setCredentials(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              )}

              {credentials.provider !== 'imap' && (
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  ⚙️ Configuration avancée
                </button>
              )}
            </div>

            {/* Bouton de connexion */}
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-green-700 transition-all disabled:opacity-60 flex items-center justify-center gap-3"
            >
              {connecting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  Se connecter à la plateforme
                </>
              )}
            </button>

            <div className="text-center text-xs text-gray-500">
              En vous connectant, vous accédez à la plateforme collaborative de votre entreprise.<br/>
              Vos données email restent sécurisées et ne sont jamais stockées sur nos serveurs.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
