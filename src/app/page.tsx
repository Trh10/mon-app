"use client";

import { useEffect, useState, useCallback } from "react";
import { APP_NAME } from "@/config/branding";
import { useRouter } from "next/navigation";
import { useCodeAuth } from "@/components/auth/CodeAuthContext";
import { Header } from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { LeftPane } from "@/components/LeftPane";
import { RightPane } from "@/components/RightPane";
import { ResizablePane } from "@/components/ResizablePane";
import { AIProvider } from "@/components/AIContext";
import type { Email } from "@/lib/types";
import { deriveUserName, nowUTCString } from "@/lib/email/credentials";
import { useIsMobile } from "@/hooks/useIsMobile";
import { 
  Building2, 
  User, 
  Users,
  Key, 
  ArrowRight, 
  Crown
} from "lucide-react";

export default function Page() {
  // Le provider d'authentification est déjà défini au niveau de layout.tsx.
  // Éviter de doubler le provider ici pour prévenir des états divergents.
  return <HomePage />;
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
    pin: '',
    founderCode: '', // utilisé seulement en création (1234)
    role: '',
    customRole: ''
  });
  const [existingUser, setExistingUser] = useState<null | { id: string; role: string; level: number }>(null);
  const [checkingUser, setCheckingUser] = useState(false);

  const roleOptions = [
    { value: 'Directeur Général', label: '👑 Directeur Général', level: 10 },
    { value: 'Administration', label: '📋 Administration', level: 8 },
    { value: 'Financier', label: '💰 Financier', level: 8 },
    { value: 'Assistant', label: '🤝 Assistant', level: 5 },
    { value: 'Assistante', label: '🤝 Assistante', level: 5 },
    { value: 'Employé', label: '👤 Employé', level: 3 },
    { value: 'Autre', label: '✏️ Autre (à préciser)', level: 3 }
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
    if (!userInfo.name.trim() || !userInfo.role) return;
    // PIN requis pour tout le monde (4-6 chiffres)
    if (!/^\d{4,6}$/.test(userInfo.pin)) {
      alert('PIN invalide (4 à 6 chiffres)');
      return;
    }
    if (existingUser && checkResult?.screenType !== 'founder-setup' && userInfo.pin.length === 0) {
      alert('PIN requis pour cet utilisateur');
      return;
    }
    if (checkResult?.screenType === 'founder-setup' && userInfo.founderCode !== '1234') {
      alert('Code fondateur incorrect (1234)');
      return;
    }
    if (userInfo.role === 'Autre' && !userInfo.customRole.trim()) return;

    setLoading(true);
    try {
      if (checkResult?.screenType === 'founder-setup') {
        // Création entreprise avec PIN choisi + code fondateur
        const response = await fetch('/api/auth/check-company', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: checkResult.companyName,
            founderName: userInfo.name,
            code: userInfo.founderCode,
            pin: userInfo.pin
          })
        });

        const result = await response.json();
        
        if (response.ok) {
          // Sauvegarder la session fondateur pour accès global
          const userData = {
            id: result.user.id,
            name: result.user.name,
            company: result.company.name,
            role: 'Directeur Général',
            displayRole: '👑 Directeur Général',
            level: 10,
            permissions: ['all','assign_tasks','view_all','manage_users','private_tasks'],
            companyId: result.company.id,
            companyCode: result.company.code,
            canChangePIN: true,
            isOnline: true,
            joinedAt: new Date().toISOString()
          };
          localStorage.setItem('user-session', JSON.stringify(userData));
          
          console.log('✅ Fondateur créé et connecté:', userData);
          
          // Actualiser la page pour charger l'EmailApp
          window.location.reload();
        } else {
          alert(result.error || 'Erreur lors de la création');
        }
      } else if (checkResult) {
        // Connexion ou création employé
        const response = await fetch('/api/auth/employee-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: checkResult.companyName,
            name: userInfo.name,
            role: userInfo.role === 'Autre' ? userInfo.customRole : userInfo.role,
            pin: userInfo.pin,
            createIfNotExists: true
          })
        });

        const result = await response.json();

        if (response.ok) {
          // Déterminer le rôle final et les permissions
          const finalRole = userInfo.role === 'Autre' ? userInfo.customRole : userInfo.role;
          const roleConfig = roleOptions.find(r => r.value === userInfo.role) || { level: 3 };
          
          // Déterminer les permissions selon le rôle
          let permissions = ['basic'];
          if (['Directeur Général','Administration','Financier'].includes(userInfo.role)) {
            permissions = ['assign_tasks','view_all'];
            if (userInfo.role === 'Directeur Général') permissions = ['all','assign_tasks','view_all','manage_users','private_tasks'];
          }
          
          // Sauvegarder la session employé pour accès global
          const userData = {
            id: result.user.id,
            name: result.user.name || userInfo.name,
            company: checkResult.companyName,
            role: finalRole,
            displayRole: userInfo.role === 'Autre' ? `✏️ ${userInfo.customRole}` : roleOptions.find(r => r.value === userInfo.role)?.label || userInfo.role,
            level: roleConfig.level,
            permissions: permissions,
            companyId: result.user.companyId,
            companyCode: result.user.companyCode,
            canChangePIN: true,
            isOnline: true,
            joinedAt: new Date().toISOString()
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
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md my-8">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <img 
              src="/icones-logo.png" 
              alt={`${process.env.APP_NAME || 'Application'} Logo`} 
              className="w-20 h-20 mx-auto rounded-full shadow-lg"
            />
          </div>
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

            {/* Message d'information (entreprise existante vs nouvelle) */}
            {checkResult.screenType === 'employee-login' && (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 mt-0.5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">Entreprise trouvée</p>
                    <p className="text-blue-700 text-sm mt-1">Vous rejoignez <strong>{checkResult.companyName}</strong>. Entrez votre prénom, choisissez ou confirmez votre rôle et votre PIN (4-6 chiffres). Si votre nom existe déjà vous devrez entrer le PIN existant.</p>
                  </div>
                </div>
              </div>
            )}
            {checkResult.screenType === 'founder-setup' && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <Crown className="w-5 h-5 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">Nouvelle entreprise</p>
                    <p className="text-amber-700 text-sm mt-1">Création de <strong>{checkResult.companyName}</strong>. Entrez votre nom complet, sélectionnez un rôle (vous serez Directeur Général) et définissez votre PIN sécurisé. Code fondateur requis: 1234.</p>
                  </div>
                </div>
              </div>
            )}

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
                onBlur={async () => {
                  if (!userInfo.name.trim() || checkResult?.screenType === 'founder-setup') { setExistingUser(null); return; }
                  setCheckingUser(true);
                  try {
                    const resp = await fetch('/api/auth/check-user', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ companyName: checkResult.companyName, name: userInfo.name.trim() }) });
                    const data = await resp.json();
                    if (data.exists) {
                      setExistingUser({ id: data.user.id, role: data.user.role, level: data.user.level });
                      // auto-select role to existing role
                      setUserInfo(u => ({ ...u, role: data.user.role }));
                    } else setExistingUser(null);
                  } catch {}
                  finally { setCheckingUser(false); }
                }}
              />
              {checkingUser && <p className="text-xs text-blue-600 mt-1">Vérification...</p>}
              {existingUser && <p className="text-xs text-amber-600 mt-1">Nom existant (rôle: <span className="font-medium">{existingUser.role}</span>) – entrez le PIN pour vous connecter.</p>}
            </div>

            {/* Sélecteur de rôle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Votre rôle dans l'entreprise
              </label>
              <select
                value={userInfo.role}
                onChange={(e) => setUserInfo({...userInfo, role: e.target.value, customRole: ''})}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${existingUser ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={!!existingUser}
                required
              >
                <option value="">Sélectionnez votre rôle</option>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              {/* Champ personnalisé si "Autre" est sélectionné */}
              {userInfo.role === 'Autre' && !existingUser && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={userInfo.customRole}
                    onChange={(e) => setUserInfo({...userInfo, customRole: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Précisez votre rôle (ex: Chef de projet, Comptable...)"
                    required
                  />
                </div>
              )}
              
              {checkResult.screenType === 'founder-setup' && userInfo.role && userInfo.role !== 'Directeur Général' && (
                <p className="text-amber-600 text-sm mt-1">
                  ⚠️ En tant que fondateur, vous aurez automatiquement les privilèges de Directeur Général
                </p>
              )}
            </div>

            {/* PIN / fondateur code */}
            {checkResult.screenType === 'founder-setup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Key className="w-4 h-4 inline mr-1" /> Code fondateur (1234)
                </label>
                <input
                  type="password"
                  value={userInfo.founderCode}
                  onChange={(e) => setUserInfo({...userInfo, founderCode: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1234"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Key className="w-4 h-4 inline mr-1" /> PIN (4-6 chiffres)
              </label>
              <input
                type="password"
                value={userInfo.pin}
                onChange={(e) => setUserInfo({...userInfo, pin: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Votre PIN secret"
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
                disabled={!userInfo.name.trim() || !userInfo.pin || !userInfo.role || loading}
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
  
  // (Le bouton de déconnexion est désormais dans le Header principal)

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
        const accEmail = data?.account?.email || 'compte inconnu';
        console.log(`📧 ${data.emails.length} emails chargés pour ${accEmail}`);
        
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

  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<'folders' | 'list' | 'reader'>('list');
  useEffect(() => { if (isMobile) setMobileTab('list'); }, [currentFolder, isMobile]);
  const navBtn = (tab: string) => `flex-1 text-xs py-2 ${mobileTab === tab ? 'text-blue-600 font-semibold border-t-2 border-blue-500 bg-white' : 'text-gray-600'}`;

  return (
    <AIProvider>
  <div className="h-screen flex flex-col">
        {/* Barre utilisateur simplifiée */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-semibold text-gray-800">{APP_NAME}</span>
            {user && (
              <span className="text-gray-600">{user.name} · {user.role}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { localStorage.removeItem('user-session'); logout(); }}
              className="text-xs px-3 py-1 rounded-md bg-red-500 text-white hover:bg-red-600"
            >Déconnexion</button>
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
                <span className="text-green-700 font-medium">👤 {activeAccount?.email?.split('@')[0] || 'User'}</span>
                <span className="text-blue-600">📧 {activeAccount?.email || ''}</span>
                <span className="text-purple-600">🔗 {activeAccount?.provider?.name || ''}</span>
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
          {isMobile ? (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-auto">
                {mobileTab === 'folders' && (
                  <div className="p-2">
                    <Sidebar
                      currentFolder={currentFolder}
                      onFolderChange={(f) => { handleFolderChange(f); setMobileTab('list'); }}
                      userInfo={undefined}
                      onRefresh={handleRefresh}
                      isConnected={true}
                    />
                  </div>
                )}
                {mobileTab === 'list' && (
                  <div className="p-2">
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
                )}
                {mobileTab === 'reader' && (
                  <div className="p-2">
                    <RightPane
                      items={items}
                      onRefresh={handleRefresh}
                      checkedEmails={checkedEmails}
                    />
                  </div>
                )}
              </div>
              <div className="flex border-t border-gray-200 bg-gray-50">
                <button onClick={() => setMobileTab('folders')} className={navBtn('folders')}>Dossiers</button>
                <button onClick={() => setMobileTab('list')} className={navBtn('list')}>Liste</button>
                <button onClick={() => setMobileTab('reader')} className={navBtn('reader')}>Lecture</button>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
      
    </AIProvider>
  );
}