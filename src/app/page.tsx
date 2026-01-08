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
import { useUI } from "@/store";
import getRealtimeClient from "@/lib/realtime/client";
import { 
  Building2, 
  User, 
  Users,
  Key, 
  ArrowRight, 
  Crown,
  Plus,
  Briefcase,
  Mail,
  Layout,
  CheckSquare,
  CheckCircle,
  BarChart3,
  Activity,
  Calendar,
  FolderKanban,
  UserPlus,
  X,
  Clock,
  AlertCircle,
  ChevronDown,
  Target,
  Trash2,
  Edit3,
  UserCheck,
  TrendingUp,
  Filter,
  Search
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
    <div className="fixed inset-0 bg-[#0a1628] flex items-center justify-center p-4 overflow-auto">
      {/* Animated background elements - couleurs assorties au logo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-fuchsia-500/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative bg-[#111d32]/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md my-8 border border-cyan-500/20">
        
        {/* Logo avec effet lumineux */}
        <div className="text-center mb-8">
          <div className="inline-block mb-6 relative">
            {/* Glow effect derrière le logo */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-fuchsia-500 rounded-full blur-2xl opacity-30 animate-pulse scale-125"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-500 to-cyan-400 rounded-full blur-xl opacity-20 scale-110"></div>
            
            {/* Conteneur du logo */}
            <div className="relative w-28 h-28 mx-auto rounded-full overflow-hidden shadow-2xl ring-4 ring-cyan-400/30 ring-offset-4 ring-offset-[#0a1628]">
              <img 
                src="/logo.png" 
                alt="ICONES BOX Logo" 
                className="w-full h-full object-cover scale-125 animate-[spin_8s_linear_infinite]"
              />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            ICONES BOX
          </h1>
          <p className="text-cyan-200/70">Plateforme collaborative intelligente</p>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <p className="text-sm font-semibold text-cyan-300">Accès Global Automatique</p>
            </div>
            <p className="text-xs text-cyan-200/60">
              Entrez juste le nom de votre entreprise et votre prénom !
            </p>
          </div>
        </div>

        {/* Étape 1 : Vérification entreprise */}
        {step === 'company-check' && (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-cyan-200 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Nom de votre entreprise
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-4 bg-[#0a1628]/80 border border-cyan-500/30 rounded-xl text-white placeholder-cyan-200/30 focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:bg-[#0a1628] transition-all outline-none"
                placeholder="Ex: ALL IN ONE"
                onKeyPress={(e) => e.key === 'Enter' && handleCompanyCheck()}
              />
            </div>

            <button
              onClick={handleCompanyCheck}
              disabled={!companyName.trim() || loading}
              className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-fuchsia-500 text-white py-4 rounded-xl hover:from-cyan-400 hover:via-blue-400 hover:to-fuchsia-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Étape 2 : Formulaire de connexion */}
        {step === 'login-form' && checkResult && (
          <div className="space-y-5">

            {/* Message d'information (entreprise existante vs nouvelle) */}
            {checkResult.screenType === 'employee-login' && (
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-cyan-200">Entreprise trouvée</p>
                    <p className="text-cyan-300/70 text-sm mt-1">Vous rejoignez <strong className="text-cyan-200">{checkResult.companyName}</strong>. Entrez votre prénom, rôle et PIN.</p>
                  </div>
                </div>
              </div>
            )}
            {checkResult.screenType === 'founder-setup' && (
              <div className="p-4 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-400/20 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 flex items-center justify-center flex-shrink-0">
                    <Crown className="w-5 h-5 text-fuchsia-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-fuchsia-200">Nouvelle entreprise</p>
                    <p className="text-fuchsia-300/70 text-sm mt-1">Création de <strong className="text-fuchsia-200">{checkResult.companyName}</strong>. Code fondateur: <span className="font-mono bg-fuchsia-500/20 px-1.5 py-0.5 rounded">1234</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* Entreprise sélectionnée */}
            <div>
              <label className="text-sm font-medium text-cyan-200 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Entreprise
              </label>
              <div className="px-4 py-3.5 bg-[#0a1628]/60 border border-cyan-500/20 rounded-xl text-cyan-100/70 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-400" />
                {checkResult.companyName}
              </div>
            </div>

            {/* Nom utilisateur */}
            <div>
              <label className="text-sm font-medium text-cyan-200 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                {checkResult.screenType === 'founder-setup' ? 'Votre nom complet' : 'Votre prénom'}
              </label>
              <input
                type="text"
                value={userInfo.name}
                onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                className="w-full px-4 py-3.5 bg-[#0a1628]/80 border border-cyan-500/30 rounded-xl text-white placeholder-cyan-200/30 focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:bg-[#0a1628] transition-all outline-none"
                placeholder={checkResult.screenType === 'founder-setup' ? 'Jean Dupont' : 'Marie'}
                onBlur={async () => {
                  if (!userInfo.name.trim() || checkResult?.screenType === 'founder-setup') { setExistingUser(null); return; }
                  setCheckingUser(true);
                  try {
                    const resp = await fetch('/api/auth/check-user', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ companyName: checkResult.companyName, name: userInfo.name.trim() }) });
                    const data = await resp.json();
                    if (data.exists) {
                      setExistingUser({ id: data.user.id, role: data.user.role, level: data.user.level });
                      setUserInfo(u => ({ ...u, role: data.user.role }));
                    } else setExistingUser(null);
                  } catch {}
                  finally { setCheckingUser(false); }
                }}
              />
              {checkingUser && <p className="text-xs text-cyan-300 mt-2 flex items-center gap-1"><div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div> Vérification...</p>}
              {existingUser && <p className="text-xs text-fuchsia-300 mt-2 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Compte existant (rôle: <span className="font-semibold">{existingUser.role}</span>)</p>}
            </div>

            {/* Sélecteur de rôle */}
            <div>
              <label className="text-sm font-medium text-cyan-200 mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Votre rôle
              </label>
              <select
                value={userInfo.role}
                onChange={(e) => setUserInfo({...userInfo, role: e.target.value, customRole: ''})}
                className={`w-full px-4 py-3.5 bg-[#0a1628]/80 border border-cyan-500/30 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:bg-[#0a1628] transition-all outline-none appearance-none cursor-pointer ${existingUser ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={!!existingUser}
                required
                style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2367e8f9'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px'}}
              >
                <option value="" className="bg-[#0a1628] text-white">Sélectionnez votre rôle</option>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#0a1628] text-white">
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
                    className="w-full px-4 py-3.5 bg-[#0a1628]/80 border border-cyan-500/30 rounded-xl text-white placeholder-cyan-200/30 focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:bg-[#0a1628] transition-all outline-none"
                    placeholder="Précisez votre rôle..."
                    required
                  />
                </div>
              )}
              
              {checkResult.screenType === 'founder-setup' && userInfo.role && userInfo.role !== 'Directeur Général' && (
                <p className="text-fuchsia-300/80 text-xs mt-2 flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Vous aurez les privilèges de Directeur Général
                </p>
              )}
            </div>

            {/* Code fondateur */}
            {checkResult.screenType === 'founder-setup' && (
              <div>
                <label className="text-sm font-medium text-cyan-200 mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4" /> Code fondateur
                </label>
                <input
                  type="password"
                  value={userInfo.founderCode}
                  onChange={(e) => setUserInfo({...userInfo, founderCode: e.target.value})}
                  className="w-full px-4 py-3.5 bg-[#0a1628]/80 border border-cyan-500/30 rounded-xl text-white placeholder-cyan-200/30 focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:bg-[#0a1628] transition-all outline-none font-mono tracking-widest"
                  placeholder="••••"
                  maxLength={4}
                />
              </div>
            )}
            
            {/* PIN */}
            <div>
              <label className="text-sm font-medium text-cyan-200 mb-2 flex items-center gap-2">
                <Key className="w-4 h-4" /> PIN sécurisé (4-6 chiffres)
              </label>
              <input
                type="password"
                value={userInfo.pin}
                onChange={(e) => setUserInfo({...userInfo, pin: e.target.value.replace(/\D/g, '').slice(0, 6)})}
                className="w-full px-4 py-3.5 bg-[#0a1628]/80 border border-cyan-500/30 rounded-xl text-white placeholder-cyan-200/30 focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:bg-[#0a1628] transition-all outline-none font-mono tracking-widest text-center text-lg"
                placeholder="••••••"
                maxLength={6}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setStep('company-check'); setExistingUser(null); }}
                className="flex-1 py-3.5 text-cyan-200/70 bg-[#0a1628]/60 border border-cyan-500/20 rounded-xl hover:bg-[#0a1628] transition-all flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Retour
              </button>
              <button
                onClick={handleLogin}
                disabled={!userInfo.name.trim() || !userInfo.pin || !userInfo.role || loading}
                className={`flex-[2] py-3.5 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 ${
                  checkResult.screenType === 'founder-setup'
                    ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 shadow-fuchsia-500/20 hover:shadow-fuchsia-500/40'
                    : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-fuchsia-500 shadow-cyan-500/20 hover:shadow-cyan-500/40'
                }`}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    {checkResult.screenType === 'founder-setup' ? 'Créer' : 'Connexion'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-cyan-500/10 text-center">
          <p className="text-cyan-200/30 text-xs">
            © 2025 ICONES BOX • Plateforme sécurisée
          </p>
        </div>
      </div>
    </div>
  );
}

// Interface de gestion sans emails
function ManagementInterface() {
  const { user } = useCodeAuth();
  const { toggleManagementMode } = useUI();
  const [activeSection, setActiveSection] = useState<'dashboard' | 'team' | 'tasks' | 'reports'>('dashboard');

  return (
    <div className="flex-1 flex bg-gray-50 dark:bg-slate-900 transition-colors">
      {/* Sidebar de navigation gestion */}
      <div className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">Mode Gestion</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Emails masqués</p>
            </div>
          </div>
          <button
            onClick={toggleManagementMode}
            className="w-full mt-3 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2 text-gray-700 dark:text-gray-300"
          >
            <Mail className="w-4 h-4" />
            Réactiver les emails
          </button>
        </div>

        <nav className="space-y-1">
          {[
            { id: 'dashboard', label: 'Tableau de bord', icon: Layout },
            { id: 'team', label: 'Équipe', icon: Users },
            { id: 'tasks', label: 'Tâches', icon: CheckSquare },
            { id: 'reports', label: 'Rapports', icon: BarChart3 },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all ${
                activeSection === item.id
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 p-6 overflow-auto">
        {activeSection === 'dashboard' && <ManagementDashboard />}
        {activeSection === 'team' && <TeamSection />}
        {activeSection === 'tasks' && <TasksSection />}
        {activeSection === 'reports' && <ReportsSection />}
      </div>
    </div>
  );
}

// Types pour les données réelles
type TeamMember = {
  id: string;
  name: string;
  role: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: string;
};

type Task = {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'done' | 'cancelled';
  progress: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  userId?: number | null;
  assignedById?: number | null;
  user?: { id: number; name?: string; email?: string; role?: string } | null;
  assignedBy?: { id: number; name?: string; email?: string; role?: string } | null;
  dueAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  metadata?: any;
};

type ActivityLog = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: number;
  details?: string;
};

// Hook pour récupérer l'équipe connectée
function useTeamPresence(companyId: string) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPresence = async () => {
      try {
        const res = await fetch(`/api/team/presence?org=${encodeURIComponent(companyId)}`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members || []);
        }
      } catch (err) {
        console.error('Failed to fetch team presence:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPresence();
    // Rafraîchir toutes les 10 secondes
    const interval = setInterval(fetchPresence, 10000);
    return () => clearInterval(interval);
  }, [companyId]);

  return { members, loading };
}

// Hook pour récupérer tous les utilisateurs de l'entreprise
function useAllTeamMembers(companyName: string) {
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllMembers = async () => {
      try {
        // Utiliser l'API team/members qui se base sur la session
        const res = await fetch(`/api/team/members`);
        if (res.ok) {
          const data = await res.json();
          setAllMembers(data.members || []);
        }
      } catch (err) {
        console.error('Failed to fetch all team members:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllMembers();
  }, [companyName]);

  return { allMembers, loading };
}

// Hook pour les tâches
function useTasks(companyId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        // L'API utilise la session, pas besoin de passer company
        const res = await fetch(`/api/tasks`);
        if (res.ok) {
          const data = await res.json();
          // L'API retourne directement un tableau de tâches
          setTasks(Array.isArray(data) ? data : (data.tasks || []));
        }
      } catch (err) {
        // API peut ne pas exister, utiliser un tableau vide
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [companyId]);

  const addTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, company: companyId })
      });
      if (res.ok) {
        const newTask = await res.json();
        setTasks(prev => [...prev, newTask]);
        return newTask;
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  };

  return { tasks, loading, addTask, updateTask, setTasks };
}

// Composants pour le Mode Gestion
function ManagementDashboard() {
  const { user } = useCodeAuth();
  const companyId = user?.company || 'default';
  const { members, loading: membersLoading } = useTeamPresence(companyId);
  const { tasks } = useTasks(companyId);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  // Charger l'activité récente
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch(`/api/audit?company=${encodeURIComponent(companyId)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data.logs || []);
        }
      } catch (err) {
        // Si l'API n'existe pas, laisser vide
      }
    };
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [companyId]);

  const onlineCount = members.length;
  const pendingTaskCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    if (hours < 24) return `il y a ${hours}h`;
    return `il y a ${days}j`;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau de bord</h1>
          <p className="text-gray-500 dark:text-gray-400">Bienvenue, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm">
          <Briefcase className="w-4 h-4" />
          Mode Gestion actif
        </div>
      </div>

      {/* Cartes de statistiques avec vraies données */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            {membersLoading && <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{onlineCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Équipe en ligne</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingTaskCount + inProgressTasks}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tâches actives</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{inProgressTasks}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">En cours</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{doneTasks}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tâches terminées</p>
        </div>
      </div>

      {/* Équipe en ligne */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-500" />
          Équipe en ligne ({onlineCount})
        </h3>
        {membersLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">Aucun membre en ligne pour le moment</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {member.name?.substring(0, 2).toUpperCase() || '??'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activité récente */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-500" />
          Activité récente
        </h3>
        {activities.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">Aucune activité récente</p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {activity.userName?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{activity.userName}</span> {activity.action}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamSection() {
  const { user } = useCodeAuth();
  const companyName = user?.company || '';
  const { members: onlineMembers } = useTeamPresence(companyName);
  const { allMembers, loading } = useAllTeamMembers(companyName);
  const [searchQuery, setSearchQuery] = useState('');

  // Combiner les membres avec leur statut en ligne
  const membersWithStatus = allMembers.map(member => ({
    ...member,
    isOnline: onlineMembers.some(om => om.id === member.id)
  }));

  const filteredMembers = membersWithStatus.filter(m => 
    m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Équipe - {companyName}</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            {onlineMembers.length} en ligne
          </span>
          <span>•</span>
          <span>{allMembers.length} total</span>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700">
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Aucun membre trouvé' : 'Aucun membre dans cette équipe'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {filteredMembers.map((member) => (
              <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium">
                      {getInitials(member.name)}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${
                      member.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{member.role}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  member.isOnline 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
                }`}>
                  {member.isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TasksSection() {
  const { user } = useCodeAuth();
  const companyId = user?.company || 'default';
  const { tasks, loading, setTasks } = useTasks(companyId);
  const { allMembers } = useAllTeamMembers(companyId);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'all'>('current');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  // Formulaire de nouvelle tâche
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'normal' as Task['priority'],
    dueAt: '',
    assignToUserId: ''
  });

  // Filtrer les tâches
  const filteredTasks = tasks.filter(task => {
    if (filterUser !== 'all' && task.userId?.toString() !== filterUser) return false;
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const doneTasks = filteredTasks.filter(t => t.status === 'done');

  // Statistiques avec animations
  const weekStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    completionRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0
  };

  // Quick add task
  const handleQuickAdd = async () => {
    if (!quickTaskTitle.trim()) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: quickTaskTitle.trim(), priority: 'normal' })
      });
      if (res.ok) {
        const created = await res.json();
        setTasks(prev => [{ ...created, progress: 0 }, ...prev]);
        setQuickTaskTitle('');
      }
    } catch (err) {
      console.error('Quick add error:', err);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title.trim(),
          description: newTask.description.trim(),
          priority: newTask.priority,
          dueAt: newTask.dueAt || null,
          assignToUserId: newTask.assignToUserId || null
        })
      });
      
      if (res.ok) {
        const created = await res.json();
        setTasks(prev => [{ ...created, progress: created.progress || 0 }, ...prev]);
        setNewTask({ title: '', description: '', priority: 'normal', dueAt: '', assignToUserId: '' });
        setShowAddModal(false);
      }
    } catch (err) {
      console.error('Erreur création tâche:', err);
    }
  };

  const updateTaskProgress = async (taskId: string, progress: number) => {
    const newProgress = Math.min(100, Math.max(0, progress));
    
    // Optimistic update
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const newStatus = newProgress === 100 ? 'done' : (newProgress > 0 ? 'in_progress' : 'pending');
        return { ...t, progress: newProgress, status: newStatus };
      }
      return t;
    }));
    
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, progress: newProgress })
      });
    } catch (err) {
      console.error('Erreur mise à jour progress:', err);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, ...updates })
      });
    } catch (err) {
      console.error('Erreur mise à jour tâche:', err);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Supprimer cette tâche ?')) return;
    
    setTasks(prev => prev.filter(t => t.id !== taskId));
    
    try {
      await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Erreur suppression tâche:', err);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'normal': return 'bg-blue-500 text-white';
      case 'low': return 'bg-gray-400 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgent';
      case 'high': return 'Haute';
      case 'normal': return 'Normale';
      case 'low': return 'Basse';
      default: return priority;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-gray-300';
  };

  const getUserName = (userId?: number | null) => {
    if (!userId) return 'Non assigné';
    const member = allMembers.find(m => m.id === userId.toString());
    return member?.name || 'Utilisateur';
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
  };

  // Générer avatar couleur basé sur le nom
  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-rose-500 to-pink-500',
      'from-amber-500 to-orange-500',
      'from-indigo-500 to-blue-600'
    ];
    const index = name?.charCodeAt(0) % gradients.length || 0;
    return gradients[index];
  };

  // Composant carte de tâche avec progression - Design Premium
  const TaskCard = ({ task, isDragging = false }: { task: Task; isDragging?: boolean }) => {
    const [showProgressSlider, setShowProgressSlider] = useState(false);
    const [localProgress, setLocalProgress] = useState(task.progress || 0);
    const isMyTask = task.userId?.toString() === user?.id;
    const assigneeName = task.user?.name || getUserName(task.userId);
    
    // Sync local progress with task
    useEffect(() => {
      setLocalProgress(task.progress || 0);
    }, [task.progress]);

    const handleProgressChange = (value: number) => {
      setLocalProgress(value);
    };

    const handleProgressCommit = () => {
      if (localProgress !== task.progress) {
        updateTaskProgress(task.id, localProgress);
      }
      setShowProgressSlider(false);
    };
    
    return (
      <div className={`group relative overflow-hidden rounded-2xl transition-all duration-300 ${
        isDragging ? 'scale-105 shadow-2xl rotate-2' : 'hover:shadow-xl hover:-translate-y-1'
      }`}>
        {/* Fond avec effet glassmorphism */}
        <div className={`absolute inset-0 bg-gradient-to-br ${
          task.priority === 'urgent' ? 'from-red-500/10 to-red-600/5' :
          task.priority === 'high' ? 'from-orange-500/10 to-amber-600/5' :
          task.status === 'done' ? 'from-green-500/10 to-emerald-600/5' :
          task.status === 'in_progress' ? 'from-blue-500/10 to-indigo-600/5' :
          'from-gray-500/5 to-slate-600/5'
        }`} />
        
        {/* Bordure avec glow effect pour tâches urgentes */}
        <div className={`relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-5 border ${
          task.priority === 'urgent' ? 'border-red-200 dark:border-red-800 shadow-red-500/20' :
          task.priority === 'high' ? 'border-orange-200 dark:border-orange-800' :
          'border-gray-100/50 dark:border-slate-700/50'
        } rounded-2xl`}>
          
          {/* Indicateur de progression en haut */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 dark:bg-slate-700 rounded-t-2xl overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ease-out ${
                task.progress >= 100 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                task.progress >= 50 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
                task.progress > 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                'bg-gray-200 dark:bg-slate-600'
              }`}
              style={{ width: `${task.progress || 0}%` }}
            />
          </div>

          {/* En-tête avec priorité et actions */}
          <div className="flex items-start justify-between mb-3 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm ${
                task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                task.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' :
                task.priority === 'normal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
              }`}>
                {task.priority === 'urgent' && <AlertCircle className="w-3 h-3" />}
                {getPriorityLabel(task.priority)}
              </span>
              {task.dueAt && (
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  new Date(task.dueAt) < new Date() ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400'
                }`}>
                  <Calendar className="w-3 h-3" />
                  {formatDate(task.dueAt)}
                </span>
              )}
            </div>
            
            {/* Actions avec animation */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-2 group-hover:translate-x-0">
              <button 
                onClick={() => setEditingTask(task)}
                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                title="Modifier"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => deleteTask(task.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Titre et description */}
          <h4 className={`font-semibold text-gray-900 dark:text-white mb-1.5 ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>
            {task.title}
          </h4>
          {task.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">{task.description}</p>
          )}

          {/* Barre de progression interactive */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Progression
              </span>
              <span className={`text-sm font-bold ${
                task.progress >= 100 ? 'text-green-500' : 
                task.progress >= 50 ? 'text-blue-500' : 
                'text-gray-700 dark:text-gray-300'
              }`}>
                {task.progress || 0}%
              </span>
            </div>
            
            {/* Clickable progress bar */}
            <div 
              className={`relative h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden ${
                isMyTask ? 'cursor-pointer hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-600 transition-all' : ''
              }`}
              onClick={() => isMyTask && setShowProgressSlider(!showProgressSlider)}
              title={isMyTask ? "Cliquer pour modifier votre progression" : `Seul ${assigneeName} peut modifier`}
            >
              <div 
                className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out ${
                  task.progress >= 100 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                  task.progress >= 75 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
                  task.progress >= 50 ? 'bg-gradient-to-r from-cyan-400 to-blue-500' :
                  task.progress >= 25 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                  'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-slate-500 dark:to-slate-600'
                }`}
                style={{ width: `${task.progress || 0}%` }}
              />
              {isMyTask && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-white drop-shadow-sm">
                    Modifier
                  </span>
                </div>
              )}
            </div>
            
            {/* Slider de progression amélioré */}
            {showProgressSlider && isMyTask && (
              <div className="mt-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-xl border border-blue-100 dark:border-slate-600 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ma progression</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-transparent bg-clip-text">
                    {localProgress}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={localProgress}
                  onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-200 dark:bg-slate-600 rounded-full appearance-none cursor-pointer accent-blue-500 
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
                    [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-indigo-600 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab
                    [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 px-1">
                  {[0, 25, 50, 75, 100].map(val => (
                    <button 
                      key={val}
                      onClick={() => handleProgressChange(val)}
                      className={`px-2 py-1 rounded-md transition-all ${localProgress === val ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleProgressCommit}
                  className="w-full mt-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
                >
                  Enregistrer
                </button>
              </div>
            )}
          </div>

          {/* Assigné avec avatar premium */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className={`relative w-8 h-8 bg-gradient-to-br ${getAvatarGradient(assigneeName)} rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
                {getInitials(assigneeName)}
                {isMyTask && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" />
                )}
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                  {assigneeName}
                </span>
                {isMyTask && (
                  <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Ma tâche</span>
                )}
              </div>
            </div>
            {task.assignedBy && task.assignedBy.id !== task.userId && (
              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                par {task.assignedBy.name}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Premium avec gradient animé */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-8 shadow-2xl">
        {/* Background patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-400 rounded-full blur-3xl transform translate-x-1/3 translate-y-1/3" />
        </div>
        
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center">
                  <CheckSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Gestion des Tâches</h1>
                  <p className="text-purple-200 text-sm">Tableau de bord de productivité</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Quick add input */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl rounded-xl p-1 pl-4 border border-white/20">
                <input
                  type="text"
                  placeholder="Ajouter rapidement..."
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                  className="bg-transparent text-white placeholder-purple-200 outline-none w-48 text-sm"
                />
                <button 
                  onClick={handleQuickAdd}
                  disabled={!quickTaskTitle.trim()}
                  className="p-2.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>
              
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-5 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all shadow-lg shadow-purple-900/20 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nouvelle tâche
              </button>
            </div>
          </div>
          
          {/* Stats Cards Premium */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Taux de complétion (grande carte) */}
            <div className="col-span-2 lg:col-span-1 bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-purple-200 text-sm font-medium">Complétion</span>
                <Target className="w-5 h-5 text-purple-300" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-white">{weekStats.completionRate}</span>
                <span className="text-2xl text-purple-200 mb-1">%</span>
              </div>
              <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-400 transition-all duration-1000"
                  style={{ width: `${weekStats.completionRate}%` }}
                />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-200 text-sm">Total</span>
                <FolderKanban className="w-4 h-4 text-purple-300 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-bold text-white">{weekStats.total}</p>
              <p className="text-xs text-purple-300 mt-1">tâches créées</p>
            </div>
            
            <div className="bg-amber-500/20 backdrop-blur-xl rounded-2xl p-5 border border-amber-400/30 hover:bg-amber-500/30 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-200 text-sm">À faire</span>
                <Clock className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-bold text-white">{weekStats.pending}</p>
              <p className="text-xs text-amber-300 mt-1">en attente</p>
            </div>
            
            <div className="bg-blue-500/20 backdrop-blur-xl rounded-2xl p-5 border border-blue-400/30 hover:bg-blue-500/30 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-200 text-sm">En cours</span>
                <Activity className="w-4 h-4 text-blue-300 animate-pulse group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-bold text-white">{weekStats.inProgress}</p>
              <p className="text-xs text-blue-300 mt-1">actives</p>
            </div>
            
            <div className="bg-emerald-500/20 backdrop-blur-xl rounded-2xl p-5 border border-emerald-400/30 hover:bg-emerald-500/30 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-200 text-sm">Terminées</span>
                <CheckCircle className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-bold text-white">{weekStats.completed}</p>
              <p className="text-xs text-emerald-300 mt-1">cette semaine</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres Premium */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-slate-700 p-5">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search avec icon animé */}
          <div className="flex items-center gap-3 flex-1 min-w-[250px] bg-gray-50 dark:bg-slate-700/50 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-purple-500 transition-all">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une tâche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Filtres avec design moderne */}
          <div className="flex items-center gap-3">
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="px-4 py-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-gray-700 dark:text-gray-300 text-sm outline-none border-0 focus:ring-2 focus:ring-purple-500 cursor-pointer min-w-[150px]"
            >
              <option value="all">👥 Tous les membres</option>
              {allMembers.map(member => (
                <option key={member.id} value={member.id}>👤 {member.name}</option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-gray-700 dark:text-gray-300 text-sm outline-none border-0 focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">📊 Tous les statuts</option>
              <option value="pending">⏳ À faire</option>
              <option value="in_progress">🔄 En cours</option>
              <option value="done">✅ Terminé</option>
            </select>
          </div>

          {/* Toggle vue Kanban/Liste */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded-xl p-1.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'kanban' 
                  ? 'bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-400 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-400 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Liste
            </button>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 animate-pulse">Chargement des tâches...</p>
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne À faire */}
          <div className="bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-900/30 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">À faire</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tâches en attente</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 px-3 py-1 rounded-lg">
                  {pendingTasks.length}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-4 min-h-[300px] max-h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
              {pendingTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                    <CheckSquare className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">Aucune tâche en attente</p>
                  <p className="text-xs mt-1">Les nouvelles tâches apparaîtront ici</p>
                </div>
              ) : (
                pendingTasks.map(task => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          </div>

          {/* Colonne En cours */}
          <div className="bg-gradient-to-b from-blue-50 to-indigo-50/30 dark:from-blue-900/20 dark:to-indigo-900/10 rounded-2xl border border-blue-200/50 dark:border-blue-800/30 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-100/80 to-indigo-100/50 dark:from-blue-900/30 dark:to-indigo-900/20 border-b border-blue-200/50 dark:border-blue-800/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-700 dark:text-blue-300">En cours</h3>
                    <p className="text-xs text-blue-500 dark:text-blue-400">Tâches actives</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-3 py-1 rounded-lg">
                  {inProgressTasks.length}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-4 min-h-[300px] max-h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 dark:scrollbar-thumb-blue-800">
              {inProgressTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-blue-400 dark:text-blue-500">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">Aucune tâche en cours</p>
                  <p className="text-xs mt-1">Commencez une tâche pour la voir ici</p>
                </div>
              ) : (
                inProgressTasks.map(task => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          </div>

          {/* Colonne Terminé */}
          <div className="bg-gradient-to-b from-emerald-50 to-green-50/30 dark:from-emerald-900/20 dark:to-green-900/10 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-emerald-100/80 to-green-100/50 dark:from-emerald-900/30 dark:to-green-900/20 border-b border-emerald-200/50 dark:border-emerald-800/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-700 dark:text-emerald-300">Terminé</h3>
                    <p className="text-xs text-emerald-500 dark:text-emerald-400">Tâches accomplies</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 rounded-lg">
                  {doneTasks.length}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-4 min-h-[300px] max-h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-300 dark:scrollbar-thumb-emerald-800">
              {doneTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-emerald-400 dark:text-emerald-500">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4">
                    <Target className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">Aucune tâche terminée</p>
                  <p className="text-xs mt-1">Complétez des tâches pour les voir ici</p>
                </div>
              ) : (
                doneTasks.map(task => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Vue liste */
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tâche</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Assigné</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priorité</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Progression</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Échéance</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {filteredTasks.map(task => (
                <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{task.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                        {getInitials(task.user?.name || getUserName(task.userId))}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{task.user?.name || getUserName(task.userId)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div className={`h-full ${getProgressColor(task.progress || 0)}`} style={{ width: `${task.progress || 0}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{task.progress || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {task.dueAt ? formatDate(task.dueAt) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditingTask(task)} className="p-1 text-gray-400 hover:text-blue-500">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal création de tâche - Premium */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header gradient */}
            <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Nouvelle tâche</h2>
                  <p className="text-purple-200 text-sm">Créer une tâche pour vous ou votre équipe</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Titre de la tâche *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Préparer le rapport mensuel..."
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 outline-none border-2 border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-slate-700 transition-all"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Ajoutez des détails sur cette tâche..."
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 outline-none border-2 border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-slate-700 transition-all resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      Assigner à
                    </span>
                  </label>
                  <select
                    value={newTask.assignToUserId}
                    onChange={(e) => setNewTask(prev => ({ ...prev, assignToUserId: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-purple-500 cursor-pointer transition-all"
                  >
                    <option value="">👤 Moi-même</option>
                    {allMembers.map(member => (
                      <option key={member.id} value={member.id}>👤 {member.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-purple-500" />
                      Priorité
                    </span>
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-purple-500 cursor-pointer transition-all"
                  >
                    <option value="low">🟢 Basse</option>
                    <option value="normal">🔵 Normale</option>
                    <option value="high">🟠 Haute</option>
                    <option value="urgent">🔴 Urgente</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    Échéance
                  </span>
                </label>
                <input
                  type="datetime-local"
                  value={newTask.dueAt}
                  onChange={(e) => setNewTask(prev => ({ ...prev, dueAt: e.target.value }))}
                  className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-purple-500 transition-all"
                />
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 transition-all font-semibold border border-gray-200 dark:border-slate-600"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTask.title.trim()}
                className="flex-1 px-4 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Créer la tâche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal édition de tâche - Premium */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header gradient */}
            <div className="relative bg-gradient-to-r from-blue-600 to-cyan-600 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center">
                  <Edit3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Modifier la tâche</h2>
                  <p className="text-blue-200 text-sm">Mettre à jour les détails</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Titre</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-blue-500 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Description</label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                  className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Progression avec design amélioré */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-2xl p-5 border border-blue-100 dark:border-slate-600">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Progression
                  </label>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-transparent bg-clip-text">
                    {editingTask.progress || 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={editingTask.progress || 0}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, progress: parseInt(e.target.value) } : null)}
                  className="w-full h-3 bg-gray-200 dark:bg-slate-600 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
                    [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-indigo-600 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab"
                />
                <div className="flex justify-between mt-2">
                  {[0, 25, 50, 75, 100].map(val => (
                    <button 
                      key={val}
                      onClick={() => setEditingTask(prev => prev ? { ...prev, progress: val } : null)}
                      className={`text-xs px-2 py-1 rounded-md transition-all ${
                        editingTask.progress === val 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Réassigner à</label>
                  <select
                    value={editingTask.userId?.toString() || ''}
                    onChange={(e) => setEditingTask(prev => prev ? { ...prev, userId: e.target.value ? parseInt(e.target.value) : null } : null)}
                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-blue-500 cursor-pointer transition-all"
                  >
                    <option value="">Non assigné</option>
                    {allMembers.map(member => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Priorité</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask(prev => prev ? { ...prev, priority: e.target.value as Task['priority'] } : null)}
                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-white outline-none border-2 border-transparent focus:border-blue-500 cursor-pointer transition-all"
                  >
                    <option value="low">🟢 Basse</option>
                    <option value="normal">🔵 Normale</option>
                    <option value="high">🟠 Haute</option>
                    <option value="urgent">🔴 Urgente</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => setEditingTask(null)}
                className="flex-1 px-4 py-3.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 transition-all font-semibold border border-gray-200 dark:border-slate-600"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (editingTask) {
                    updateTask(editingTask.id, {
                      title: editingTask.title,
                      description: editingTask.description,
                      progress: editingTask.progress,
                      priority: editingTask.priority,
                      assignToUserId: editingTask.userId
                    } as any);
                    setEditingTask(null);
                  }
                }}
                className="flex-1 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-semibold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsSection() {
  const { user } = useCodeAuth();
  const companyId = user?.company || 'default';
  const { tasks } = useTasks(companyId);
  const { members } = useTeamPresence(companyId);

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length || 1; // éviter division par zéro

  const pendingPercent = Math.round((pendingCount / totalTasks) * 100);
  const inProgressPercent = Math.round((inProgressCount / totalTasks) * 100);
  const donePercent = Math.round((doneCount / totalTasks) * 100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rapports</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition des tâches */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Répartition des tâches</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">À faire</span>
                <span className="font-medium text-gray-900 dark:text-white">{pendingCount} ({pendingPercent}%)</span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gray-400 rounded-full transition-all" style={{ width: `${pendingPercent}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">En cours</span>
                <span className="font-medium text-gray-900 dark:text-white">{inProgressCount} ({inProgressPercent}%)</span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${inProgressPercent}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Terminées</span>
                <span className="font-medium text-gray-900 dark:text-white">{doneCount} ({donePercent}%)</span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${donePercent}%` }} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Résumé équipe */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Résumé de l'équipe</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{members.length}</p>
              <p className="text-sm text-green-700 dark:text-green-300">En ligne maintenant</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{tasks.length}</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Tâches totales</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{inProgressCount}</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">En cours</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{donePercent}%</p>
              <p className="text-sm text-purple-700 dark:text-purple-300">Taux de complétion</p>
            </div>
          </div>
        </div>
      </div>

      {/* Message si aucune donnée */}
      {tasks.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
          <Briefcase className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">Aucune tâche pour le moment</h3>
          <p className="text-sm text-amber-700 dark:text-amber-400">Créez des tâches dans l'onglet "Tâches" pour voir les statistiques ici.</p>
        </div>
      )}
    </div>
  );
}

function EmailApp() {
  const { user, logout } = useCodeAuth();
  const { focusMode, managementMode } = useUI();
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
        
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Mode Gestion - Interface sans emails */}
          {managementMode ? (
            <ManagementInterface />
          ) : isMobile ? (
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
                        name: activeAccount?.email?.split('@')[0] || 'User',
                        email: activeAccount?.email || ''
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
              {/* Sidebar - cachée en mode Focus */}
              <div className={`icones-sidebar transition-all duration-300 ease-in-out ${focusMode ? 'w-0 opacity-0 overflow-hidden' : 'w-64'}`}>
                <Sidebar 
                  currentFolder={currentFolder}
                  onFolderChange={handleFolderChange}
                  userInfo={undefined}
                  onRefresh={handleRefresh}
                  isConnected={true}
                />
              </div>
              <div className={`flex-1 min-w-0 p-2 transition-all duration-300 ${focusMode ? 'max-w-5xl mx-auto' : ''}`}>
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
                          name: activeAccount?.email?.split('@')[0] || 'User',
                          email: activeAccount?.email || ''
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
