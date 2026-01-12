"use client";

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Users, 
  Plus, 
  Search, 
  Filter,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  X,
  Calendar,
  ArrowRight,
  User,
  LogOut,
  Wallet
} from 'lucide-react';
import Link from 'next/link';
import ClientsList from '@/components/invoices/ClientsList';
import InvoicesList from '@/components/invoices/InvoicesList';
import CreateInvoiceModal from '@/components/invoices/CreateInvoiceModal';
import CreateClientModal from '@/components/invoices/CreateClientModal';
import { ALLINONE_TEMPLATES, INVOICE_TEMPLATES } from '@/lib/invoices/invoice-types';

type Tab = 'invoices' | 'clients';
type StatsModal = 'soldees' | 'encours' | 'recapitulatif' | null;

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  total: number;
  paidAmount?: number;
  status: string;
  client?: {
    companyName?: string;
  };
}

interface Stats {
  total: number;
  draft: number;
  sent: number;
  partial: number;
  paid: number;
  overdue: number;
  cancelled: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

interface MonthlyRecap {
  month: string;
  monthLabel: string;
  invoices: Invoice[];
  totalFacture: number;
  totalEncaisse: number;
}

// Interface pour l'utilisateur de facturation
interface BillingUser {
  firstName: string;
  lastName: string;
  initials: string;
  company: 'icones' | 'allinone';
}

// Définition des entreprises
const COMPANIES = {
  icones: {
    id: 'icones',
    name: 'ICONES Stratégie & Créa',
    shortName: 'ICONES',
    logo: '/logo.png',
    color: 'from-blue-600 to-purple-600',
    bgColor: 'bg-gradient-to-br from-blue-500 to-purple-600',
  },
  allinone: {
    id: 'allinone',
    name: 'ALL IN ONE',
    shortName: 'ALL IN ONE',
    logo: '/allinone-logo.png',
    color: 'from-red-600 to-orange-500',
    bgColor: 'bg-gradient-to-br from-red-500 to-orange-500',
  }
} as const;

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('invoices');
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Système d'identification utilisateur avec entreprise
  const [billingUser, setBillingUser] = useState<BillingUser | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<'icones' | 'allinone' | null>(null);
  const [loginFirstName, setLoginFirstName] = useState('');
  const [loginLastName, setLoginLastName] = useState('');
  
  // Modals de détails stats
  const [statsModal, setStatsModal] = useState<StatsModal>(null);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  
  // Filtre par type de template
  const [templateFilter, setTemplateFilter] = useState<string>('all');

