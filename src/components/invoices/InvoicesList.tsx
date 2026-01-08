"use client";

import { useState, useEffect } from 'react';
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  FileText,
  Download,
  Send,
  CheckCircle,
  Printer,
  DollarSign,
  Clock,
  X
} from 'lucide-react';
import { Invoice, INVOICE_STATUSES, Company } from '@/lib/invoices/invoice-types';
import EditInvoiceModal from './EditInvoiceModal';
import PaymentModal from './PaymentModal';

interface Props {
  searchQuery: string;
  refreshKey: number;
  onRefresh: () => void;
  company: Company;
}

export default function InvoicesList({ searchQuery, refreshKey, onRefresh, company }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  
  // Modal "En cours" avec avance
  const [enCoursModal, setEnCoursModal] = useState<Invoice | null>(null);
  const [avanceAmount, setAvanceAmount] = useState<string>('');

  useEffect(() => {
    fetchInvoices();
  }, [refreshKey, company]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices?company=${company}`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error('Erreur chargement factures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (invoiceId: string, newStatus: string, paidAmount?: number) => {
    try {
      // Trouver la facture pour obtenir le total si on la marque comme payée
      const invoice = invoices.find(inv => inv.id === invoiceId);
      
      const updateData: any = { 
        id: invoiceId, 
        status: newStatus,
      };
      
      if (newStatus === 'paid') {
        updateData.paidAt = new Date().toISOString();
        updateData.paidAmount = invoice?.total || 0;
        updateData.remainingAmount = 0;
      } else if (newStatus === 'partial' && paidAmount !== undefined) {
        updateData.paidAmount = paidAmount;
        updateData.remainingAmount = (invoice?.total || 0) - paidAmount;
      }
      
      const res = await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      if (res.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
    }
    setSelectedInvoice(null);
  };

  // Ouvrir le modal "En cours"
  const openEnCoursModal = (invoice: Invoice) => {
    setEnCoursModal(invoice);
    setAvanceAmount(invoice.paidAmount?.toString() || '0');
    setSelectedInvoice(null);
  };

  // Valider l'avance
  const handleEnCoursSubmit = () => {
    if (!enCoursModal) return;
    const amount = parseFloat(avanceAmount) || 0;
    handleStatusChange(enCoursModal.id, 'partial', amount);
    setEnCoursModal(null);
    setAvanceAmount('');
  };

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Supprimer cette facture ?')) return;
    
    try {
      const res = await fetch(`/api/invoices?id=${invoiceId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const handlePrint = (invoiceId: string) => {
    window.open(`/api/invoices/generate?id=${invoiceId}`, '_blank');
  };

  const handleDownload = async (invoice: Invoice) => {
    // Ouvrir dans un nouvel onglet pour permettre l'impression/téléchargement PDF
    const printWindow = window.open(`/api/invoices/generate?id=${invoice.id}`, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setSelectedInvoice(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-CA');
  };

  const formatMonthYear = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const getMonthKey = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // Filtrer les factures
  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(query) ||
      inv.client?.companyName?.toLowerCase().includes(query) ||
      inv.client?.email?.toLowerCase().includes(query)
    );
  });

  // Grouper les factures par mois (triées du plus récent au plus ancien)
  const groupedInvoices = filteredInvoices.reduce((groups, invoice) => {
    const monthKey = getMonthKey(invoice.issueDate);
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(invoice);
    return groups;
  }, {} as Record<string, Invoice[]>);

  // Trier les mois du plus récent au plus ancien
  const sortedMonths = Object.keys(groupedInvoices).sort((a, b) => b.localeCompare(a));

  // Calculer le total par mois
  const getMonthTotal = (invoices: Invoice[]) => {
    return invoices.reduce((sum, inv) => sum + inv.total, 0);
  };

  // Calculer les stats du mois (payées et en cours)
  const pad = (num: number) => num.toString().padStart(2, '0');
  const monthKeyToDate = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month - 1);
  }
  const getMonthStats = (invoices: Invoice[]) => {
    const paid = invoices.filter(inv => inv.status === 'paid');
    const partial = invoices.filter(inv => inv.status === 'partial');
    const paidTotal = paid.reduce((sum, inv) => sum + inv.total, 0);
    const partialTotal = partial.reduce((sum, inv) => sum + inv.total, 0);
    
    return {
      paidCount: paid.length,
      paidTotal,
      partialCount: partial.length,
      partialTotal,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (filteredInvoices.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Aucune facture trouvée</p>
        <p className="text-sm text-gray-400 mt-1">Créez votre première facture pour commencer</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedMonths.map((monthKey) => {
        const monthInvoices = groupedInvoices[monthKey];
        const monthTotal = getMonthTotal(monthInvoices);
        const monthLabel = formatMonthYear(monthInvoices[0].issueDate);
        const monthStats = getMonthStats(monthInvoices);
        
        return (
          <div key={monthKey} className="border border-gray-200 rounded-xl overflow-visible">
            {/* En-tête du mois - RESPONSIVE */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-white capitalize">
                  📅 {monthLabel}
                </h3>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-blue-100 text-xs sm:text-sm">
                    {monthInvoices.length} facture{monthInvoices.length > 1 ? 's' : ''}
                  </span>
                  <span className="bg-white/20 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-white font-bold text-sm sm:text-base">
                    {formatCurrency(monthTotal)}
                  </span>
                </div>
              </div>
              {/* Stats du mois - RESPONSIVE */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/20">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400"></span>
                  <span className="text-white/90 text-xs sm:text-sm">
                    Soldées: <strong>{monthStats.paidCount}</strong> ({formatCurrency(monthStats.paidTotal)})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400"></span>
                  <span className="text-white/90 text-xs sm:text-sm">
                    En cours: <strong>{monthStats.partialCount}</strong> ({formatCurrency(monthStats.partialTotal)})
                  </span>
                </div>
              </div>
            </div>
            
            {/* VERSION MOBILE - Cards */}
            <div className="block md:hidden">
              {monthInvoices.map((invoice) => {
                const status = INVOICE_STATUSES[invoice.status];
                const isOverdue = invoice.status === 'sent' && new Date(invoice.dueDate) < new Date();
                
                return (
                  <div key={invoice.id} className="p-4 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-semibold text-blue-600">
                            {invoice.invoiceNumber}
                          </span>
                          {invoice.status === 'paid' && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${status.color} text-white`}>
                              {status.label}
                            </span>
                          )}
                          {invoice.status === 'partial' && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${status.color} text-white`}>
                              En cours
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm truncate">{invoice.client?.companyName || 'N/A'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(invoice.issueDate)}</p>
                        {invoice.status === 'partial' && (
                          <div className="mt-1 text-xs">
                            <span className="text-green-600">Avance: {formatCurrency(invoice.paidAmount || 0)}</span>
                            <span className="mx-1">•</span>
                            <span className="text-orange-600 font-semibold">Reste: {formatCurrency(invoice.total - (invoice.paidAmount || 0))}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
                        <div className="relative mt-2">
                          <button
                            onClick={() => setSelectedInvoice(selectedInvoice === invoice.id ? null : invoice.id)}
                            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-600" />
                          </button>
                          
                          {selectedInvoice === invoice.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setSelectedInvoice(null)} />
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
                                <div className="py-2">
                                  <button onClick={() => { handlePrint(invoice.id); setSelectedInvoice(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                    <Eye className="w-4 h-4 text-blue-500" /> Voir
                                  </button>
                                  <button onClick={() => { handleDownload(invoice); setSelectedInvoice(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                    <Download className="w-4 h-4 text-green-500" /> Télécharger
                                  </button>
                                  <button onClick={() => { handleEdit(invoice); setSelectedInvoice(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                    <Edit className="w-4 h-4 text-orange-500" /> Modifier
                                  </button>
                                  <hr className="my-2" />
                                  {invoice.status !== 'paid' && (
                                    <>
                                      <button onClick={() => openEnCoursModal(invoice)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-yellow-700 hover:bg-yellow-50 font-medium">
                                        <Clock className="w-4 h-4" /> En cours
                                      </button>
                                      <button onClick={() => handleStatusChange(invoice.id, 'paid')} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 font-medium">
                                        <CheckCircle className="w-4 h-4" /> Soldée
                                      </button>
                                      <hr className="my-2" />
                                    </>
                                  )}
                                  <button onClick={() => handleDelete(invoice.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" /> Supprimer
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* VERSION DESKTOP - Tableau */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">N° Facture</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Client</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Échéance</th>
                    <th className="text-right py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Montant</th>
                    <th className="text-center py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Statut</th>
                    <th className="text-right py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                {monthInvoices.map((invoice) => {
                  const status = INVOICE_STATUSES[invoice.status];
                  const isOverdue = invoice.status === 'sent' && new Date(invoice.dueDate) < new Date();
                  
                  return (
                    <tr key={invoice.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="py-5 px-6">
                        <span className="font-mono text-sm font-semibold text-blue-600">
                          {invoice.invoiceNumber}
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{invoice.client?.companyName || 'N/A'}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{invoice.client?.email}</p>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-sm text-gray-700">
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td className="py-5 px-6">
                        <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                          {formatDate(invoice.dueDate)}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <span className="font-bold text-gray-900 text-base">
                          {formatCurrency(invoice.total)}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-center">
                        {invoice.status === 'paid' ? (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${status.color} text-white`}>
                            {status.label}
                          </span>
                        ) : invoice.status === 'partial' ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${status.color} text-white`}>
                              {status.label}
                            </span>
                            <div className="text-xs leading-tight">
                              <span className="text-green-600">Avance: {formatCurrency(invoice.paidAmount || 0)}</span>
                              <br />
                              <span className="text-orange-600 font-semibold">Reste: {formatCurrency(invoice.total - (invoice.paidAmount || 0))}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-right">
                        <div className="relative">
                          <button
                            onClick={() => setSelectedInvoice(selectedInvoice === invoice.id ? null : invoice.id)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-600" />
                          </button>
                          
                          {selectedInvoice === invoice.id && (
                            <>
                              {/* Overlay pour fermer */}
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setSelectedInvoice(null)}
                              />
                              {/* Menu */}
                              <div className="absolute right-full top-0 mr-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
                                <div className="py-2">
                                  <button
                                    onClick={() => { handlePrint(invoice.id); setSelectedInvoice(null); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Eye className="w-4 h-4 text-blue-500" />
                                    Voir / Aperçu
                                  </button>
                                  
                                  <button
                                    onClick={() => { handleDownload(invoice); setSelectedInvoice(null); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Download className="w-4 h-4 text-green-500" />
                                    Télécharger PDF
                                  </button>
                                  
                                  <button
                                    onClick={() => { handleEdit(invoice); setSelectedInvoice(null); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Edit className="w-4 h-4 text-orange-500" />
                                    Modifier
                                  </button>
                                  
                                  <hr className="my-2" />
                                  
                                  {/* Bouton En cours - ouvre le modal pour saisir l'avance */}
                                  {invoice.status !== 'paid' && (
                                    <button
                                      onClick={() => openEnCoursModal(invoice)}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-yellow-700 hover:bg-yellow-50 font-medium"
                                    >
                                      <Clock className="w-4 h-4" />
                                      En cours
                                    </button>
                                  )}
                                  
                                  {/* Bouton Payer - disponible si pas déjà soldée */}
                                  {invoice.status !== 'paid' && (
                                    <button
                                      onClick={() => handleStatusChange(invoice.id, 'paid')}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 font-medium"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      Payer (Soldée)
                                    </button>
                                  )}
                                  
                                  <hr className="my-2" />
                                  
                                  <button
                                    onClick={() => handleDelete(invoice.id)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        );
      })}
      
      {/* Modal d'édition */}
      <EditInvoiceModal
        isOpen={editingInvoice !== null}
        invoice={editingInvoice}
        onClose={() => setEditingInvoice(null)}
        onSuccess={() => {
          setEditingInvoice(null);
          onRefresh();
        }}
      />

      {/* Modal de paiement */}
      <PaymentModal
        isOpen={paymentInvoice !== null}
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        onSuccess={() => {
          setPaymentInvoice(null);
          onRefresh();
        }}
      />

      {/* Modal En Cours - Saisie de l'avance */}
      {enCoursModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEnCoursModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Mettre en cours</h3>
                  <p className="text-yellow-100 text-sm">{enCoursModal.invoiceNumber}</p>
                </div>
                <button onClick={() => setEnCoursModal(null)} className="text-white/80 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6">
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Montant total :</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(enCoursModal.total)}</span>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avance reçue (montant payé par le client)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="number"
                    min="0"
                    max={enCoursModal.total}
                    step="0.01"
                    value={avanceAmount}
                    onChange={(e) => setAvanceAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-lg font-semibold text-gray-900 bg-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="0.00"
                    style={{ color: '#111827' }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Laissez 0 si aucune avance n'a été versée
                </p>
              </div>
              
              {/* Résumé */}
              {parseFloat(avanceAmount) > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-green-700">Avance reçue :</span>
                    <span className="font-bold text-green-700">{formatCurrency(parseFloat(avanceAmount) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-700">Reste à payer :</span>
                    <span className="font-bold text-orange-700">{formatCurrency(enCoursModal.total - (parseFloat(avanceAmount) || 0))}</span>
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setEnCoursModal(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleEnCoursSubmit}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
