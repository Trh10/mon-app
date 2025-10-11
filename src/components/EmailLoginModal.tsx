"use client";

import { useState } from "react";
import { saveEmailCredentials } from "@/lib/email/credentials";
import { X, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

interface EmailLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (account: any) => void;
}

const EMAIL_PROVIDERS = [
  {
    id: 'outlook',
    name: 'Outlook',
    icon: '📘',
    color: 'bg-blue-500',
    domains: ['@outlook.com', '@hotmail.com', '@live.com']
  },
  {
    id: 'yahoo',
    name: 'Yahoo',
    icon: '🟣',
    color: 'bg-purple-500',
    domains: ['@yahoo.com', '@yahoo.fr']
  },
  {
    id: 'imap',
    name: 'Autre (domaine personnalisé)',
    icon: '⚙️',
    color: 'bg-gray-500',
    domains: []
  }
];

export default function EmailLoginModal({ isOpen, onClose, onSuccess }: EmailLoginModalProps) {
  const [step, setStep] = useState<'provider' | 'credentials'>('provider');
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // États pour IMAP/SMTP
  const [imapServer, setImapServer] = useState('');
  const [smtpServer, setSmtpServer] = useState('');
  const [imapPort, setImapPort] = useState<string>('993');
  const [useSSL, setUseSSL] = useState<boolean>(true);

  const resetModal = () => {
    setStep('provider');
    setSelectedProvider(null);
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setLoading(false);
    setError('');
    setSuccess('');
    setImapServer('');
    setSmtpServer('');
  setImapPort('993');
  setUseSSL(true);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const selectProvider = (provider: any) => {
    setSelectedProvider(provider);
    setStep('credentials');
    setError('');
    setSuccess('');
  };

  const handleBack = () => {
    setStep('provider');
    setError('');
    setSuccess('');
  };

  const handleConnect = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email et mot de passe requis');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🔄 Tentative de connexion...', { provider: selectedProvider.id, email: email.trim() });

      const credentials: any = {
        email: email.trim(),
        password: password.trim()
        // Plus de configuration IMAP manuelle - tout est auto-détecté côté serveur
      };

      const response = await fetch('/api/email/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: {
            type: selectedProvider.id,
            name: selectedProvider.name
          },
          credentials
        })
      });

      console.log('📡 Réponse API:', response.status, response.statusText);
      const raw = await response.text();
      let data: any = undefined;
      try { data = raw ? JSON.parse(raw) : undefined; } catch {}

      if (!response.ok) {
        const msg = data?.error || `Erreur HTTP ${response.status}`;
        setError(msg);
        console.error('❌ Erreur de connexion:', msg);
        return;
      }

      data = data || {};
      console.log('📋 Données reçues:', data);

      if (data.success) {
        setSuccess(`✅ Connexion réussie à ${selectedProvider.name}!`);
        
        // Attendre 1.5 seconde pour montrer le succès
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Créer l'objet compte
        const newAccount = {
          id: data.accountId || Math.random().toString(36).substring(2),
          email: email.trim(),
          provider: {
            id: selectedProvider.id,
            name: selectedProvider.name,
            type: selectedProvider.id,
            icon: selectedProvider.icon,
            color: selectedProvider.color
          },
          isConnected: true,
          unreadCount: data.unreadCount || 0,
          status: 'connected'
        };

        // Sauvegarder les identifiants pour l'envoi SMTP côté client (sauf OAuth)
        try {
          if (selectedProvider?.oauth !== true) {
            saveEmailCredentials({ email: email.trim(), provider: selectedProvider.id, password: password.trim() } as any);
          }
        } catch {}

        console.log('✅ Nouveau compte créé:', newAccount);
        onSuccess(newAccount);
        handleClose();
      } else {
        setError(data.error || 'Erreur de connexion inconnue');
        console.error('❌ Erreur de connexion:', data.error);
      }
    } catch (error) {
      console.error('❌ Erreur réseau:', error);
      setError('Erreur réseau. Vérifiez votre connexion Internet.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = async () => {
    try {
      setLoading(true);
      setError('');
      // Redirection directe dans la même fenêtre pour OAuth Google
      window.location.href = '/api/google/auth';
    } catch (e: any) {
      setError(e?.message || 'Erreur OAuth Google');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'provider' ? 'Connecter un compte email' : `Connexion ${selectedProvider?.name}`}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-4">
          {step === 'provider' ? (
            /* Sélection du provider */
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Choisissez votre fournisseur d'email :
              </p>
              
              {/* Import Gmail existant */}
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch('/api/email/import-gmail', { method: 'POST' });
                    const data = await res.json();
                    if (data.success) {
                      setSuccess('✅ Compte Gmail récupéré !');
                      const newAccount = {
                        id: data.accountId,
                        email: data.email,
                        provider: { id: 'gmail', name: 'Gmail', type: 'gmail', icon: '📧', color: 'bg-red-500' },
                        isConnected: true,
                        unreadCount: 0,
                        status: 'connected'
                      };
                      setTimeout(() => {
                        onSuccess(newAccount);
                        handleClose();
                      }, 1000);
                    } else {
                      setError('Aucun compte Gmail trouvé');
                    }
                  } catch (e: any) {
                    setError('Erreur lors de la récupération');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 border-2 border-green-300 bg-green-50 rounded-lg hover:border-green-400 hover:bg-green-100 transition-colors"
              >
                <div className={`w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm`}>
                  ✨
                </div>
                <span className="font-medium text-green-800">Récupérer mon Gmail existant</span>
                <span className="text-xs text-green-600 ml-auto">Détecté dans Focus</span>
              </button>
              
              {/* Google OAuth path */}
              <button
                onClick={() => selectProvider({ id: 'gmail', name: 'Gmail', icon: '📧', color: 'bg-red-500', oauth: true, domains: ['@gmail.com'] })}
                className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className={`w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm`}>
                  📧
                </div>
                <span className="font-medium text-gray-900">Se connecter avec Google</span>
                <span className="text-xs text-gray-500 ml-auto">OAuth sécurisé</span>
              </button>
              {EMAIL_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => selectProvider(provider)}
                  className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className={`w-8 h-8 ${provider.color} rounded-full flex items-center justify-center text-white text-sm`}>
                    {provider.icon}
                  </div>
                  <span className="font-medium text-gray-900">{provider.name}</span>
                  {provider.domains.length > 0 && (
                    <span className="text-xs text-gray-500 ml-auto">
                      {provider.domains.join(', ')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            /* Saisie des identifiants */
            <div className="space-y-4">
              {/* Messages d'erreur et de succès */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">{success}</p>
                </div>
              )}

              {/* Email (hidden for OAuth) */}
              {selectedProvider?.oauth !== true && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`votre-email${selectedProvider.domains[0] || '@exemple.com'}`}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-400"
                    disabled={loading}
                  />
                </div>
              </div>
              )}

              {/* Mot de passe (hidden for OAuth) */}
              {selectedProvider?.oauth !== true && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-400"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              )}

              {/* Configuration IMAP (masquée - auto-détection uniquement) */}
              {selectedProvider?.id === 'imap' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-600">
                    💡 Configuration automatique basée sur votre domaine email. Si la connexion échoue, nous vous proposerons des paramètres alternatifs.
                  </p>
                </div>
              )}

              {/* Info selon le provider */}
              {selectedProvider?.id === 'gmail' && selectedProvider?.oauth !== true && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-600">
                    💡 Gmail: activez IMAP (Paramètres &gt; Transfert et POP/IMAP) et utilisez un mot de passe d'application si la 2FA est activée. Les mots de passe "normaux" sont souvent refusés.
                  </p>
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleBack}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-medium"
                  disabled={loading}
                >
                  Retour
                </button>
                {selectedProvider?.oauth === true ? (
                  <button
                    onClick={handleGoogleOAuth}
                    disabled={loading}
                    className={`flex-1 px-4 py-2 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors ${
                      success ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connexion Google...
                      </>
                    ) : success ? (
                      'Connecté ✓'
                    ) : (
                      'Continuer avec Google'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={loading || !email.trim() || !password.trim()}
                    className={`flex-1 px-4 py-2 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors ${
                      success 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connexion en cours...
                      </>
                    ) : success ? (
                      'Connecté ✓'
                    ) : (
                      'Se connecter'
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