  // Vérifier si l'utilisateur est connecté au module facturation
  useEffect(() => {
    const savedUser = localStorage.getItem('billingUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        // Vérifier que l'utilisateur a bien une entreprise valide
        if (user && user.company && (user.company === 'icones' || user.company === 'allinone')) {
          setBillingUser(user);
          setSelectedCompany(user.company);
        } else {
          // Données anciennes ou invalides, effacer
          localStorage.removeItem('billingUser');
        }
      } catch {
        localStorage.removeItem('billingUser');
      }
    }
  }, []);

  // Charger les statistiques
  useEffect(() => {
    if (billingUser) {
      fetchStats();
      fetchAllInvoices();
    }
  }, [refreshKey, billingUser]);

  // Fonction pour générer les initiales
  const generateInitials = (firstName: string, lastName: string): string => {
    const firstInitial = firstName.trim().charAt(0).toUpperCase();
    const lastInitial = lastName.trim().charAt(0).toUpperCase();
    return `${firstInitial}-${lastInitial}`;
  };

  // Connexion au module facturation
  const handleBillingLogin = () => {
    if (loginFirstName.trim() && loginLastName.trim() && selectedCompany) {
      const initials = generateInitials(loginFirstName, loginLastName);
      const user: BillingUser = {
        firstName: loginFirstName.trim(),
        lastName: loginLastName.trim(),
        initials,
        company: selectedCompany
      };
      localStorage.setItem('billingUser', JSON.stringify(user));
      setBillingUser(user);
      setLoginFirstName('');
      setLoginLastName('');
    }
  };

  // Déconnexion du module facturation
  const handleBillingLogout = () => {
    localStorage.removeItem('billingUser');
    setBillingUser(null);
    setSelectedCompany(null);
  };

  // Changer d'entreprise (retour à la sélection)
  const handleChangeCompany = () => {
    localStorage.removeItem('billingUser');
    setBillingUser(null);
    setSelectedCompany(null);
  };

  const fetchStats = async () => {
    try {
      const company = billingUser?.company || 'icones';
      const res = await fetch(`/api/invoices?stats=true&company=${company}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const fetchAllInvoices = async () => {
    try {
      const company = billingUser?.company || 'icones';
      const res = await fetch(`/api/invoices?company=${company}`);
      const data = await res.json();
      if (data.success) {
        setAllInvoices(data.invoices);
      }
    } catch (error) {
      console.error('Erreur chargement factures:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return '0,00 $';
    }
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' $';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Filtrer les factures soldées
  const soldedInvoices = allInvoices.filter(inv => inv.status === 'paid');
  
  // Filtrer les factures en cours
  const enCoursInvoices = allInvoices.filter(inv => inv.status === 'partial');

  // Créer le récapitulatif mensuel
  const getMonthlyRecap = (): MonthlyRecap[] => {
    const recap: Record<string, MonthlyRecap> = {};
    
    allInvoices.forEach(inv => {
      const date = new Date(inv.issueDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      
      if (!recap[monthKey]) {
        recap[monthKey] = {
          month: monthKey,
          monthLabel,
          invoices: [],
          totalFacture: 0,
          totalEncaisse: 0
        };
      }
      
      recap[monthKey].invoices.push(inv);
      recap[monthKey].totalFacture += inv.total;
      
      // Encaissé = factures payées + avances des factures en cours
      if (inv.status === 'paid') {
        recap[monthKey].totalEncaisse += inv.total;
      } else if (inv.status === 'partial' && inv.paidAmount) {
        recap[monthKey].totalEncaisse += inv.paidAmount;
      }
    });
    
    return Object.values(recap).sort((a, b) => b.month.localeCompare(a.month));
  };

  const monthlyRecap = getMonthlyRecap();
  const totalEncaisse = monthlyRecap.reduce((sum, m) => sum + m.totalEncaisse, 0);

  // ÉTAPE 1: Si pas d'entreprise sélectionnée, afficher le choix des entreprises
  if (!selectedCompany) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-gray-600">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Module Facturation</h1>
            <p className="text-gray-400 text-lg">Sélectionnez l'entreprise pour accéder à sa facturation</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ICONES Stratégie & Créa */}
            <button
              onClick={() => setSelectedCompany('icones')}
              className="group relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform">
                  <span className="text-white text-3xl font-bold">IC</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">ICONES</h2>
                <p className="text-blue-400 font-medium mb-4">Stratégie & Créa</p>
                <p className="text-gray-400 text-sm">Communication, Branding, Événementiel</p>
                <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 group-hover:text-blue-400 transition-colors">
                  <span className="text-sm">Accéder</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            {/* ALL IN ONE */}
            <button
              onClick={() => setSelectedCompany('allinone')}
              className="group relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 hover:border-red-500 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/20 hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-orange-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform">
                  <span className="text-white text-2xl font-bold">AIO</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">ALL IN ONE</h2>
                <p className="text-red-400 font-medium mb-4">Administration & Finances</p>
                <p className="text-gray-400 text-sm">Création entreprises, Recrutement, RH</p>
                <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 group-hover:text-red-400 transition-colors">
                  <span className="text-sm">Accéder</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ÉTAPE 2: Si entreprise sélectionnée mais pas connecté, afficher le formulaire nom/prénom
  if (!billingUser) {
    const company = COMPANIES[selectedCompany];
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${selectedCompany === 'icones' ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900' : 'bg-gradient-to-br from-slate-900 via-red-900 to-slate-900'}`}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className={`w-20 h-20 ${company.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
              <span className="text-white text-2xl font-bold">{selectedCompany === 'icones' ? 'IC' : 'AIO'}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            <p className="text-gray-500 mt-2">Identifiez-vous pour accéder aux factures</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                value={loginFirstName}
                onChange={(e) => setLoginFirstName(e.target.value)}
                placeholder="Votre prénom"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400"
                onKeyPress={(e) => e.key === 'Enter' && handleBillingLogin()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={loginLastName}
                onChange={(e) => setLoginLastName(e.target.value)}
                placeholder="Votre nom"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400"
                onKeyPress={(e) => e.key === 'Enter' && handleBillingLogin()}
              />
            </div>
            
            {loginFirstName && loginLastName && (
              <div className={`rounded-xl p-4 border ${selectedCompany === 'icones' ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                <p className={`text-sm ${selectedCompany === 'icones' ? 'text-blue-600' : 'text-red-600'}`}>
                  Vos initiales : <span className="font-bold">{generateInitials(loginFirstName, loginLastName)}</span>
                </p>
                <p className={`text-xs mt-1 ${selectedCompany === 'icones' ? 'text-blue-500' : 'text-red-500'}`}>
                  Les factures que vous créerez seront identifiées par ces initiales
                </p>
              </div>
            )}
            
            <button
              onClick={handleBillingLogin}
              disabled={!loginFirstName.trim() || !loginLastName.trim()}
              className={`w-full py-3 bg-gradient-to-r ${company.color} text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg`}
            >
              Accéder à la facturation
            </button>
            
            <button
              onClick={() => setSelectedCompany(null)}
              className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
            >
              ← Changer d'entreprise
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Obtenir les infos de l'entreprise actuelle (avec fallback)
  const companyKey = billingUser.company || 'icones';
  const currentCompany = COMPANIES[companyKey] || COMPANIES.icones;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - RESPONSIVE */}
      <div className={`bg-white border-b border-gray-200`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
          {/* Mobile: Stack vertical | Desktop: Horizontal */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* Logo et titre */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Logo entreprise */}
              <div className={`w-10 h-10 sm:w-12 sm:h-12 ${currentCompany.bgColor} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                <span className="text-white text-sm sm:text-lg font-bold">{billingUser.company === 'icones' ? 'IC' : 'AIO'}</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                  {currentCompany.shortName}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  Facturation
                </p>
              </div>
            </div>
            
            {/* User info + Actions - Scrollable sur mobile */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0">
              {/* Affichage de l'utilisateur connecté - Compact sur mobile */}
              <div className={`flex items-center gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border flex-shrink-0 ${billingUser.company === 'icones' ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200' : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'}`}>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 ${currentCompany.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-xs font-bold">{billingUser.initials.replace('-', '')}</span>
                </div>
                <div className="text-xs sm:text-sm hidden xs:block">
                  <p className="font-medium text-gray-900 truncate max-w-[100px] sm:max-w-none">{billingUser.firstName}</p>
                </div>
                <button
                  onClick={handleChangeCompany}
                  className="p-1 sm:p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                  title="Changer d'entreprise"
                >
                  <Users className="w-4 h-4" />
                </button>
                <button
                  onClick={handleBillingLogout}
                  className="p-1 sm:p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Se déconnecter"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
              
              {/* Boutons actions - Icons only sur mobile */}
              <Link
                href={`/invoices/${billingUser.company}/treasury`}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors flex-shrink-0"
              >
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">Trésorerie</span>
              </Link>
              <button
                onClick={() => setShowCreateClient(true)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau client</span>
                <span className="sm:hidden">Client</span>
              </button>
              <button
                onClick={() => setShowCreateInvoice(true)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nouvelle facture</span>
                <span className="sm:hidden">Facture</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Cliquables - RESPONSIVE */}
      {stats && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl p-3 sm:p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Total factures</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Montant total - Cliquable */}
            <div 
              onClick={() => setStatsModal('recapitulatif')}
              className="bg-white rounded-xl p-3 sm:p-5 border border-gray-200 shadow-sm cursor-pointer hover:border-green-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 group-hover:text-green-600">Montant total</p>
                  <p className="text-base sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(stats.totalAmount)}</p>
                  <p className="text-xs text-green-600 mt-1 hidden sm:block">Cliquez pour voir le détail →</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors flex-shrink-0">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Soldées - Cliquable */}
            <div 
              onClick={() => setStatsModal('soldees')}
              className="bg-white rounded-xl p-3 sm:p-5 border border-gray-200 shadow-sm cursor-pointer hover:border-green-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 group-hover:text-green-600">Soldées</p>
                  <p className="text-base sm:text-2xl font-bold text-green-600 truncate">{formatCurrency(stats.paidAmount)}</p>
                  <p className="text-xs text-gray-400">{stats.paid} facture(s)</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors flex-shrink-0">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* En cours - Cliquable */}
            <div 
              onClick={() => setStatsModal('encours')}
              className="bg-white rounded-xl p-3 sm:p-5 border border-gray-200 shadow-sm cursor-pointer hover:border-orange-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 group-hover:text-orange-600">En cours</p>
                  <p className="text-base sm:text-2xl font-bold text-orange-600 truncate">{formatCurrency(stats.pendingAmount)}</p>
                  <p className="text-xs text-gray-400">{stats.sent + stats.overdue + stats.partial} facture(s)</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors flex-shrink-0">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Content - RESPONSIVE */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-6 sm:pb-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[400px] sm:min-h-[600px] flex flex-col">
          {/* Tab Navigation - RESPONSIVE */}
          <div className="border-b border-gray-200">
            <div className="flex items-center justify-between px-2 sm:px-4">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('invoices')}
                  className={`py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'invoices'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileText className="w-4 h-4 inline-block mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Factures</span>
                  <span className="xs:hidden">Fact.</span>
                </button>
                <button
                  onClick={() => setActiveTab('clients')}
                  className={`py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'clients'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-4 h-4 inline-block mr-2" />
                  Clients
                </button>
              </nav>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'invoices' ? 'Rechercher une facture...' : 'Rechercher un client...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64 bg-white text-gray-900"
                />
              </div>
            </div>
            
            {/* Filtres par type de facture - ALL IN ONE uniquement */}
            {activeTab === 'invoices' && billingUser?.company === 'allinone' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 overflow-x-auto">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Filtrer:</span>
                <button
                  onClick={() => setTemplateFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                    templateFilter === 'all'
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:border-red-300 hover:text-red-600'
                  }`}
                >
                  Toutes
                </button>
                {Object.entries(ALLINONE_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => setTemplateFilter(key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                      templateFilter === key
                        ? 'bg-red-500 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:border-red-300 hover:text-red-600'
                    }`}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            )}
            
            {/* Filtres par type de facture - ICONES uniquement */}
            {activeTab === 'invoices' && billingUser?.company === 'icones' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 overflow-x-auto">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Filtrer:</span>
                <button
                  onClick={() => setTemplateFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                    templateFilter === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  Toutes
                </button>
                {Object.entries(INVOICE_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => setTemplateFilter(key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                      templateFilter === key
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {template.category === 'proforma' ? 'Proforma ' : 'Facture '}{template.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 flex-1 overflow-auto">
            {activeTab === 'invoices' ? (
              <InvoicesList 
                searchQuery={searchQuery} 
                refreshKey={refreshKey}
                onRefresh={handleRefresh}
                company={billingUser.company}
                templateFilter={templateFilter}
              />
            ) : (
              <ClientsList 
                searchQuery={searchQuery} 
                refreshKey={refreshKey}
                onRefresh={handleRefresh}
                onCreateInvoice={(_clientId: string) => {
                  setShowCreateInvoice(true);
                }}
                company={billingUser.company}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateInvoiceModal
        isOpen={showCreateInvoice}
        onClose={() => setShowCreateInvoice(false)}
        onSuccess={() => {
          setShowCreateInvoice(false);
          handleRefresh();
        }}
        userInitials={billingUser?.initials || ''}
        company={billingUser?.company || 'icones'}
      />

      <CreateClientModal
        isOpen={showCreateClient}
        onClose={() => setShowCreateClient(false)}
        onSuccess={() => {
          setShowCreateClient(false);
          handleRefresh();
        }}
        company={billingUser?.company || 'icones'}
      />

      {/* Modal Factures Soldées */}
      {statsModal === 'soldees' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setStatsModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Factures Soldées</h3>
                  <p className="text-green-100">{soldedInvoices.length} facture(s) - {formatCurrency(stats?.paidAmount || 0)}</p>
                </div>
                <button onClick={() => setStatsModal(null)} className="text-white/80 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {soldedInvoices.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune facture soldée</p>
              ) : (
                <div className="space-y-3">
                  {soldedInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                      <div>
                        <p className="font-semibold text-gray-900">{inv.invoiceNumber}</p>
                        <p className="text-sm text-gray-600">{inv.client?.companyName || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{formatDate(inv.issueDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{formatCurrency(inv.total)}</p>
                        <span className="inline-block px-2 py-1 bg-green-500 text-white text-xs rounded-full">Soldée</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Factures En Cours */}
      {statsModal === 'encours' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setStatsModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Factures En Cours</h3>
                  <p className="text-orange-100">{enCoursInvoices.length} facture(s)</p>
                </div>
                <button onClick={() => setStatsModal(null)} className="text-white/80 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {enCoursInvoices.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune facture en cours</p>
              ) : (
                <div className="space-y-3">
                  {enCoursInvoices.map(inv => (
                    <div key={inv.id} className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{inv.invoiceNumber}</p>
                          <p className="text-sm text-gray-600">{inv.client?.companyName || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{formatDate(inv.issueDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{formatCurrency(inv.total)}</p>
                          <span className="inline-block px-2 py-1 bg-orange-500 text-white text-xs rounded-full">En cours</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-orange-200 grid grid-cols-2 gap-4">
                        <div className="bg-green-100 rounded-lg p-2 text-center">
                          <p className="text-xs text-green-700">Avance reçue</p>
                          <p className="font-bold text-green-700">{formatCurrency(inv.paidAmount || 0)}</p>
                        </div>
                        <div className="bg-red-100 rounded-lg p-2 text-center">
                          <p className="text-xs text-red-700">Reste à payer</p>
                          <p className="font-bold text-red-700">{formatCurrency(inv.total - (inv.paidAmount || 0))}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Récapitulatif Mensuel */}
      {statsModal === 'recapitulatif' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setStatsModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">📊 Récapitulatif des Encaissements</h3>
                  <p className="text-blue-100">Vue détaillée par mois</p>
                </div>
                <button onClick={() => setStatsModal(null)} className="text-white/80 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* Résumé global */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total Facturé</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalAmount || 0)}</p>
                </div>
                <div className="text-center border-x border-gray-300">
                  <p className="text-sm text-gray-500">Total Encaissé</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalEncaisse)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Reste à Encaisser</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency((stats?.totalAmount || 0) - totalEncaisse)}</p>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[55vh]">
              {monthlyRecap.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
              ) : (
                <div className="space-y-6">
                  {monthlyRecap.map(month => (
                    <div key={month.month} className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Header du mois */}
                      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-white" />
                          <span className="font-semibold text-white capitalize">{month.monthLabel}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-gray-300">Facturé</p>
                            <p className="font-bold text-white">{formatCurrency(month.totalFacture)}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <div className="text-right bg-green-500/20 px-3 py-1 rounded-lg">
                            <p className="text-xs text-green-300">Encaissé</p>
                            <p className="font-bold text-green-400">{formatCurrency(month.totalEncaisse)}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Liste des factures du mois */}
                      <div className="divide-y divide-gray-100">
                        {month.invoices.map(inv => (
                          <div key={inv.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${inv.status === 'paid' ? 'bg-green-500' : inv.status === 'partial' ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                              <div>
                                <p className="font-medium text-gray-900">{inv.invoiceNumber}</p>
                                <p className="text-sm text-gray-500">{inv.client?.companyName || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm text-gray-500">Montant</p>
                                <p className="font-semibold text-gray-900">{formatCurrency(inv.total)}</p>
                              </div>
                              <div className="text-right min-w-[100px]">
                                <p className="text-sm text-gray-500">Encaissé</p>
                                <p className={`font-semibold ${inv.status === 'paid' ? 'text-green-600' : inv.paidAmount ? 'text-orange-600' : 'text-gray-400'}`}>
                                  {inv.status === 'paid' ? formatCurrency(inv.total) : formatCurrency(inv.paidAmount || 0)}
                                </p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                inv.status === 'paid' 
                                  ? 'bg-green-100 text-green-700' 
                                  : inv.status === 'partial' 
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-gray-100 text-gray-600'
                              }`}>
                                {inv.status === 'paid' ? 'Soldée' : inv.status === 'partial' ? 'En cours' : '—'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
