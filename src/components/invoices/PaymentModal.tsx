"use client";

import { useState } from 'react';
import { X, DollarSign, Calendar, CreditCard, FileText, Check } from 'lucide-react';
import { Invoice, PAYMENT_METHODS, Payment } from '@/lib/invoices/invoice-types';

interface Props {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({ isOpen, invoice, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<Payment['method']>('cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !invoice) return null;

  // Calculer le solde restant
  const paidAmount = invoice.paidAmount || 0;
  const remainingAmount = invoice.total - paidAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const paymentAmount = parseFloat(amount);
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError('Veuillez entrer un montant valide');
      return;
    }

    if (paymentAmount > remainingAmount) {
      setError(`Le montant ne peut pas dépasser le solde restant (${formatCurrency(remainingAmount)})`);
      return;
    }

    setLoading(true);

    try {
      // Créer le nouveau paiement
      const newPayment: Payment = {
        id: `pay-${Date.now()}`,
        amount: paymentAmount,
        date,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
      };

      // Calculer les nouveaux totaux
      const newPaidAmount = paidAmount + paymentAmount;
      const newRemainingAmount = invoice.total - newPaidAmount;
      
      // Déterminer le nouveau statut
      let newStatus = invoice.status;
      if (newRemainingAmount <= 0) {
        newStatus = 'paid'; // Soldée
      } else if (newPaidAmount > 0) {
        newStatus = 'partial'; // En cours
      }

      // Mettre à jour la facture
      const res = await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: invoice.id,
          status: newStatus,
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          payments: [...(invoice.payments || []), newPayment],
          ...(newStatus === 'paid' ? { paidAt: new Date().toISOString() } : {}),
        }),
      });

      if (res.ok) {
        onSuccess();
        resetForm();
      } else {
        setError('Erreur lors de l\'enregistrement du paiement');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handlePayFull = () => {
    setAmount(remainingAmount.toString());
  };

  const resetForm = () => {
    setAmount('');
    setMethod('cash');
    setDate(new Date().toISOString().split('T')[0]);
    setReference('');
    setNotes('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">💰 Enregistrer un paiement</h2>
                <p className="text-green-100 text-sm mt-1">
                  Facture {invoice.invoiceNumber}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Résumé de la facture */}
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 uppercase">Total facture</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Déjà payé</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(paidAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Solde restant</p>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(remainingAmount)}</p>
              </div>
            </div>
            
            {/* Barre de progression */}
            <div className="mt-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${(paidAmount / invoice.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-right">
                {Math.round((paidAmount / invoice.total) * 100)}% payé
              </p>
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Montant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Montant du paiement *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={remainingAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-bold"
                  placeholder="0.00"
                  required
                />
                <button
                  type="button"
                  onClick={handlePayFull}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium text-sm whitespace-nowrap"
                >
                  Payer tout
                </button>
              </div>
            </div>

            {/* Méthode de paiement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Mode de paiement *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(PAYMENT_METHODS).map(([key, { label, icon }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMethod(key as Payment['method'])}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      method === key
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <span className="text-xl">{icon}</span>
                    <p className="text-xs mt-1 font-medium">{label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Date et Référence */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date du paiement
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Référence
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="N° transaction..."
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                placeholder="Informations supplémentaires..."
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Historique des paiements */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="px-6 pb-6">
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Historique des paiements</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <span>{PAYMENT_METHODS[payment.method].icon}</span>
                        <span className="text-gray-600">{new Date(payment.date).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <span className="font-semibold text-green-600">{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
