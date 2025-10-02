"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CodeAuthProvider } from "@/components/auth/CodeAuthContext";
import { AppWithAuth } from "@/components/AppWithAuth";
import { useCodeAuth } from "@/components/auth/CodeAuthContext";
import { Header } from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { LeftPane } from "@/components/LeftPane";
import { RightPane } from "@/components/RightPane";
import { ResizablePane } from "@/components/ResizablePane";
import { AIProvider } from "@/components/AIContext";
import type { Email } from "@/lib/types";
import { deriveUserName, nowUTCString } from "@/lib/email/credentials";
import { 
  Building2, 
  User, 
  Key, 
  ArrowRight, 
  Crown, 
  Users,
  LogOut
} from "lucide-react";

export default function Page() {
  return (
    <CodeAuthProvider>
      <AppWithAuth>
        <HomePage />
      </AppWithAuth>
    </CodeAuthProvider>
  );
}

function HomePage() {
  const { isAuthenticated, user } = useCodeAuth();
  const router = useRouter();

  // Si pas authentifié, afficher notre système d'authentification directement
  if (!isAuthenticated) {
    return <SmartLoginComponent />;
  }

  // Si authentifié, afficher l'application complète
  return <EmailApp />;
}

// Composant d'authentification intégré
function SmartLoginComponent() {
  const [step, setStep] = useState<'company-check' | 'login-form'>('company-check');
  const [companyName, setCompanyName] = useState('');
  const [checkResult, setCheckResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [userInfo, setUserInfo] = useState({
    name: '',
    code: '',
    role: ''
  });

  const roleOptions = [
    { value: 'Directeur Général', label: 'Directeur Général' },
    { value: 'Administration', label: 'Administration' },
    { value: 'Financier', label: 'Financier' },
    { value: 'Assistant', label: 'Assistant' },
    { value: 'Assistante', label: 'Assistante' },
    { value: 'Employé', label: 'Employé' }
  ];

  // Étape 1 : Vérifier l'entreprise
  const handleCompanyCheck = async () => {
    if (!companyName.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/auth/check-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim() })
      });

      const result = await response.json();
      
      if (response.ok) {
        setCheckResult(result);
        // Pré-remplir automatiquement le code requis
        setUserInfo({ ...userInfo, code: result.requiredCode });
        setStep('login-form');
      } else {
        alert(result.error || 'Erreur lors de la vérification');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  // Étape 2 : Connexion ou création
  const handleLogin = async () => {
    if (!userInfo.name.trim() || !userInfo.code || !userInfo.role) return;

    setLoading(true);
    try {
      if (checkResult?.screenType === 'founder-setup') {
        // Créer l'entreprise (le fondateur devient toujours DG)
        const response = await fetch('/api/auth/check-company', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: checkResult.companyName,
            founderName: userInfo.name,
            code: userInfo.code
          })
        });

        const result = await response.json();
        
        if (response.ok) {
          // Sauvegarder la session fondateur pour accès global
          const userData = {
            id: result.user.id || `founder_${Date.now()}`,
            name: result.user.name,
            company: result.user.company || checkResult.companyName,
            role: 'Directeur Général', // Le fondateur est toujours DG
            level: 10,
            permissions: ['all'],
            companyId: result.company?.id || `company_${Date.now()}`,
            companyCode: result.company?.code || checkResult.companyName.substring(0, 4).toUpperCase()
          };
          localStorage.setItem('user-session', JSON.stringify(userData));
          
          console.log('✅ Fondateur créé et connecté:', userData);
          
          // Actualiser la page pour charger l'EmailApp
          window.location.reload();
        } else {
          alert(result.error || 'Erreur lors de la création');
        }
      } else if (checkResult) {
        // Connexion employé avec rôle choisi
        const response = await fetch('/api/auth/employee-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: checkResult.companyName,
            employeeName: userInfo.name,
            role: userInfo.role,
            code: userInfo.code
          })
        });

        const result = await response.json();

        if (response.ok) {
          // Sauvegarder la session employé pour accès global
          const userData = {
            id: result.user.id,
            name: result.user.name,
            company: result.user.company,
            role: result.user.role,
            level: result.user.role === 'Directeur Général' ? 10 : 5,
            permissions: result.user.role === 'Directeur Général' ? ['all'] : ['read', 'create'],
            companyId: result.company?.id,
            companyCode: result.company?.code || checkResult.companyName.substring(0, 4).toUpperCase()
          };
          localStorage.setItem('user-session', JSON.stringify(userData));
          
          console.log('✅ Employé connecté automatiquement:', userData);
          
          // Actualiser la page pour charger l'EmailApp
          window.location.reload();
        } else {
          alert(result.error || 'Code incorrect ou erreur de connexion');
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <img 
              src="/icones-logo.png" 
              alt="ICONES BOX Logo" 
              className="w-20 h-20 mx-auto rounded-full shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ICONES BOX</h1>
          <p className="text-gray-600 mt-2">Plateforme collaborative intelligente</p>
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              🌍 <strong>Accès Global Automatique</strong><br/>
              Entrez juste le nom de votre entreprise et votre prénom !
            </p>
          </div>
        </div>

        {/* Étape 1 : Vérification entreprise */}
        {step === 'company-check' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏢 Nom de votre entreprise
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: ALL IN ONE"
                onKeyPress={(e) => e.key === 'Enter' && handleCompanyCheck()}
              />
            </div>

            <button
              onClick={handleCompanyCheck}
              disabled={!companyName.trim() || loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Étape 2 : Formulaire de connexion */}
        {step === 'login-form' && checkResult && (
          <div className="space-y-6">

            {/* Message d'information */}
            <div className={`p-4 rounded-lg ${
              checkResult.screenType === 'founder-setup' 
                ? 'bg-amber-50 border border-amber-200' 
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center gap-3">
                {checkResult.screenType === 'founder-setup' ? (
                  <Crown className="w-5 h-5 text-amber-600" />
                ) : (
                  <Users className="w-5 h-5 text-blue-600" />
                )}
                <div>
                  <p className={`font-medium ${
                    checkResult.screenType === 'founder-setup' ? 'text-amber-800' : 'text-blue-800'
                  }`}>
                    {checkResult.message}
                  </p>
                  {checkResult.screenType === 'founder-setup' && (
                    <p className="text-amber-600 text-sm mt-1">
                      Vous deviendrez le Directeur Général
                    </p>
                  )}
                  {checkResult.screenType === 'employee-login' && (
                    <p className="text-blue-600 text-sm mt-1">
                      ✅ Code employé automatiquement rempli !
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Entreprise sélectionnée */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏢 Entreprise
              </label>
              <div className="px-4 py-3 bg-gray-50 border rounded-lg text-gray-600">
                {checkResult.companyName}
              </div>
            </div>

            {/* Nom utilisateur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                {checkResult.screenType === 'founder-setup' ? 'Votre nom complet' : 'Votre prénom'}
              </label>
              <input
                type="text"
                value={userInfo.name}
                onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={checkResult.screenType === 'founder-setup' ? 'Jean Dupont' : 'Marie'}
              />
            </div>

            {/* Sélecteur de rôle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Votre rôle dans l'entreprise
              </label>
              <select
                value={userInfo.role}
                onChange={(e) => setUserInfo({...userInfo, role: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                required
              >
                <option value="">Sélectionnez votre rôle</option>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {checkResult.screenType === 'founder-setup' && userInfo.role && userInfo.role !== 'Directeur Général' && (
                <p className="text-amber-600 text-sm mt-1">
                  ⚠️ En tant que fondateur, vous aurez les privilèges de Directeur Général
                </p>
              )}
            </div>

            {/* Code d'accès */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Key className="w-4 h-4 inline mr-1" />
                Code d'accès ({checkResult.requiredCode})
              </label>
              <input
                type="password"
                value={userInfo.code}
                onChange={(e) => setUserInfo({...userInfo, code: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="****"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('company-check')}
                className="flex-1 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Retour
              </button>
              <button
                onClick={handleLogin}
                disabled={!userInfo.name.trim() || !userInfo.code || !userInfo.role || loading}
                className={`flex-2 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  checkResult.screenType === 'founder-setup'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                ) : (
                  checkResult.screenType === 'founder-setup' ? 'Créer l\'entreprise' : 'Se connecter'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmailApp() {
  const { user, logout } = useCodeAuth();
  const [items, setItems] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState("INBOX");
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set());
  const [source, setSource] = useState("email");
  
  // États pour le compte actif
  const [activeAccount, setActiveAccount] = useState<any>(null);
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);

  const handleLogout = () => {
    logout();
    // Pas besoin de rechargement, le système se mettra à jour automatiquement
  };

  // Vérifier les paramètres URL pour Gmail success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_connected') === 'success') {
      // Supprimer le paramètre de l'URL et recharger les comptes
      window.history.replaceState({}, document.title, window.location.pathname);
      console.log('🎉 Gmail connecté avec succès, rechargement des comptes...');
      setTimeout(() => {
        checkActiveAccount();
      }, 1000);
    } else if (params.get('gmail_connected') === 'error') {
      window.history.replaceState({}, document.title, window.location.pathname);
      console.error('❌ Erreur connexion Gmail');
      setError('Erreur lors de la connexion Gmail');
    }
  }, []);

  // Vérifier le compte actif au chargement
  useEffect(() => {
    checkActiveAccount();
  }, []);

  const checkActiveAccount = async () => {
    try {
      setIsCheckingAccount(true);
      const response = await fetch('/api/email/active');
      if (response.ok) {
        const data = await response.json();
        if (data.hasActiveAccount) {
          setActiveAccount(data.activeAccount);
          loadEmailData(currentFolder, data.activeAccount);
        } else {
          setActiveAccount(null);
          loadWelcomeEmails();
        }
      } else {
        setActiveAccount(null);
        loadWelcomeEmails();
      }
    } catch (error) {
      console.error("Erreur vérification compte:", error);
      setActiveAccount(null);
      loadWelcomeEmails();
    } finally {
      setIsCheckingAccount(false);
    }
  };

  const loadWelcomeEmails = () => {
    const welcomeEmails: Email[] = [
      {
        id: 'welcome-1',
        subject: "🔗 Connectez votre premier compte email",
        from: 'system@pepitemail.com',
        fromName: 'ICONES BOX',
        date: new Date().toISOString(),
        snippet: "Cliquez sur le sélecteur de comptes dans le header pour vous connecter à Gmail, Outlook ou d'autres providers.",
        unread: true,
        hasAttachments: false
      }
    ] as any[];
    setItems(welcomeEmails);
  };

  // Fonction pour charger les emails avec pagination infinie
  const loadEmailData = useCallback(async (folder: string = 'INBOX', account: any = null, append: boolean = false) => {
    const currentAccount = account || activeAccount;
    
    if (!currentAccount) {
      loadWelcomeEmails();
      return;
    }

    try {
      if (!append) {
        setLoading(true);
        setError(null);
      }
      
      console.log("Chargement emails pour compte:", currentAccount.email, "dossier:", folder);
      
      const currentCount = append ? items.length : 0;
      
      // Charger les emails via l'API avec pagination
      const response = await fetch(`/api/email/emails?folder=${folder}&skip=${currentCount}&limit=100`);
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`📧 ${data.emails.length} emails chargés pour ${data.account.email}`);
        
        if (append) {
          // Ajouter les nouveaux emails en évitant les doublons
          setItems(prevItems => {
            const existingIds = new Set(prevItems.map(item => item.id));
            const newEmails = data.emails.filter((email: any) => !existingIds.has(email.id));
            return [...prevItems, ...newEmails];
          });
        } else {
          setItems(data.emails);
        }
      } else {
        throw new Error(data.error || 'Erreur de chargement');
      }
      
    } catch (e: any) {
      console.error("Erreur chargement emails:", e);
      setError(e.message);
      
      // En cas d'erreur, garder la liste telle quelle et afficher l'erreur
      if (!append) {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [activeAccount, items.length]);

  // Fonction pour charger plus d'emails (scroll infini)
  const loadMoreEmails = useCallback(() => {
    if (!loading && activeAccount) {
      loadEmailData(currentFolder, activeAccount, true);
    }
  }, [loadEmailData, loading, activeAccount, currentFolder]);

  // Chargement initial
  useEffect(() => {
    if (!isCheckingAccount && activeAccount) {
      loadEmailData(currentFolder);
    }
  }, [currentFolder, loadEmailData, isCheckingAccount, activeAccount]);

  const handleRefresh = () => {
    if (activeAccount) {
      loadEmailData(currentFolder);
    } else {
      checkActiveAccount();
    }
    setCheckedEmails(new Set());
  };

  const handleAccountChange = (account: any) => {
    setActiveAccount(account);
    if (account) {
      loadEmailData(currentFolder, account);
    } else {
      loadWelcomeEmails();
    }
  };

  const handleFolderChange = (newFolder: string) => {
    setCurrentFolder(newFolder);
  };

  const handleDisconnect = () => {
    // Fonction vide pour éviter les erreurs
    console.log("Déconnexion désactivée");
  };

  const handleSourceChange = (newSource: string) => {
    setSource(newSource);
    handleRefresh();
  };

  return (
    <AIProvider>
      <div className="h-screen flex flex-col">
        {/* Header personnalisé avec déconnexion */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">ICONES BOX</h1>
                <div className="text-sm text-gray-600">
                  Connecté : <span className="font-medium">{user?.name}</span>
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {user?.role}
                  </span>
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                    {user?.company}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>

        <Header 
          source={source}
          onSourceChange={handleSourceChange}
          currentFolder={currentFolder}
          onFolderChange={handleFolderChange}
          emailCredentials={undefined}
          onDisconnect={handleDisconnect}
          onRefresh={handleRefresh}
          userInfo={undefined}
          onAccountChange={handleAccountChange}
        />

        <div className="bg-gradient-to-r from-blue-50 to-green-50 border-b border-blue-200 px-4 py-2 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-blue-700 font-medium">📊 Source: {source}</span>
            {isCheckingAccount ? (
              <span className="text-orange-600">🔄 Vérification compte...</span>
            ) : activeAccount ? (
              <>
                <span className="text-green-700 font-medium">👤 {activeAccount.email.split('@')[0]}</span>
                <span className="text-blue-600">📧 {activeAccount.email}</span>
                <span className="text-purple-600">🔗 {activeAccount.provider.name}</span>
              </>
            ) : (
              <span className="text-red-600">❌ Aucun compte connecté</span>
            )}
            <span className="text-orange-600 font-medium">📁 {currentFolder}</span>
            <span className="text-blue-600">📧 {items.length} emails</span>
          </div>
          {error && <div className="text-red-600">⚠️ {error}</div>}
          {loading && <div className="text-blue-600">🔄 Chargement...</div>}
        </div>
        
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="w-64 icones-sidebar">
            <Sidebar 
              currentFolder={currentFolder}
              onFolderChange={handleFolderChange}
              userInfo={undefined}
              onRefresh={handleRefresh}
              isConnected={true}
            />
          </div>
          
          <div className="flex-1 min-w-0 p-2">
            <ResizablePane
              leftPane={
                <div className="icones-panel h-full">
                  <LeftPane 
                    items={items} 
                    loading={loading}
                    onRefresh={handleRefresh}
                    checkedEmails={checkedEmails}
                    setCheckedEmails={setCheckedEmails}
                    userInfo={{
                      userName: activeAccount?.email?.split('@')[0] || 'User',
                      email: activeAccount?.email || '',
                      provider: activeAccount?.provider?.name || ''
                    }}
                    onLoadMore={loadMoreEmails}
                  />
                </div>
              }
              rightPane={
                <div className="icones-panel h-full">
                  <RightPane 
                    items={items}
                    onRefresh={handleRefresh}
                    checkedEmails={checkedEmails}
                  />
                </div>
              }
              defaultLeftWidth={400}
              minLeftWidth={300}
              maxLeftWidth={600}
            />
          </div>
        </div>
      </div>
    </AIProvider>
  );
}