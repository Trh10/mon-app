"use client";

import { useState, useEffect } from 'react';
import { X, FileText, Plus, Trash2, Loader2, Calculator, ChevronDown, ChevronRight } from 'lucide-react';
import { Client, Invoice, TAX_RATES, ALLINONE_TEMPLATES, AllinoneTemplate, Company } from '@/lib/invoices/invoice-types';

interface Props {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Interface pour lignes simples (Facture A, ALL IN ONE basique)
interface InvoiceLine {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  chargesTTC?: number; // Pour Placement/Transfert
}

// Interface pour lignes Facture B (ICONES)
interface InvoiceLineB {
  id?: string;
  description: string;
  quantity: number;
  squareMeters: number;
  days: number;
  unitPrice: number;
  daysImpactPrice: boolean;
}

// Interface pour sections Facture B
interface SectionB {
  id: string;
  title: string;
  lines: InvoiceLineB[];
}

// Interface pour acomptes
interface Acomptes {
  acompte1: { percent: number; amount: number } | null;
  acompte2: { amount: number } | null;
  acompte3: { amount: number } | null;
  totalPaye: number;
}

export default function EditInvoiceModal({ isOpen, invoice, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  
  // Détection du type de facture
  const [invoiceType, setInvoiceType] = useState<'icones_a' | 'icones_b' | 'allinone'>('icones_a');
  const [allinoneTemplate, setAllinoneTemplate] = useState<AllinoneTemplate>('creation_entreprise');
  
  // Options pour Placement/Transfert ALL IN ONE
  const [chargesTTCMode, setChargesTTCMode] = useState(true);
  const [enablePlacementTVA, setEnablePlacementTVA] = useState(false);
  const [placementDeduction, setPlacementDeduction] = useState(0);
  const [enablePlacementDeduction, setEnablePlacementDeduction] = useState(false);
  const [transfertDeduction, setTransfertDeduction] = useState(0);
  const [enableTransfertDeduction, setEnableTransfertDeduction] = useState(false);
  
  // Acomptes pour ICONES Facture B
  const [enableAcompte1, setEnableAcompte1] = useState(false);
  const [acompte1Percent, setAcompte1Percent] = useState(60);
  const [enableAcompte2, setEnableAcompte2] = useState(false);
  const [acompte2Amount, setAcompte2Amount] = useState(0);
  const [enableAcompte3, setEnableAcompte3] = useState(false);
  const [acompte3Amount, setAcompte3Amount] = useState(0);
  
  const [formData, setFormData] = useState({
    clientId: '',
    issueDate: '',
    dueDate: '',
    taxRate: 0,
    paymentTerms: '',
    publicNotes: '',
    status: 'draft' as string,
    projectDescription: '',
    projectName: '',
  });
  
  // Lignes pour Facture A et ALL IN ONE
  const [lines, setLines] = useState<InvoiceLine[]>([
    { description: '', quantity: 1, unitPrice: 0 }
  ]);
  
  // Sections pour Facture B (ICONES)
  const [sections, setSections] = useState<SectionB[]>([
    { id: 'section-1', title: '', lines: [{ id: 'line-1', description: '', quantity: 0, squareMeters: 0, days: 0, unitPrice: 0, daysImpactPrice: true }] }
  ]);

  useEffect(() => {
    if (isOpen && invoice) {
      fetchClients();
      loadInvoiceData();
    }
  }, [isOpen, invoice]);

  const loadInvoiceData = () => {
    if (!invoice) return;
    
    // Déterminer le type de facture
    const template = invoice.template || '';
    const company = invoice.company || 'icones';
    
    if (company === 'allinone') {
      setInvoiceType('allinone');
      setAllinoneTemplate(template as AllinoneTemplate);
      
      // Charger les options spécifiques
      if (template === 'placement') {
        setEnablePlacementDeduction(!!(invoice as any).enablePlacementDeduction);
        setPlacementDeduction((invoice as any).placementDeduction || 0);
      } else if (template === 'transfert') {
        setEnableTransfertDeduction(!!(invoice as any).enableTransfertDeduction);
        setTransfertDeduction((invoice as any).transfertDeduction || 0);
      }
    } else if (template.includes('_b') || (invoice.sections && invoice.sections.length > 0)) {
      setInvoiceType('icones_b');
      
      // Charger les acomptes
      if ((invoice as any).acomptes) {
        const acomptes = (invoice as any).acomptes as Acomptes;
        if (acomptes.acompte1) {
          setEnableAcompte1(true);
          setAcompte1Percent(acomptes.acompte1.percent || 60);
        }
        if (acomptes.acompte2) {
          setEnableAcompte2(true);
          setAcompte2Amount(acomptes.acompte2.amount || 0);
        }
        if (acomptes.acompte3) {
          setEnableAcompte3(true);
          setAcompte3Amount(acomptes.acompte3.amount || 0);
        }
      }
    } else {
      setInvoiceType('icones_a');
    }
    
    setFormData({
      clientId: invoice.clientId,
      issueDate: invoice.issueDate.split('T')[0],
      dueDate: invoice.dueDate.split('T')[0],
      taxRate: invoice.taxRate || 0,
      paymentTerms: invoice.paymentTerms || '',
      publicNotes: invoice.publicNotes || '',
      status: invoice.status,
      projectDescription: (invoice as any).projectDescription || '',
      projectName: (invoice as any).projectName || '',
    });
    
    // Charger les lignes ou sections
    if (invoice.sections && invoice.sections.length > 0) {
      setSections(invoice.sections.map(s => ({
        id: s.id,
        title: s.title,
        lines: s.lines.map(l => ({
          id: l.id,
          description: l.description,
          quantity: l.quantity || 0,
          squareMeters: (l as any).squareMeters || 0,
          days: (l as any).days || 0,
          unitPrice: l.unitPrice,
          daysImpactPrice: (l as any).daysImpactPrice !== false,
        }))
      })));
    } else if (invoice.lines && invoice.lines.length > 0) {
      setLines(invoice.lines.map(line => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        chargesTTC: (line as any).chargesTTC || 0,
      })));
    }
  };

