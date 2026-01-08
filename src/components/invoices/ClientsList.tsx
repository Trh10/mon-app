"use client";

import { useState, useEffect } from 'react';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Users,
  FileText,
  Mail,
  Phone,
  MapPin,
  X,
  Eye,
  CheckCircle,
  Clock,
  DollarSign,
  ChevronRight,
  ArrowLeft,
  Calendar
} from 'lucide-react';
import { Client, Company } from '@/lib/invoices/invoice-types';

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  total: number;
  paidAmount?: number;
  status: string;
}

interface MonthData {
  monthKey: string;
  monthLabel: string;
  invoices: Invoice[];
  totalFacture: number;
  totalEncaisse: number;
  paidCount: number;
  partialCount: number;
}

interface Props {
  searchQuery: string;
  refreshKey: number;
  onRefresh: () => void;
  onCreateInvoice: (clientId: string) => void;
  company: Company;
}

export default function ClientsList({ searchQuery, refreshKey, onRefresh, onCreateInvoice, company }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // Modal factures du client
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  
  // Mois sélectionné (null = vue par mois, string = voir les factures du mois)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, [refreshKey, company]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices/clients?company=${company}`);
      const data = await res.json();
      if (data.success) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Erreur chargement clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les factures d'un client
  const fetchClientInvoices = async (clientId: string) => {
    try {
      setLoadingInvoices(true);
      const res = await fetch(`/api/invoices?company=${company}`);
      const data = await res.json();
      if (data.success) {
        // Filtrer les factures du client
        const invoices = data.invoices.filter((inv: any) => inv.clientId === clientId);
        setClientInvoices(invoices);
      }
    } catch (error) {
      console.error('Erreur chargement factures client:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Ouvrir le modal des factures du client
  const openClientInvoices = (client: Client) => {
    setViewingClient(client);
    setSelectedMonth(null);
    fetchClientInvoices(client.id);
  };

  // Fermer le modal
  const closeModal = () => {
    setViewingClient(null);
    setSelectedMonth(null);
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Supprimer ce client ? Les factures associées ne seront pas supprimées.')) return;
    
    try {
      const res = await fetch(`/api/invoices/clients?id=${clientId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    window.open(`/api/invoices/generate?id=${invoiceId}`, '_blank');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculer les stats du client
  const getClientStats = () => {
    const total = clientInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const paid = clientInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
    const partial = clientInvoices.filter(inv => inv.status === 'partial').reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const encaisse = paid + partial;
    const reste = total - encaisse;
    return { total, encaisse, reste, count: clientInvoices.length };
  };

  // Grouper les factures par mois
  const getMonthlyData = (): MonthData[] => {
    const months: Record<string, MonthData> = {};
    
    clientInvoices.forEach(inv => {
      const date = new Date(inv.issueDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      
      if (!months[monthKey]) {
        months[monthKey] = {
          monthKey,
          monthLabel,
          invoices: [],
          totalFacture: 0,
          totalEncaisse: 0,
          paidCount: 0,
          partialCount: 0
        };
      }
      
      months[monthKey].invoices.push(inv);
      months[monthKey].totalFacture += inv.total;
      
      if (inv.status === 'paid') {
        months[monthKey].totalEncaisse += inv.total;
        months[monthKey].paidCount++;
      } else if (inv.status === 'partial') {
        months[monthKey].totalEncaisse += inv.paidAmount || 0;
        months[monthKey].partialCount++;
      }
    });
    
    return Object.values(months).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  };

  // Obtenir les factures du mois sélectionné
  const getSelectedMonthInvoices = (): Invoice[] => {
    if (!selectedMonth) return [];
    return clientInvoices.filter(inv => {
      const date = new Date(inv.issueDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === selectedMonth;
    });
  };

  const monthlyData = getMonthlyData();
  const selectedMonthData = monthlyData.find(m => m.monthKey === selectedMonth);

  // Filtrer les clients
  const filteredClients = clients.filter(client => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      client.companyName.toLowerCase().includes(query) ||
      client.contactName?.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.city?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (filteredClients.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Aucun client trouvé</p>
        <p className="text-sm text-gray-400 mt-1">Ajoutez votre premier client pour commencer</p>
      </div>
    );
  }

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredClients.map((client) => (
        <div 
          key={client.id} 
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
          onClick={() => openClientInvoices(client)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">
                  {client.companyName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{client.companyName}</h3>
                {client.contactName && (
                  <p className="text-sm text-gray-500">{client.contactName}</p>
                )}
              </div>
            </div>
            
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedClient(selectedClient === client.id ? null : client.id); }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>
              
              {selectedClient === client.id && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10" onClick={(e) => e.stopPropagation()}>
                  <div className="py-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateInvoice(client.id);
                        setSelectedClient(null);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <FileText className="w-4 h-4" />
                      Créer une facture
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingClient(client);
                        setSelectedClient(null);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Edit className="w-4 h-4" />
                      Modifier
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(client.id);
                        setSelectedClient(null);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <a href={`mailto:${client.email}`} className="hover:text-blue-600">
                {client.email}
              </a>
            </div>
            
            {client.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${client.phone}`} className="hover:text-blue-600">
                  {client.phone}
                </a>
              </div>
            )}
            
            {(client.city || client.country) && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>
                  {[client.city, client.country].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Client depuis {new Date(client.createdAt).toLocaleDateString('fr-CA')}
            </p>
            <span className="text-xs text-blue-600 font-medium">Voir factures →</span>
          </div>
        </div>
      ))}
    </div>

    {/* Modal Factures du Client - DESIGN PREMIUM */}
    {viewingClient && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm" onClick={closeModal} />
        <div className="relative bg-white rounded-3xl shadow-2xl w-[95vw] max-w-7xl h-[92vh] overflow-hidden flex flex-col border border-gray-200/50">
          
          {/* Header Premium */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGM5Ljk0MSAwIDE4LTguMDU5IDE4LTE4cy04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNHMxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
            
            <div className="relative px-10 py-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  {selectedMonth && (
                    <button 
                      onClick={() => setSelectedMonth(null)}
                      className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 group"
                    >
                      <ArrowLeft className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                  <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                    <span className="text-3xl font-black bg-gradient-to-br from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                      {viewingClient.companyName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{viewingClient.companyName}</h3>
                    <p className="text-blue-100 text-lg mt-1 flex items-center gap-2">
                      {selectedMonth ? (
                        <>
                          <Calendar className="w-5 h-5" />
                          <span className="capitalize">{selectedMonthData?.monthLabel}</span>
                        </>
                      ) : (
                        viewingClient.email
                      )}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={closeModal} 
                  className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-red-500/80 flex items-center justify-center transition-all duration-200 group"
                >
                  <X className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards Premium */}
          {!loadingInvoices && clientInvoices.length > 0 && !selectedMonth && (
            <div className="px-10 py-6 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
              <div className="grid grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                      <FileText className="w-7 h-7 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Factures</p>
                      <p className="text-3xl font-bold text-gray-900">{getClientStats().count}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                      <DollarSign className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total facturé</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(getClientStats().total)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                      <CheckCircle className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Encaissé</p>
                      <p className="text-2xl font-bold text-emerald-600">{formatCurrency(getClientStats().encaisse)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                      <Clock className="w-7 h-7 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Reste à payer</p>
                      <p className="text-2xl font-bold text-amber-600">{formatCurrency(getClientStats().reste)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contenu Principal */}
          <div className="flex-1 overflow-y-auto px-10 py-8 bg-gradient-to-b from-white to-gray-50">
            {loadingInvoices ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                <p className="mt-6 text-gray-500 font-medium">Chargement des factures...</p>
              </div>
            ) : clientInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                  <FileText className="w-16 h-16 text-gray-300" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Aucune facture</h4>
                <p className="text-gray-500 mb-8">Ce client n'a pas encore de factures</p>
                <button
                  onClick={() => {
                    closeModal();
                    onCreateInvoice(viewingClient.id);
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 flex items-center gap-3"
                >
                  <FileText className="w-5 h-5" />
                  Créer la première facture
                </button>
              </div>
            ) : !selectedMonth ? (
              /* VUE PAR MOIS - DESIGN PREMIUM */
              <div className="grid grid-cols-2 gap-6">
                {monthlyData.map(month => (
                  <div 
                    key={month.monthKey}
                    onClick={() => setSelectedMonth(month.monthKey)}
                    className="bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer group overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                            <Calendar className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-xl capitalize">{month.monthLabel}</h4>
                            <p className="text-gray-500 mt-1">
                              {month.invoices.length} facture{month.invoices.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      </div>
                      
                      {/* Mini stats */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">Facturé</p>
                          <p className="font-bold text-gray-900">{formatCurrency(month.totalFacture)}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-emerald-600 mb-1">Encaissé</p>
                          <p className="font-bold text-emerald-600">{formatCurrency(month.totalEncaisse)}</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-amber-600 mb-1">Reste</p>
                          <p className="font-bold text-amber-600">{formatCurrency(month.totalFacture - month.totalEncaisse)}</p>
                        </div>
                      </div>
                      
                      {/* Status pills */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {month.paidCount > 0 && (
                          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                            ✓ {month.paidCount} soldée{month.paidCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {month.partialCount > 0 && (
                          <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                            ◐ {month.partialCount} en cours
                          </span>
                        )}
                        {month.invoices.length - month.paidCount - month.partialCount > 0 && (
                          <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                            {month.invoices.length - month.paidCount - month.partialCount} brouillon{month.invoices.length - month.paidCount - month.partialCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* VUE FACTURES DU MOIS SÉLECTIONNÉ - DESIGN PREMIUM */
              <div className="space-y-6">
                {/* Stats du mois */}
                {selectedMonthData && (
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-8 shadow-xl">
                    <div className="grid grid-cols-4 gap-8">
                      <div className="text-center">
                        <p className="text-sm text-slate-400 mb-2">Factures</p>
                        <p className="text-4xl font-bold text-white">{selectedMonthData.invoices.length}</p>
                      </div>
                      <div className="text-center border-l border-slate-700">
                        <p className="text-sm text-slate-400 mb-2">Total facturé</p>
                        <p className="text-3xl font-bold text-white">{formatCurrency(selectedMonthData.totalFacture)}</p>
                      </div>
                      <div className="text-center border-l border-slate-700">
                        <p className="text-sm text-emerald-400 mb-2">Encaissé</p>
                        <p className="text-3xl font-bold text-emerald-400">{formatCurrency(selectedMonthData.totalEncaisse)}</p>
                      </div>
                      <div className="text-center border-l border-slate-700">
                        <p className="text-sm text-amber-400 mb-2">Reste</p>
                        <p className="text-3xl font-bold text-amber-400">{formatCurrency(selectedMonthData.totalFacture - selectedMonthData.totalEncaisse)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Liste des factures */}
                <div className="space-y-4">
                  {getSelectedMonthInvoices().map(invoice => (
                    <div 
                      key={invoice.id} 
                      className="bg-white rounded-2xl border border-gray-200 hover:border-indigo-200 hover:shadow-lg transition-all duration-200 overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                              invoice.status === 'paid' 
                                ? 'bg-emerald-100' 
                                : invoice.status === 'partial' 
                                  ? 'bg-amber-100' 
                                  : 'bg-gray-100'
                            }`}>
                              <FileText className={`w-7 h-7 ${
                                invoice.status === 'paid' 
                                  ? 'text-emerald-600' 
                                  : invoice.status === 'partial' 
                                    ? 'text-amber-600' 
                                    : 'text-gray-400'
                              }`} />
                            </div>
                            <div>
                              <p className="font-bold text-xl text-gray-900">{invoice.invoiceNumber}</p>
                              <p className="text-gray-500 mt-1">{formatDate(invoice.issueDate)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-8">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
                              {invoice.status === 'partial' && invoice.paidAmount && (
                                <p className="text-sm text-emerald-600 mt-1">
                                  Avance: {formatCurrency(invoice.paidAmount)}
                                </p>
                              )}
                            </div>
                            
                            <span className={`px-5 py-2.5 rounded-xl text-sm font-bold ${
                              invoice.status === 'paid' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : invoice.status === 'partial' 
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}>
                              {invoice.status === 'paid' ? '✓ Soldée' : invoice.status === 'partial' ? '◐ En cours' : 'Brouillon'}
                            </span>
                            
                            <button
                              onClick={() => handleViewInvoice(invoice.id)}
                              className="w-14 h-14 rounded-2xl bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center transition-colors group"
                              title="Voir la facture"
                            >
                              <Eye className="w-6 h-6 text-indigo-600 group-hover:scale-110 transition-transform" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Barre de progression premium */}
                        {invoice.status === 'partial' && invoice.paidAmount && (
                          <div className="mt-6 pt-6 border-t border-gray-100">
                            <div className="flex items-center justify-between text-sm mb-3">
                              <span className="text-gray-500">Progression du paiement</span>
                              <span className="font-bold text-gray-900">
                                {Math.round((invoice.paidAmount / invoice.total) * 100)}%
                              </span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${(invoice.paidAmount / invoice.total) * 100}%` }}
                              ></div>
                            </div>
                            <p className="text-sm text-amber-600 mt-2 font-medium">
                              Reste à payer: {formatCurrency(invoice.total - invoice.paidAmount)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Premium */}
          <div className="border-t border-gray-200 px-10 py-6 bg-white flex justify-between items-center">
            <button
              onClick={selectedMonth ? () => setSelectedMonth(null) : closeModal}
              className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-xl font-semibold transition-colors flex items-center gap-3"
            >
              {selectedMonth ? (
                <>
                  <ArrowLeft className="w-5 h-5" />
                  Retour aux mois
                </>
              ) : (
                <>
                  <X className="w-5 h-5" />
                  Fermer
                </>
              )}
            </button>
            <button
              onClick={() => {
                closeModal();
                onCreateInvoice(viewingClient.id);
              }}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 flex items-center gap-3"
            >
              <FileText className="w-5 h-5" />
              Nouvelle facture
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
