"use client";

import { useState, useEffect } from 'react';
import { X, FileText, Plus, Trash2, Loader2, Calculator } from 'lucide-react';
import { Client, Invoice, TAX_RATES } from '@/lib/invoices/invoice-types';

interface Props {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface InvoiceLine {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function EditInvoiceModal({ isOpen, invoice, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  
  const [formData, setFormData] = useState({
    clientId: '',
    issueDate: '',
    dueDate: '',
    taxRateId: 'none',
    customTaxRate: 0,
    paymentTerms: '',
    publicNotes: '',
    status: 'draft' as string,
  });
  
  const [lines, setLines] = useState<InvoiceLine[]>([
    { description: '', quantity: 1, unitPrice: 0 }
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      if (invoice) {
        loadInvoiceData();
      }
    }
  }, [isOpen, invoice]);

  const loadInvoiceData = () => {
    if (!invoice) return;
    
    // Trouver le taux de taxe correspondant
    let taxRateId = 'custom';
    const matchingRate = TAX_RATES.find(r => r.rate === invoice.taxRate);
    if (matchingRate) {
      taxRateId = matchingRate.id;
    }
    
    setFormData({
      clientId: invoice.clientId,
      issueDate: invoice.issueDate.split('T')[0],
      dueDate: invoice.dueDate.split('T')[0],
      taxRateId,
      customTaxRate: matchingRate ? 0 : invoice.taxRate,
      paymentTerms: invoice.paymentTerms || '',
      publicNotes: invoice.publicNotes || '',
      status: invoice.status,
    });
    
    setLines(invoice.lines.map(line => ({
      id: line.id,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    })));
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/invoices/clients');
      const data = await res.json();
      if (data.success) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Erreur chargement clients:', error);
    }
  };

  const addLine = () => {
    setLines([...lines, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof InvoiceLine, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  // Calculs
  const getTaxRate = () => {
    if (formData.taxRateId === 'custom') {
      return formData.customTaxRate;
    }
    const rate = TAX_RATES.find(r => r.id === formData.taxRateId);
    return rate?.rate || 0;
  };

  const subtotal = lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
  const taxRate = getTaxRate();
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoice) return;
    
    if (!formData.clientId) {
      setError('Veuillez sélectionner un client');
      return;
    }
    
    const validLines = lines.filter(l => l.description && l.quantity > 0 && l.unitPrice > 0);
    if (validLines.length === 0) {
      setError('Ajoutez au moins une ligne avec description, quantité et prix');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: invoice.id,
          clientId: formData.clientId,
          issueDate: formData.issueDate,
          dueDate: formData.dueDate,
          lines: validLines,
          taxRate: getTaxRate(),
          paymentTerms: formData.paymentTerms,
          publicNotes: formData.publicNotes,
          status: formData.status,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Erreur lors de la modification');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0 bg-orange-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              Modifier la facture
            </h2>
            <p className="text-sm text-gray-500">{invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          
          <div className="space-y-6">
            {/* Client & Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client *
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                  required
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.companyName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'émission
                </label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'échéance
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                />
              </div>
            </div>
            
            {/* Lignes de facture */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Lignes de facture
                </label>
                <button
                  type="button"
                  onClick={addLine}
                  className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une ligne
                </button>
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-1/2">Description</th>
                      <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-20">Qté</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-32">Prix unit.</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-32">Total</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={index} className="border-t border-gray-100">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => updateLine(index, 'description', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 text-sm bg-white text-gray-900"
                            placeholder="Description du produit ou service"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={line.quantity}
                            onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 text-sm text-center bg-white text-gray-900"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 text-sm text-right bg-white text-gray-900"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="py-2 px-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(line.quantity * line.unitPrice)}
                        </td>
                        <td className="py-2 px-1">
                          {lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLine(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Taxes & Totaux */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Statut */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="sent">Envoyée</option>
                    <option value="paid">Payée</option>
                    <option value="overdue">En retard</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </div>
                
                {/* Taux de taxe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taxes
                  </label>
                  <select
                    value={formData.taxRateId}
                    onChange={(e) => setFormData({ ...formData, taxRateId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                  >
                    {TAX_RATES.map(rate => (
                      <option key={rate.id} value={rate.id}>
                        {rate.label}
                      </option>
                    ))}
                  </select>
                  
                  {formData.taxRateId === 'custom' && (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.customTaxRate}
                      onChange={(e) => setFormData({ ...formData, customTaxRate: parseFloat(e.target.value) || 0 })}
                      className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
                      placeholder="Taux personnalisé (%)"
                    />
                  )}
                </div>
                
                {/* Conditions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conditions de paiement
                  </label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                    placeholder="Ex: Net 30 jours"
                  />
                </div>
                
                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (visibles sur la facture)
                  </label>
                  <textarea
                    value={formData.publicNotes}
                    onChange={(e) => setFormData({ ...formData, publicNotes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                    rows={3}
                    placeholder="Notes additionnelles..."
                  />
                </div>
              </div>
              
              {/* Récapitulatif */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Récapitulatif
                </h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sous-total</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Taxes ({taxRate}%)</span>
                    <span className="font-medium">{formatCurrency(taxAmount)}</span>
                  </div>
                  
                  <hr className="my-2" />
                  
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-orange-600">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Enregistrer les modifications
          </button>
        </div>
      </div>
    </div>
  );
}
