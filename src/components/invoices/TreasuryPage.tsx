"use client";

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  PieChart,
  List,
  Wallet,
  Receipt,
  Building2,
  Tag,
  MoreVertical,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import Link from 'next/link';

interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

interface Transaction {
  id: string;
  type: 'invoice' | 'expense';
  description: string;
  amount: number;
  date: string;
  category?: string;
  categoryColor?: string;
  vendor?: string;
  paymentMethod?: string;
  invoiceNumber?: string;
}

interface Summary {
  year: number;
  month: number;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  expensesByCategory: { name: string; color: string; total: number; count: number }[];
}

interface Props {
  company: 'icones' | 'allinone';
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// Catégories par défaut pour ICONES
const DEFAULT_CATEGORIES_ICONES = [
  { name: 'Loyer & Charges', color: '#ef4444', icon: 'home' },
  { name: 'Salaires', color: '#f97316', icon: 'users' },
  { name: 'Fournitures', color: '#eab308', icon: 'box' },
  { name: 'Transport', color: '#22c55e', icon: 'car' },
  { name: 'Communication', color: '#3b82f6', icon: 'phone' },
  { name: 'Marketing', color: '#8b5cf6', icon: 'megaphone' },
  { name: 'Équipement', color: '#ec4899', icon: 'monitor' },
  { name: 'Services', color: '#06b6d4', icon: 'briefcase' },
  { name: 'Impôts & Taxes', color: '#64748b', icon: 'landmark' },
  { name: 'Autres', color: '#6b7280', icon: 'more' }
];

// Catégories par défaut pour ALL IN ONE
const DEFAULT_CATEGORIES_ALLINONE = [
  { name: 'Paie Personnel', color: '#ef4444', icon: 'users' },
  { name: 'Consultant', color: '#f97316', icon: 'briefcase' },
  { name: 'Soins Médicaux', color: '#22c55e', icon: 'heart' },
  { name: 'Rétrocession Partenaire', color: '#3b82f6', icon: 'handshake' },
  { name: 'Commission Apporteur d\'Affaire', color: '#8b5cf6', icon: 'percent' },
  { name: 'Loyer & Charges', color: '#ec4899', icon: 'home' },
  { name: 'Transport', color: '#06b6d4', icon: 'car' },
  { name: 'Fournitures', color: '#eab308', icon: 'box' },
  { name: 'Impôts & Taxes', color: '#64748b', icon: 'landmark' },
  { name: 'Autres', color: '#6b7280', icon: 'more' }
];

export default function TreasuryPage({ company }: Props) {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [income, setIncome] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expenses'>('all');
  
  // Modal pour ajouter une dépense
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Transaction | null>(null);
  const [preselectedCategoryId, setPreselectedCategoryId] = useState<string>('');

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, [company, year, month]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/treasury?company=${company}&year=${year}&month=${month}`);
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setIncome(data.income);
        setExpenses(data.expenses);
      }
    } catch (error) {
      console.error('Erreur chargement trésorerie:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/treasury?company=${company}&type=categories`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
        // Créer les catégories par défaut si aucune n'existe
        if (data.categories.length === 0) {
          await createDefaultCategories();
        }
      }
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    }
  };

  const createDefaultCategories = async () => {
    // Utiliser les catégories appropriées selon l'entreprise
    const defaultCats = company === 'allinone' ? DEFAULT_CATEGORIES_ALLINONE : DEFAULT_CATEGORIES_ICONES;
    
    for (const cat of defaultCats) {
      await fetch('/api/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'category',
          company,
          name: cat.name,
          color: cat.color,
          icon: cat.icon
        })
      });
    }
    fetchCategories();
  };

  const goToPreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' $';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short'
    });
  };

  // Toutes les transactions combinées et triées
  const allTransactions = [...income, ...expenses].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const filteredTransactions = filterType === 'all' 
    ? allTransactions 
    : filterType === 'income' 
      ? income 
      : expenses;

  const companyName = company === 'icones' ? 'ICONES' : 'ALL IN ONE';
  const accentColor = company === 'icones' ? 'purple' : 'orange';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header - RESPONSIVE */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link href="/invoices" className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold flex items-center gap-2">
                  <Wallet className={`w-5 h-5 sm:w-6 sm:h-6 text-${accentColor}-500 flex-shrink-0`} />
                  <span className="truncate">Trésorerie - {companyName}</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-400">Suivi des entrées et dépenses</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowManageCategories(true)}
                className="px-2 sm:px-3 py-2 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-1 sm:gap-2"
              >
                <Tag className="w-4 h-4" />
                <span className="hidden xs:inline">Catégories</span>
              </button>
              <button
                onClick={() => setShowAddExpense(true)}
                className={`px-3 sm:px-4 py-2 bg-${accentColor}-600 hover:bg-${accentColor}-700 rounded-lg flex items-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm`}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline">Nouvelle</span> dépense
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Sélecteur de mois */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-base sm:text-lg font-semibold min-w-[150px] sm:min-w-[180px] text-center">
              {MONTHS[month - 1]} {year}
            </div>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded text-sm ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1.5 rounded text-sm ${viewMode === 'chart' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                <PieChart className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Cartes de résumé - RESPONSIVE */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Entrées */}
          <div className="bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-gray-400 text-xs sm:text-sm">Entrées (Factures payées)</span>
              <div className="p-1.5 sm:p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-green-500">
              +{formatCurrency(summary?.totalIncome || 0)}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1">
              {income.length} facture(s) encaissée(s)
            </div>
          </div>

          {/* Dépenses */}
          <div className="bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-gray-400 text-xs sm:text-sm">Dépenses</span>
              <div className="p-1.5 sm:p-2 bg-red-500/20 rounded-lg">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-red-500">
              -{formatCurrency(summary?.totalExpenses || 0)}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1">
              {expenses.length} dépense(s) ce mois
            </div>
          </div>

          {/* Solde */}
          <div className={`bg-gray-800 rounded-xl p-4 sm:p-5 border ${(summary?.balance || 0) >= 0 ? 'border-green-500/50' : 'border-red-500/50'}`}>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-gray-400 text-xs sm:text-sm">Solde du mois</span>
              <div className={`p-1.5 sm:p-2 rounded-lg ${(summary?.balance || 0) >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                <DollarSign className={`w-4 h-4 sm:w-5 sm:h-5 ${(summary?.balance || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              </div>
            </div>
            <div className={`text-xl sm:text-2xl font-bold ${(summary?.balance || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {(summary?.balance || 0) >= 0 ? '+' : ''}{formatCurrency(summary?.balance || 0)}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1">
              Entrées - Dépenses
            </div>
          </div>
        </div>

        {/* Contenu principal - RESPONSIVE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Liste des transactions */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700">
            <div className="p-3 sm:p-4 border-b border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-semibold text-sm sm:text-base">Transactions</h3>
              <div className="flex gap-2 overflow-x-auto">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full whitespace-nowrap ${filterType === 'all' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                  Tout
                </button>
                <button
                  onClick={() => setFilterType('income')}
                  className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs rounded-full whitespace-nowrap ${filterType === 'income' ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                  Entrées
                </button>
                <button
                  onClick={() => setFilterType('expenses')}
                  className={`px-3 py-1 text-xs rounded-full ${filterType === 'expenses' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                  Dépenses
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-700 max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Chargement...</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Aucune transaction ce mois
                </div>
              ) : (
                filteredTransactions.map(transaction => (
                  <div key={transaction.id} className="p-4 hover:bg-gray-700/50 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${transaction.type === 'invoice' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {transaction.type === 'invoice' ? (
                          <Receipt className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{transaction.description}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatDate(transaction.date)}</span>
                          {transaction.category && (
                            <>
                              <span>•</span>
                              <span 
                                className="px-1.5 py-0.5 rounded text-xs"
                                style={{ backgroundColor: transaction.categoryColor + '20', color: transaction.categoryColor }}
                              >
                                {transaction.category}
                              </span>
                            </>
                          )}
                          {transaction.vendor && (
                            <>
                              <span>•</span>
                              <span>{transaction.vendor}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`font-semibold ${transaction.type === 'invoice' ? 'text-green-500' : 'text-red-500'}`}>
                        {transaction.type === 'invoice' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </div>
                      {transaction.type === 'expense' && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <button 
                            onClick={() => setEditingExpense(transaction)}
                            className="p-1 hover:bg-gray-600 rounded"
                          >
                            <Edit className="w-4 h-4 text-gray-400" />
                          </button>
                          <button 
                            onClick={() => handleDeleteExpense(transaction.id)}
                            className="p-1 hover:bg-gray-600 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Répartition par catégorie */}
          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold text-white">Dépenses par catégorie</h3>
            </div>
            <div className="p-4 space-y-3">
              {summary?.expensesByCategory && summary.expensesByCategory.length > 0 ? (
                summary.expensesByCategory.map((cat, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 text-gray-300">
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                      <span className="font-medium text-white">{formatCurrency(cat.total)}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          backgroundColor: cat.color,
                          width: `${(cat.total / (summary.totalExpenses || 1)) * 100}%`
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {cat.count} dépense(s) • {((cat.total / (summary.totalExpenses || 1)) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Aucune dépense ce mois
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Ajouter/Modifier une dépense */}
      {(showAddExpense || editingExpense) && (
        <ExpenseModal
          company={company}
          categories={categories}
          expense={editingExpense}
          preselectedCategoryId={preselectedCategoryId}
          onClose={() => {
            setShowAddExpense(false);
            setEditingExpense(null);
            setPreselectedCategoryId('');
          }}
          onSuccess={() => {
            setShowAddExpense(false);
            setEditingExpense(null);
            setPreselectedCategoryId('');
            fetchData();
          }}
        />
      )}

      {/* Modal Gérer les catégories */}
      {showManageCategories && (
        <CategoriesModal
          company={company}
          categories={categories}
          onClose={() => setShowManageCategories(false)}
          onSuccess={fetchCategories}
          onSelectCategory={(categoryId: string) => {
            setShowManageCategories(false);
            setPreselectedCategoryId(categoryId);
            setShowAddExpense(true);
          }}
        />
      )}
    </div>
  );

  async function handleDeleteExpense(id: string) {
    if (!confirm('Supprimer cette dépense ?')) return;
    
    try {
      const res = await fetch(`/api/treasury?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  }
}

// Composant Modal pour ajouter/modifier une dépense
function ExpenseModal({ 
  company, 
  categories, 
  expense, 
  preselectedCategoryId,
  onClose, 
  onSuccess 
}: { 
  company: string;
  categories: ExpenseCategory[];
  expense: Transaction | null;
  preselectedCategoryId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: expense?.description || '',
    amount: expense?.amount?.toString() || '',
    expenseDate: expense?.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    categoryId: preselectedCategoryId || '',
    vendor: expense?.vendor || '',
    paymentMethod: expense?.paymentMethod || '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    setLoading(true);
    try {
      const res = await fetch('/api/treasury', {
        method: expense ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(expense && { id: expense.id, type: 'expense' }),
          company,
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const accentColor = company === 'icones' ? 'purple' : 'orange';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="font-semibold text-white">{expense ? 'Modifier la dépense' : 'Nouvelle dépense'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description *</label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
              placeholder="Ex: Achat fournitures bureau"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Montant ($) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date *</label>
              <input
                type="date"
                value={formData.expenseDate}
                onChange={e => setFormData({ ...formData, expenseDate: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Catégorie</label>
            <select
              value={formData.categoryId}
              onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Fournisseur/Bénéficiaire</label>
            <input
              type="text"
              value={formData.vendor}
              onChange={e => setFormData({ ...formData, vendor: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
              placeholder="Ex: Fournisseur XYZ"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Mode de paiement</label>
            <select
              value={formData.paymentMethod}
              onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
            >
              <option value="">Sélectionner</option>
              <option value="Espèces">Espèces</option>
              <option value="Virement">Virement bancaire</option>
              <option value="Chèque">Chèque</option>
              <option value="Carte">Carte bancaire</option>
              <option value="Mobile Money">Mobile Money</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 bg-${accentColor}-600 hover:bg-${accentColor}-700 rounded-lg font-medium disabled:opacity-50`}
            >
              {loading ? 'Enregistrement...' : (expense ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Composant Modal pour gérer les catégories
function CategoriesModal({ 
  company, 
  categories, 
  onClose, 
  onSuccess,
  onSelectCategory
}: { 
  company: string;
  categories: ExpenseCategory[];
  onClose: () => void;
  onSuccess: () => void;
  onSelectCategory?: (categoryId: string) => void;
}) {
  const [newCategory, setNewCategory] = useState({ name: '', color: '#6366f1' });
  const [loading, setLoading] = useState(false);

  // Catégories par défaut selon l'entreprise
  const getDefaultCategories = () => {
    if (company === 'allinone') {
      return [
        { name: 'Paie Personnel', color: '#ef4444', icon: 'users' },
        { name: 'Consultant', color: '#f97316', icon: 'briefcase' },
        { name: 'Soins Médicaux', color: '#22c55e', icon: 'heart' },
        { name: 'Rétrocession Partenaire', color: '#3b82f6', icon: 'handshake' },
        { name: "Commission Apporteur d'Affaire", color: '#8b5cf6', icon: 'percent' },
        { name: 'Loyer & Charges', color: '#ec4899', icon: 'home' },
        { name: 'Transport', color: '#06b6d4', icon: 'car' },
        { name: 'Fournitures', color: '#eab308', icon: 'box' },
        { name: 'Impôts & Taxes', color: '#64748b', icon: 'landmark' },
        { name: 'Autres', color: '#6b7280', icon: 'more' }
      ];
    }
    return [
      { name: 'Loyer & Charges', color: '#ef4444', icon: 'home' },
      { name: 'Salaires', color: '#f97316', icon: 'users' },
      { name: 'Fournitures', color: '#eab308', icon: 'box' },
      { name: 'Transport', color: '#22c55e', icon: 'car' },
      { name: 'Communication', color: '#3b82f6', icon: 'phone' },
      { name: 'Marketing', color: '#8b5cf6', icon: 'megaphone' },
      { name: 'Équipement', color: '#ec4899', icon: 'monitor' },
      { name: 'Services', color: '#06b6d4', icon: 'briefcase' },
      { name: 'Impôts & Taxes', color: '#64748b', icon: 'landmark' },
      { name: 'Autres', color: '#6b7280', icon: 'more' }
    ];
  };

  const handleResetCategories = async () => {
    if (!confirm('Voulez-vous remplacer toutes les catégories par les catégories par défaut ?')) return;
    setLoading(true);
    try {
      // Supprimer toutes les catégories existantes en parallèle
      await Promise.all(
        categories.map(cat => 
          fetch(`/api/treasury?id=${cat.id}&type=category`, { method: 'DELETE' })
        )
      );
      
      // Créer les catégories par défaut en parallèle
      await Promise.all(
        getDefaultCategories().map(cat =>
          fetch('/api/treasury', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'category',
              company,
              name: cat.name,
              color: cat.color,
              icon: cat.icon
            })
          })
        )
      );
      
      onSuccess();
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name) return;
    setLoading(true);
    try {
      await fetch('/api/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'category',
          company,
          ...newCategory
        })
      });
      setNewCategory({ name: '', color: '#6366f1' });
      onSuccess();
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Supprimer cette catégorie ?')) return;
    try {
      await fetch(`/api/treasury?id=${id}&type=category`, { method: 'DELETE' });
      onSuccess();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Ajouter une catégorie prédéfinie en un clic et ouvrir le formulaire de dépense
  const handleAddPredefined = async (cat: { name: string; color: string; icon: string }) => {
    // Vérifier si elle existe déjà
    const existingCat = categories.find(c => c.name.toLowerCase() === cat.name.toLowerCase());
    if (existingCat) {
      // Si elle existe, ouvrir directement le formulaire avec cette catégorie
      if (onSelectCategory) {
        onSelectCategory(existingCat.id);
      }
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'category',
          company,
          name: cat.name,
          color: cat.color,
          icon: cat.icon
        })
      });
      const data = await res.json();
      
      // Si la création a réussi et qu'on a un callback, ouvrir le formulaire
      if (data.success && data.category && onSelectCategory) {
        onSelectCategory(data.category.id);
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-700 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="font-semibold text-white">Catégories de dépenses</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {/* Ajouter une catégorie personnalisée */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCategory.name}
              onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
              placeholder="Nouvelle catégorie..."
            />
            <input
              type="color"
              value={newCategory.color}
              onChange={e => setNewCategory({ ...newCategory, color: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <button
              onClick={handleAddCategory}
              disabled={loading || !newCategory.name}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Catégories existantes */}
          {categories.length > 0 && (
            <>
              <p className="text-xs text-gray-400 mb-2">Vos catégories :</p>
              <div className="space-y-2 mb-4">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-2 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm">{cat.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1 hover:bg-gray-600 rounded text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Suggestions prédéfinies */}
          <p className="text-xs text-gray-400 mb-2">📋 Ajouter une catégorie prédéfinie :</p>
          <div className="flex flex-wrap gap-2">
            {getDefaultCategories()
              .filter(cat => !categories.some(c => c.name.toLowerCase() === cat.name.toLowerCase()))
              .map(cat => (
                <button
                  key={cat.name}
                  onClick={() => handleAddPredefined(cat)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-600 hover:border-gray-400 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  style={{ backgroundColor: cat.color + '20', color: cat.color, borderColor: cat.color + '50' }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
