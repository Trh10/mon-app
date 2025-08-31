"use client";

import { useState, useEffect } from "react";
import { signInWithPopup, User, GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { Mail, Eye, EyeOff, AlertCircle, CheckCircle, Settings, HelpCircle } from "lucide-react";

type ProviderKey = "auto" | "gmail" | "outlook" | "yahoo" | "custom";

interface EmailCredentials {
  email: string;
  password?: string;
  provider: ProviderKey | string;
  userName?: string;
  accessToken?: string; // OAuth Gmail
  uid?: string;

  // IMAP (manuel)
  imapHost?: string;
  imapPort?: number;
  imapTls?: boolean;

  timestamp?: string;
}

interface UniversalEmailLoginProps {
  onConnect: (credentials: EmailCredentials) => Promise<void>;
}

export default function UniversalEmailLogin({ onConnect }: UniversalEmailLoginProps) {
  const [credentials, setCredentials] = useState<EmailCredentials>({
    email: "",
    password: "",
    provider: "auto",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u?.email) {
        setCredentials((prev) => (prev.email ? prev : { ...prev, email: u.email! }));
      }
    });
    return () => unsub();
  }, []);

  const providerConfigs: Record<ProviderKey, { name: string; icon: string; oauth: boolean; helpText: string }> = {
    auto: { name: "Détection automatique", icon: "🔍", oauth: false, helpText: "Détection automatique basée sur votre adresse email" },
    gmail: { name: "Gmail", icon: "📧", oauth: true, helpText: "Connexion sécurisée Google (OAuth) ou mot de passe d’application" },
    outlook: { name: "Outlook/Hotmail", icon: "📨", oauth: false, helpText: "Microsoft Outlook, Hotmail, Live" },
    yahoo: { name: "Yahoo Mail", icon: "📩", oauth: false, helpText: "Yahoo Mail" },
    custom: { name: "Configuration manuelle", icon: "⚙️", oauth: false, helpText: "Serveurs IMAP personnalisés" },
  };

  function handleProviderSelect(provider: ProviderKey) {
    setCredentials((prev) => ({
      ...prev,
      provider,
      ...(provider !== "custom" ? { imapHost: "", imapPort: 993, imapTls: true } : {}),
    }));
    setShowAdvanced(provider === "custom");
    setError(null);
  }

  async function handleGoogleAuth() {
    try {
      setLoading(true);
      setError(null);

      const result = await signInWithPopup(auth, googleProvider);

      const cred = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = cred?.accessToken;
      if (!accessToken) {
        setError("Impossible d’obtenir le jeton d’accès Google (vérifie les scopes et la configuration OAuth).");
        return;
      }

      const u = result.user;
      const next: EmailCredentials = {
        email: u.email || credentials.email || "",
        userName: u.displayName || (u.email ? u.email.split("@")[0] : "Utilisateur"),
        provider: "gmail",
        accessToken,
        uid: u.uid,
        timestamp: new Date().toISOString(),
      };

      setCredentials((prev) => ({ ...prev, ...next }));
      await onConnect(next);
    } catch (err: any) {
      console.error("Erreur Firebase Auth:", err);
      if (err?.code === "auth/popup-closed-by-user") setError("Connexion annulée par l’utilisateur.");
      else if (err?.code === "auth/popup-blocked") setError("Popup bloquée par le navigateur. Autorisez les popups.");
      else setError(`Erreur d’authentification: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  function handleConfigSuggestion(s: { host: string; port: number; secure: boolean }) {
    setCredentials((prev) => ({
      ...prev,
      provider: "custom",
      imapHost: s.host,
      imapPort: s.port,
      imapTls: !!s.secure,
    }));
    setShowAdvanced(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const hasAccessToken = !!credentials.accessToken;

    if (!credentials.email) {
      setError("Adresse email requise");
      return;
    }
    if (credentials.provider === "gmail" && !hasAccessToken && !credentials.password) {
      setError("Pour Gmail, utilisez la connexion Google (recommandé) ou un mot de passe d’application.");
      return;
    }
    if (credentials.provider === "custom" && (!credentials.imapHost || !credentials.imapPort)) {
      setError("Serveur IMAP et port requis pour la configuration manuelle.");
      return;
    }
    if (!hasAccessToken && credentials.provider !== "custom" && !credentials.password) {
      setError("Mot de passe requis.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: EmailCredentials = {
        ...credentials,
        userName: credentials.userName || credentials.email.split("@")[0] || "User",
        ...(credentials.provider === "custom"
          ? {
              imapPort: Number(credentials.imapPort || 993),
              imapTls: credentials.imapTls !== false,
            }
          : {}),
        timestamp: new Date().toISOString(),
      };

      await onConnect(payload);
    } catch (err: any) {
      console.error("Erreur de connexion:", err);
      setError(err?.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  const domain = credentials.email.split("@")[1]?.toLowerCase();

  function getConfigSuggestions() {
    if (!domain) return [];
    return [
      { host: `mail.${domain}`, port: 993, secure: true, name: "IMAP SSL standard" },
      { host: `imap.${domain}`, port: 993, secure: true, name: "IMAP SSL (alternative)" },
      { host: `mail.${domain}`, port: 143, secure: false, name: "IMAP non-SSL (fallback)" },
      { host: `webmail.${domain}`, port: 993, secure: true, name: "IMAP via webmail (si dispo)" },
    ];
  }

  const passwordIsRequired = !(credentials.provider === "gmail" && !!credentials.accessToken);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
            📧
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Pépite Mail IA</h2>
          <p className="mt-2 text-sm text-gray-600">Connexion universelle à votre email</p>
          {user?.email && (
            <div className="mt-2 p-2 bg-green-100 rounded-lg">
              <p className="text-sm text-green-800">Connecté avec Google: <strong>{user.email}</strong></p>
            </div>
          )}
        </div>

        {/* Choix provider */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Choisir votre provider email</h3>
          <div className="grid grid-cols-1 gap-3">
            {(Object.keys(providerConfigs) as ProviderKey[]).map((key) => {
              const cfg = providerConfigs[key];
              const active = credentials.provider === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleProviderSelect(key)}
                  className={`relative p-4 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                    active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{cfg.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">{cfg.name}</div>
                    <div className="text-sm text-gray-600">{cfg.helpText}</div>
                  </div>
                  {cfg.oauth && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">OAuth</span>}
                  {active && <CheckCircle className="h-5 w-5 text-blue-500" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Gmail OAuth */}
        {credentials.provider === "gmail" && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">Connexion sécurisée Google</h4>
                  <p className="text-sm text-green-700">Accédez à vos emails sans mot de passe d’application (scopes Gmail requis).</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connexion en cours...
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Se connecter avec Google
                </>
              )}
            </button>

            {credentials.accessToken && (
              <div className="text-xs text-green-700">Jeton Google obtenu. Vous pouvez continuer.</div>
            )}

            <div className="text-center">
              <span className="text-sm text-gray-500">ou utilisez la connexion IMAP ci-dessous</span>
            </div>
          </div>
        )}

        {/* Formulaire générique / IMAP */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Adresse email</label>
            <div className="mt-1 relative">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={credentials.email}
                onChange={(e) => setCredentials((prev) => ({ ...prev, email: e.target.value }))}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="votre@email.com"
              />
              <Mail className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mot de passe</label>
            <div className="mt-1 relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required={passwordIsRequired}
                value={credentials.password || ""}
                onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={credentials.provider === "gmail" ? "Mot de passe d’application (si pas OAuth)" : "Votre mot de passe"}
              />
              <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
              </button>
            </div>
          </div>

          {domain && credentials.provider === "auto" && getConfigSuggestions().length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <HelpCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-800">Domaine non reconnu</h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    Essayez ces configurations ou basculez en “Configuration manuelle”.
                  </p>
                  <div className="space-y-2">
                    {getConfigSuggestions().map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleConfigSuggestion(s)}
                        className="w-full text-left p-2 bg-white border border-yellow-300 rounded text-sm hover:bg-yellow-50"
                      >
                        <div className="font-medium">{s.name}</div>
                        <div className="text-gray-600">
                          {s.host}:{s.port} {s.secure ? "(SSL)" : "(Non-SSL)"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(showAdvanced || credentials.provider === "custom") && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Configuration IMAP</h4>
                <Settings className="h-5 w-5 text-gray-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Serveur IMAP</label>
                  <input
                    type="text"
                    value={credentials.imapHost || ""}
                    onChange={(e) => setCredentials((prev) => ({ ...prev, imapHost: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="imap.example.com"
                    required={credentials.provider === "custom"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Port</label>
                  <input
                    type="number"
                    value={credentials.imapPort || 993}
                    onChange={(e) => setCredentials((prev) => ({ ...prev, imapPort: parseInt(e.target.value || "993", 10) }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="imapTls"
                    checked={credentials.imapTls !== false}
                    onChange={(e) => setCredentials((prev) => ({ ...prev, imapTls: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="imapTls" className="ml-2 text-sm text-gray-700">Utiliser SSL/TLS (recommandé)</label>
                </div>
              </div>
            </div>
          )}

          {!showAdvanced && credentials.provider !== "custom" && credentials.provider !== "gmail" && (
            <button type="button" onClick={() => setShowAdvanced(true)} className="text-sm text-blue-600 hover:text-blue-500 flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Configuration manuelle
            </button>
          )}

          {error && (
            <div className="flex items-start space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p>{error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connexion en cours...
              </div>
            ) : (
              "Se connecter"
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">🔒 Connexion sécurisée et chiffrée</p>
        </div>
      </div>
    </div>
  );
}