  const fetchClients = async () => {
    try {
      const company = invoice?.company || 'icones';
      const res = await fetch(`/api/invoices/clients?company=${company}`);
      const data = await res.json();
      if (data.success) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Erreur chargement clients:', error);
    }
  };

  // === Fonctions pour lignes simples ===
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

  // === Fonctions pour sections Facture B ===
  const addSection = () => {
    const newId = `section-${Date.now()}`;
    setSections([...sections, { 
      id: newId, 
      title: '', 
      lines: [{ id: `line-${Date.now()}`, description: '', quantity: 0, squareMeters: 0, days: 0, unitPrice: 0, daysImpactPrice: true }] 
    }]);
  };

  const removeSection = (sectionIndex: number) => {
    if (sections.length > 1) {
      setSections(sections.filter((_, i) => i !== sectionIndex));
    }
  };

  const updateSectionTitle = (sectionIndex: number, title: string) => {
    const newSections = [...sections];
    newSections[sectionIndex].title = title;
    setSections(newSections);
  };

  const addLineToSection = (sectionIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].lines.push({ 
      id: `line-${Date.now()}`, 
      description: '', 
      quantity: 0, 
      squareMeters: 0, 
      days: 0, 
      unitPrice: 0,
      daysImpactPrice: true
    });
    setSections(newSections);
  };

  const removeLineFromSection = (sectionIndex: number, lineIndex: number) => {
    const newSections = [...sections];
    if (newSections[sectionIndex].lines.length > 1) {
      newSections[sectionIndex].lines = newSections[sectionIndex].lines.filter((_, i) => i !== lineIndex);
      setSections(newSections);
    }
  };

  const updateSectionLine = (sectionIndex: number, lineIndex: number, field: keyof InvoiceLineB, value: string | number | boolean) => {
    const newSections = [...sections];
    (newSections[sectionIndex].lines[lineIndex] as any)[field] = value;
    setSections(newSections);
  };

  // === Calculs ===
  
  // Calcul du total d'une ligne Facture B
  const calculateLineBTotal = (line: InvoiceLineB): number => {
    const qty = line.quantity || 1;
    const m2 = line.squareMeters || 1;
    const days = (line.daysImpactPrice !== false && line.days) ? line.days : 1;
    return qty * m2 * days * line.unitPrice;
  };

  // Calcul du sous-total d'une section
  const calculateSectionSubtotal = (section: SectionB): number => {
    return section.lines.reduce((sum, line) => sum + calculateLineBTotal(line), 0);
  };

  // Totaux pour Facture B (ICONES)
  const subtotalB = sections.reduce((sum, section) => sum + calculateSectionSubtotal(section), 0);
  const totalGeneralB = subtotalB;
  
  // Calcul des acomptes pour ICONES Facture B
  const acompte1Value = enableAcompte1 ? totalGeneralB * (acompte1Percent / 100) : 0;
  const acompte2Value = enableAcompte2 ? acompte2Amount : 0;
  const acompte3Value = enableAcompte3 ? acompte3Amount : 0;
  const totalPaye = acompte1Value + acompte2Value + acompte3Value;

  // Totaux pour lignes simples
  const subtotal = invoiceType === 'allinone' && (allinoneTemplate === 'placement' || allinoneTemplate === 'transfert')
    ? lines.reduce((sum, line) => sum + line.unitPrice + (line.chargesTTC || 0), 0)
    : lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
  const taxAmount = formData.taxRate > 0 ? subtotal * (formData.taxRate / 100) : 0;
  const total = subtotal + taxAmount;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' $';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoice) return;
    
    if (!formData.clientId) {
      setError('Veuillez sélectionner un client');
      return;
    }
    
    // Validation selon le type
    if (invoiceType === 'icones_b') {
      const hasValidSections = sections.some(s => 
        s.title && s.lines.some(l => l.description && l.unitPrice > 0)
      );
      if (!hasValidSections) {
        setError('Ajoutez au moins une section avec un titre et des lignes');
        return;
      }
    } else if (invoiceType === 'allinone' && (allinoneTemplate === 'placement' || allinoneTemplate === 'transfert')) {
      const validLines = lines.filter(l => l.quantity > 0 && l.unitPrice > 0);
      if (validLines.length === 0) {
        setError('Ajoutez au moins une ligne avec effectif et salaires nets');
        return;
      }
    } else {
      const validLines = lines.filter(l => l.description && l.quantity > 0 && l.unitPrice > 0);
      if (validLines.length === 0) {
        setError('Ajoutez au moins une ligne avec description, quantité et prix');
        return;
      }
    }
    
    setLoading(true);
    setError('');
    
    try {
      const requestBody: any = {
        id: invoice.id,
        clientId: formData.clientId,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        paymentTerms: formData.paymentTerms,
        publicNotes: formData.publicNotes,
        status: formData.status,
      };

      if (invoiceType === 'icones_b') {
        // Facture B avec sections
        const validSections = sections
          .filter(s => s.title)
          .map(s => ({
            id: s.id,
            title: s.title,
            lines: s.lines
              .filter(l => l.description && l.unitPrice > 0)
              .map(l => ({
                id: l.id,
                description: l.description,
                quantity: l.quantity || 0,
                squareMeters: l.squareMeters || 0,
                days: l.days || 0,
                unitPrice: l.unitPrice,
                daysImpactPrice: l.daysImpactPrice,
                total: calculateLineBTotal(l),
              })),
            subtotal: calculateSectionSubtotal(s),
          }));
        
        requestBody.sections = validSections;
        requestBody.projectDescription = formData.projectDescription;
        requestBody.projectName = formData.projectName;
        
        // Acomptes
        requestBody.acomptes = {
          acompte1: enableAcompte1 ? { percent: acompte1Percent, amount: acompte1Value } : null,
          acompte2: enableAcompte2 ? { amount: acompte2Value } : null,
          acompte3: enableAcompte3 ? { amount: acompte3Value } : null,
          totalPaye: totalPaye,
        };
        
        requestBody.subtotal = subtotalB;
        requestBody.total = totalGeneralB;
        requestBody.taxRate = 0;
      } else if (invoiceType === 'allinone') {
        // ALL IN ONE
        if (allinoneTemplate === 'placement') {
          const validLines = lines.filter(l => l.quantity > 0 && l.unitPrice > 0).map(l => ({
            ...l,
            description: l.description || '0',
          }));
          requestBody.lines = validLines;
          requestBody.enablePlacementDeduction = enablePlacementDeduction;
          requestBody.placementDeduction = enablePlacementDeduction ? placementDeduction : 0;
          requestBody.subtotal = subtotal;
          requestBody.total = subtotal - (enablePlacementDeduction ? placementDeduction : 0);
        } else if (allinoneTemplate === 'transfert') {
          const validLines = lines.filter(l => l.quantity > 0 && l.unitPrice > 0).map(l => ({
            ...l,
            description: l.description || '0',
          }));
          requestBody.lines = validLines;
          requestBody.enableTransfertDeduction = enableTransfertDeduction;
          requestBody.transfertDeduction = enableTransfertDeduction ? transfertDeduction : 0;
          
          const totalRemunerations = subtotal;
          const totalTVA = totalRemunerations * 0.16;
          const totalGeneral = totalRemunerations + totalTVA;
          
          requestBody.subtotal = totalRemunerations;
          requestBody.taxRate = 16;
          requestBody.taxAmount = totalTVA;
          requestBody.total = totalGeneral - (enableTransfertDeduction ? transfertDeduction : 0);
        } else if (allinoneTemplate === 'recrutement') {
          const validLines = lines.filter(l => l.description && l.unitPrice > 0).map(l => ({
            ...l,
            quantity: l.quantity || 1,
          }));
          requestBody.lines = validLines;
          requestBody.subtotal = subtotal;
          requestBody.taxRate = formData.taxRate;
          requestBody.taxAmount = taxAmount;
          requestBody.total = total;
        } else {
          const validLines = lines.filter(l => l.description && l.quantity > 0 && l.unitPrice > 0);
          requestBody.lines = validLines;
          requestBody.subtotal = subtotal;
          requestBody.taxRate = formData.taxRate;
          requestBody.taxAmount = taxAmount;
          requestBody.total = total;
        }
      } else {
        // ICONES Facture A
        const validLines = lines.filter(l => l.description && l.quantity > 0 && l.unitPrice > 0);
        requestBody.lines = validLines;
        requestBody.subtotal = subtotal;
        requestBody.taxRate = formData.taxRate;
        requestBody.taxAmount = taxAmount;
        requestBody.total = total;
      }

      const res = await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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

  // Obtenir le titre du template
  const getTemplateTitle = () => {
    if (invoiceType === 'icones_a') return 'ICONES - Facture A';
    if (invoiceType === 'icones_b') return 'ICONES - Facture B';
    if (invoiceType === 'allinone') {
      const templateInfo = ALLINONE_TEMPLATES[allinoneTemplate];
      return `ALL IN ONE - ${templateInfo?.label || allinoneTemplate}`;
    }
    return 'Facture';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0 bg-orange-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              Modifier la facture
            </h2>
            <p className="text-sm text-gray-500">{invoice.invoiceNumber} - {getTemplateTitle()}</p>
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
            
            {/* Project Info pour Facture B */}
            {invoiceType === 'icones_b' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du projet
                  </label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                    placeholder="Ex: Rénovation bureau..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description du projet
                  </label>
                  <input
                    type="text"
                    value={formData.projectDescription}
                    onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                    placeholder="Description du projet..."
                  />
                </div>
              </div>
            )}
            
            {/* Sections pour Facture B (ICONES) */}
            {invoiceType === 'icones_b' ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Sections
                  </label>
                  <button
                    type="button"
                    onClick={addSection}
                    className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une section
                  </button>
                </div>
                
                <div className="space-y-4">
                  {sections.map((section, sectionIndex) => (
                    <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* En-tête section */}
                      <div className="bg-gray-50 px-4 py-2 flex items-center gap-3">
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                          className="flex-1 px-3 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 bg-white text-gray-900 text-sm font-medium"
                          placeholder="Titre de la section (ex: Peinture, Menuiserie...)"
                        />
                        <button
                          type="button"
                          onClick={() => addLineToSection(sectionIndex)}
                          className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                          title="Ajouter une ligne"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        {sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSection(sectionIndex)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                            title="Supprimer la section"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      {/* Tableau des lignes */}
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                            <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-16">Qté</th>
                            <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-16">M²</th>
                            <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-16">Jour</th>
                            <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-12" title="Jour multiplie le prix">×</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-24">P.U.</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-24">Total</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.lines.map((line, lineIndex) => (
                            <tr key={line.id || lineIndex} className="border-t border-gray-100">
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={line.description}
                                  onChange={(e) => updateSectionLine(sectionIndex, lineIndex, 'description', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 text-sm bg-white text-gray-900"
                                  placeholder="Description"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={line.quantity || ''}
                                  onChange={(e) => updateSectionLine(sectionIndex, lineIndex, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 text-sm text-center bg-white text-gray-900"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.squareMeters || ''}
                                  onChange={(e) => updateSectionLine(sectionIndex, lineIndex, 'squareMeters', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 text-sm text-center bg-white text-gray-900"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={line.days || ''}
                                  onChange={(e) => updateSectionLine(sectionIndex, lineIndex, 'days', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 text-sm text-center bg-white text-gray-900"
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={line.daysImpactPrice !== false}
                                  onChange={(e) => updateSectionLine(sectionIndex, lineIndex, 'daysImpactPrice', e.target.checked)}
                                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                  title="Les jours multiplient le prix"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.unitPrice || ''}
                                  onChange={(e) => updateSectionLine(sectionIndex, lineIndex, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 text-sm text-right bg-white text-gray-900"
                                />
                              </td>
                              <td className="py-2 px-3 text-right text-sm font-medium text-gray-900">
                                {formatCurrency(calculateLineBTotal(line))}
                              </td>
                              <td className="py-2 px-1">
                                {section.lines.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeLineFromSection(sectionIndex, lineIndex)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-orange-50">
                          <tr>
                            <td colSpan={6} className="py-2 px-3 text-right text-sm font-medium text-gray-700">
                              Sous-total section:
                            </td>
                            <td className="py-2 px-3 text-right text-sm font-bold text-orange-600">
                              {formatCurrency(calculateSectionSubtotal(section))}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ))}
                </div>
                
                {/* Acomptes pour Facture B */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Acomptes (optionnel)</h4>
                  <div className="space-y-3">
                    {/* Acompte 1 */}
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={enableAcompte1}
                          onChange={(e) => setEnableAcompte1(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Acompte 1</span>
                      </label>
                      {enableAcompte1 && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={acompte1Percent}
                            onChange={(e) => setAcompte1Percent(parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-200 rounded text-sm bg-white text-gray-900"
                          />
                          <span className="text-sm text-gray-600">% = {formatCurrency(acompte1Value)}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Acompte 2 */}
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={enableAcompte2}
                          onChange={(e) => setEnableAcompte2(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Acompte 2</span>
                      </label>
                      {enableAcompte2 && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={acompte2Amount}
                            onChange={(e) => setAcompte2Amount(parseFloat(e.target.value) || 0)}
                            className="w-28 px-2 py-1 border border-gray-200 rounded text-sm bg-white text-gray-900"
                          />
                          <span className="text-sm text-gray-600">$</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Acompte 3 */}
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={enableAcompte3}
                          onChange={(e) => setEnableAcompte3(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Acompte 3</span>
                      </label>
                      {enableAcompte3 && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={acompte3Amount}
                            onChange={(e) => setAcompte3Amount(parseFloat(e.target.value) || 0)}
                            className="w-28 px-2 py-1 border border-gray-200 rounded text-sm bg-white text-gray-900"
                          />
                          <span className="text-sm text-gray-600">$</span>
                        </div>
                      )}
                    </div>
                    
                    {(enableAcompte1 || enableAcompte2 || enableAcompte3) && (
                      <div className="pt-2 border-t border-blue-200">
                        <span className="text-sm font-medium text-gray-700">Total payé: {formatCurrency(totalPaye)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : invoiceType === 'allinone' && (allinoneTemplate === 'placement' || allinoneTemplate === 'transfert') ? (
              /* Lignes pour Placement/Transfert ALL IN ONE */
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
                        <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-20">Effectif</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-20">Jours</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-32">Salaires Nets</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-32">Charges</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-32">Total</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, index) => (
                        <tr key={index} className="border-t border-gray-100">
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              value={line.quantity || ''}
                              onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 text-sm text-center bg-white text-gray-900"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={line.description || ''}
                              onChange={(e) => updateLine(index, 'description', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 text-sm text-center bg-white text-gray-900"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unitPrice || ''}
                              onChange={(e) => updateLine(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 text-sm text-right bg-white text-gray-900"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.chargesTTC || ''}
                              onChange={(e) => {
                                const newLines = [...lines];
                                (newLines[index] as any).chargesTTC = parseFloat(e.target.value) || 0;
                                setLines(newLines);
                              }}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 text-sm text-right bg-white text-gray-900"
                            />
                          </td>
                          <td className="py-2 px-3 text-right text-sm font-medium text-gray-900">
                            {formatCurrency(line.unitPrice + (line.chargesTTC || 0))}
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
                
                {/* Déduction pour Placement/Transfert */}
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={allinoneTemplate === 'placement' ? enablePlacementDeduction : enableTransfertDeduction}
                      onChange={(e) => {
                        if (allinoneTemplate === 'placement') {
                          setEnablePlacementDeduction(e.target.checked);
                        } else {
                          setEnableTransfertDeduction(e.target.checked);
                        }
                      }}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Activer Déduction</span>
                  </label>
                  {(allinoneTemplate === 'placement' ? enablePlacementDeduction : enableTransfertDeduction) && (
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-sm text-gray-600">Montant:</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={allinoneTemplate === 'placement' ? placementDeduction : transfertDeduction}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (allinoneTemplate === 'placement') {
                            setPlacementDeduction(val);
                          } else {
                            setTransfertDeduction(val);
                          }
                        }}
                        className="w-32 px-3 py-1 border border-gray-200 rounded text-sm bg-white text-gray-900"
                      />
                      <span className="text-sm text-gray-600">$</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Lignes standard pour Facture A et autres ALL IN ONE */
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
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-1/2">
                          {allinoneTemplate === 'recrutement' ? 'Poste' : 'Description'}
                        </th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-20">
                          {allinoneTemplate === 'recrutement' ? 'Effectif' : 'Qté'}
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-32">
                          {allinoneTemplate === 'recrutement' ? 'Salaire Net' : 'Prix unit.'}
                        </th>
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
                              placeholder={allinoneTemplate === 'recrutement' ? "Nom du poste" : "Description du produit ou service"}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={line.quantity || ''}
                              onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 text-sm text-center bg-white text-gray-900"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unitPrice || ''}
                              onChange={(e) => updateLine(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 text-sm text-right bg-white text-gray-900"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="py-2 px-3 text-right text-sm font-medium text-gray-900">
                            {formatCurrency((line.quantity || 1) * line.unitPrice)}
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
            )}
            
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
                
                {/* Taux de taxe - seulement pour types non-B */}
                {invoiceType !== 'icones_b' && allinoneTemplate !== 'placement' && allinoneTemplate !== 'transfert' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      TVA (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.taxRate}
                      onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                    />
                  </div>
                )}
                
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
                
                {invoiceType === 'icones_b' ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Général</span>
                      <span className="font-medium">{formatCurrency(totalGeneralB)}</span>
                    </div>
                    
                    {(enableAcompte1 || enableAcompte2 || enableAcompte3) && (
                      <>
                        <hr className="my-2" />
                        {enableAcompte1 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Acompte 1 ({acompte1Percent}%)</span>
                            <span className="font-medium text-blue-600">{formatCurrency(acompte1Value)}</span>
                          </div>
                        )}
                        {enableAcompte2 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Acompte 2</span>
                            <span className="font-medium text-blue-600">{formatCurrency(acompte2Value)}</span>
                          </div>
                        )}
                        {enableAcompte3 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Acompte 3</span>
                            <span className="font-medium text-blue-600">{formatCurrency(acompte3Value)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm pt-2 border-t">
                          <span className="font-medium text-gray-700">Total Payé</span>
                          <span className="font-bold text-green-600">{formatCurrency(totalPaye)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-900">Reste à payer</span>
                          <span className="text-xl font-bold text-orange-600">{formatCurrency(totalGeneralB - totalPaye)}</span>
                        </div>
                      </>
                    )}
                    
                    {!(enableAcompte1 || enableAcompte2 || enableAcompte3) && (
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-900">Total</span>
                        <span className="text-xl font-bold text-orange-600">{formatCurrency(totalGeneralB)}</span>
                      </div>
                    )}
                  </div>
                ) : (allinoneTemplate === 'placement' || allinoneTemplate === 'transfert') ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Rémunérations brutes</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    
                    {allinoneTemplate === 'transfert' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">TVA (16%)</span>
                        <span className="font-medium">{formatCurrency(subtotal * 0.16)}</span>
                      </div>
                    )}
                    
                    {(allinoneTemplate === 'placement' ? enablePlacementDeduction : enableTransfertDeduction) && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Déduction</span>
                        <span>-{formatCurrency(allinoneTemplate === 'placement' ? placementDeduction : transfertDeduction)}</span>
                      </div>
                    )}
                    
                    <hr className="my-2" />
                    
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Net à payer</span>
                      <span className="text-xl font-bold text-orange-600">
                        {formatCurrency(
                          allinoneTemplate === 'transfert' 
                            ? subtotal + (subtotal * 0.16) - (enableTransfertDeduction ? transfertDeduction : 0)
                            : subtotal - (enablePlacementDeduction ? placementDeduction : 0)
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sous-total</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    
                    {formData.taxRate > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Taxes ({formData.taxRate}%)</span>
                        <span className="font-medium">{formatCurrency(taxAmount)}</span>
                      </div>
                    )}
                    
                    <hr className="my-2" />
                    
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-orange-600">{formatCurrency(total)}</span>
                    </div>
                  </div>
                )}
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
