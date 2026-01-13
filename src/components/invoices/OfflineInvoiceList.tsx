'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Clock, Check, RefreshCw, Trash2, Printer, Wifi, WifiOff } from 'lucide-react';
import { offlineStore, OfflineInvoice, syncManager } from '@/lib/offline';

interface OfflineInvoiceListProps {
  orgId: string;
  onInvoiceSelect?: (invoice: OfflineInvoice) => void;
  refreshTrigger?: number;
}

export function OfflineInvoiceList({ orgId, onInvoiceSelect, refreshTrigger }: OfflineInvoiceListProps) {
  const [invoices, setInvoices] = useState<OfflineInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadInvoices();
    
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => {
      setIsOnline(true);
      // Sync automatique quand on redevient en ligne
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [orgId, refreshTrigger]);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await offlineStore.getAllInvoices(orgId);
      setInvoices(data);
    } catch (error) {
      console.error('Erreur chargement factures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      await syncManager.syncNow();
      await loadInvoices(); // Recharger après sync
    } catch (error) {
      console.error('Erreur sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (localId: string) => {
    if (!confirm('Supprimer cette facture ?')) return;
    
    try {
      await offlineStore.deleteInvoice(localId);
      await loadInvoices();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const handlePrint = (invoice: OfflineInvoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const date = new Date(invoice.createdAt).toLocaleDateString('fr-FR');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture - ${invoice.clientName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #333; }
          .info { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .client { background: #f5f5f5; padding: 15px; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #333; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .total { text-align: right; font-size: 1.2em; }
          .footer { text-align: center; margin-top: 40px; color: #666; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
          .status.synced { background: #d1fae5; color: #065f46; }
          .status.pending { background: #fef3c7; color: #92400e; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>FACTURE</h1>
          <p>ICONES - Gestion</p>
        </div>
        
        <div class="info">
          <div class="client">
            <strong>Client:</strong><br>
            ${invoice.clientName}<br>
            ${invoice.clientEmail ? `Email: ${invoice.clientEmail}` : ''}
          </div>
          <div>
            <strong>Date:</strong> ${date}<br>
            <strong>Réf:</strong> ${invoice.localId.slice(-8)}<br>
            <span class="status ${invoice.status}">${invoice.status === 'synced' ? 'Synchronisé' : 'En attente'}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="width: 100px;">Quantité</th>
              <th style="width: 120px;">Prix unitaire</th>
              <th style="width: 120px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">${item.unitPrice.toFixed(2)} €</td>
                <td style="text-align: right;">${item.total.toFixed(2)} €</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          <strong>TOTAL: ${invoice.total.toFixed(2)} €</strong>
        </div>

        <div class="footer">
          <p>Merci pour votre confiance !</p>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return (
          <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
            <Check className="w-3 h-3" />
            Synchronisé
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            En attente
          </span>
        );
      default:
        return (
          <span className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 px-2 py-1 rounded-full">
            Brouillon
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Factures locales
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({invoices.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Indicateur de connexion */}
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            isOnline 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </div>
          
          {/* Bouton sync */}
          <button
            onClick={handleSync}
            disabled={!isOnline || isSyncing}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
              isOnline && !isSyncing
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sync...' : 'Sync'}
          </button>
        </div>
      </div>

      {/* Liste */}
      {invoices.length === 0 ? (
        <div className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            Aucune facture locale
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Les factures créées hors ligne apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {invoices.map((invoice) => (
            <div
              key={invoice.localId}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onInvoiceSelect?.(invoice)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {invoice.clientName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(invoice.createdAt).toLocaleDateString('fr-FR')} • {invoice.items.length} article(s)
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {invoice.total.toFixed(2)} €
                  </p>
                  {getStatusBadge(invoice.status)}
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePrint(invoice)}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title="Imprimer"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(invoice.localId)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nombre en attente de sync */}
      {invoices.filter(i => i.status === 'pending').length > 0 && (
        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border-t border-orange-100 dark:border-orange-800">
          <p className="text-sm text-orange-700 dark:text-orange-300 text-center">
            {invoices.filter(i => i.status === 'pending').length} facture(s) en attente de synchronisation
          </p>
        </div>
      )}
    </div>
  );
}

export default OfflineInvoiceList;
