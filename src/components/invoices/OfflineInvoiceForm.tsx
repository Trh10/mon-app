'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer, Wifi, WifiOff, FileText } from 'lucide-react';
import { offlineStore, OfflineInvoice, InvoiceItem } from '@/lib/offline';

interface OfflineInvoiceFormProps {
  orgId: string;
  onSaved?: (invoice: OfflineInvoice) => void;
}

export function OfflineInvoiceForm({ orgId, onSaved }: OfflineInvoiceFormProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const calculateItemTotal = (item: InvoiceItem): number => {
    return item.quantity * item.unitPrice;
  };

  const calculateTotal = (): number => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    newItems[index].total = calculateItemTotal(newItems[index]);
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    if (!clientName.trim()) {
      alert('Veuillez entrer le nom du client');
      return;
    }

    if (items.every(item => !item.description.trim())) {
      alert('Veuillez ajouter au moins un article');
      return;
    }

    setIsSaving(true);
    setSavedMessage('');

    try {
      const localId = await offlineStore.saveInvoice({
        id: '',
        clientName,
        clientEmail,
        items: items.filter(item => item.description.trim()),
        total: calculateTotal(),
        status: 'pending',
        orgId
      });

      setSavedMessage(isOnline 
        ? '✅ Facture sauvegardée et sera synchronisée' 
        : '📴 Facture sauvegardée localement (hors ligne)');

      // Récupérer la facture sauvegardée
      const savedInvoice = await offlineStore.getInvoice(localId);
      if (savedInvoice && onSaved) {
        onSaved(savedInvoice);
      }

      // Reset le formulaire
      setClientName('');
      setClientEmail('');
      setItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);

    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      setSavedMessage('❌ Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    if (!clientName.trim()) {
      alert('Veuillez entrer les informations de la facture avant d\'imprimer');
      return;
    }

    // Créer une fenêtre d'impression
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const total = calculateTotal();
    const date = new Date().toLocaleDateString('fr-FR');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture - ${clientName}</title>
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
          .total strong { color: #333; }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 0.9em; }
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
            ${clientName}<br>
            ${clientEmail ? `Email: ${clientEmail}` : ''}
          </div>
          <div>
            <strong>Date:</strong> ${date}<br>
            <strong>N° Facture:</strong> ${Date.now().toString().slice(-8)}
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
            ${items.filter(item => item.description.trim()).map(item => `
              <tr>
                <td>${item.description}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">${item.unitPrice.toFixed(2)} €</td>
                <td style="text-align: right;">${calculateItemTotal(item).toFixed(2)} €</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          <strong>TOTAL: ${total.toFixed(2)} €</strong>
        </div>

        <div class="footer">
          <p>Merci pour votre confiance !</p>
          <p>Facture générée le ${date}</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Header avec statut */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Nouvelle Facture
        </h2>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
          isOnline 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
        }`}>
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {isOnline ? 'En ligne' : 'Mode hors ligne'}
        </div>
      </div>

      {/* Message mode hors ligne */}
      {!isOnline && (
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            📴 <strong>Mode hors ligne actif.</strong> Vos factures seront sauvegardées localement et synchronisées automatiquement quand la connexion sera rétablie.
          </p>
        </div>
      )}

      {/* Informations client */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nom du client *
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Nom du client"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email (optionnel)
          </label>
          <input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="email@client.com"
          />
        </div>
      </div>

      {/* Articles */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Articles
        </label>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Description de l'article"
                />
              </div>
              <div className="w-24">
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                  placeholder="Qté"
                />
              </div>
              <div className="w-32">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                  placeholder="Prix"
                />
              </div>
              <div className="w-28 text-right py-2 font-medium text-gray-900 dark:text-white">
                {calculateItemTotal(item).toFixed(2)} €
              </div>
              <button
                onClick={() => removeItem(index)}
                disabled={items.length === 1}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="mt-3 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Ajouter un article
        </button>
      </div>

      {/* Total */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
        <div className="flex justify-end">
          <div className="text-right">
            <span className="text-gray-600 dark:text-gray-400">Total: </span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {calculateTotal().toFixed(2)} €
            </span>
          </div>
        </div>
      </div>

      {/* Message de sauvegarde */}
      {savedMessage && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          savedMessage.includes('❌') 
            ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
            : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
        }`}>
          {savedMessage}
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"
        >
          <Printer className="w-4 h-4" />
          Imprimer
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  );
}

export default OfflineInvoiceForm;
