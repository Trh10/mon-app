"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, FileText, Plus, Trash2, Loader2, Calculator, Save, Cloud, CloudOff } from 'lucide-react';
import { 
  Client, 
  INVOICE_TEMPLATES, 
  INVOICE_CATEGORIES, 
  InvoiceTemplate,
  Company,
  ALLINONE_TEMPLATES,
  AllinoneTemplate
} from '@/lib/invoices/invoice-types';

// Clé localStorage pour le brouillon
const DRAFT_STORAGE_KEY = 'invoice_draft';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedClientId?: string;
  userInitials?: string;
  company: Company;
}

interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
}

// Pour Facture B - Ligne avec M² et Jour
interface InvoiceLineB {
  id: string;
  description: string;
  quantity: number;
  squareMeters: number;
  days: number;
  unitPrice: number;
}

// Pour Facture B - Section
interface SectionB {
  id: string;
  title: string;
  lines: InvoiceLineB[];
}

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess, preselectedClientId, userInitials = '', company }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [nextNumber, setNextNumber] = useState('');
  
  // États pour le brouillon auto-sauvegardé
  const [draftSaved, setDraftSaved] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Pour ICONES: Catégorie sélectionnée (facture ou proforma)
  const [selectedCategory, setSelectedCategory] = useState<'facture' | 'proforma'>('facture');
  // Pour ICONES: Modèle sélectionné (a ou b)
  const [selectedModel, setSelectedModel] = useState<'a' | 'b'>('a');
  
  // Pour ALL IN ONE: Template sélectionné
  const [selectedAllinoneTemplate, setSelectedAllinoneTemplate] = useState<AllinoneTemplate>('creation_entreprise');
  
  // Options activables pour les frais
  const [enableTax, setEnableTax] = useState(false);
  const [enableCommission, setEnableCommission] = useState(true);
  const [enableManagementFee, setEnableManagementFee] = useState(true);
  
  // Pour Placement: Charges TTC ou Charges HT + TVA
  const [chargesTTCMode, setChargesTTCMode] = useState(true); // true = TTC, false = HT avec TVA possible
  const [enablePlacementTVA, setEnablePlacementTVA] = useState(false);
  
  // Pour Transfert: TVA toujours 16% et Déduction
  const [transfertDeduction, setTransfertDeduction] = useState(0);
  
  const [formData, setFormData] = useState({
    template: 'facture_a' as InvoiceTemplate,
    clientId: preselectedClientId || '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: 'Net 30 jours',
    publicNotes: '',
    taxRate: 16, // TVA par défaut
    commissionRate: 17,
    managementFeeRate: 5,
    projectDescription: '',
    projectName: '',
  });
  
  // Met à jour le template quand catégorie ou modèle change
  useEffect(() => {
    const newTemplate = `${selectedCategory}_${selectedModel}` as InvoiceTemplate;
    setFormData(prev => ({ ...prev, template: newTemplate }));
  }, [selectedCategory, selectedModel]);
  
  // Lignes pour Facture A
  const [lines, setLines] = useState<InvoiceLine[]>([
    { description: '', quantity: 0, unitPrice: 0 }
  ]);

  // Sections pour Facture B
  const [sections, setSections] = useState<SectionB[]>([
    { id: 'section-1', title: '', lines: [{ id: 'line-1', description: '', quantity: 0, squareMeters: 0, days: 0, unitPrice: 0 }] }
  ]);

  // === SYSTÈME DE BROUILLON AUTO-SAUVEGARDÉ ===
  
  // Fonction pour sauvegarder le brouillon
  const saveDraft = useCallback(() => {
    const draftData = {
      company,
      selectedCategory,
      selectedModel,
      selectedAllinoneTemplate,
      enableTax,
      enableCommission,
      enableManagementFee,
      formData,
      lines,
      sections,
      savedAt: new Date().toISOString(),
    };
    
    try {
      localStorage.setItem(`${DRAFT_STORAGE_KEY}_${company}`, JSON.stringify(draftData));
      setDraftSaved(true);
      setLastSaveTime(new Date());
      setHasDraft(true);
      
      // Réinitialiser l'indicateur après 2 secondes
      setTimeout(() => setDraftSaved(false), 2000);
    } catch (e) {
      console.error('Erreur sauvegarde brouillon:', e);
    }
  }, [company, selectedCategory, selectedModel, selectedAllinoneTemplate, enableTax, enableCommission, enableManagementFee, formData, lines, sections]);
  
  // Auto-sauvegarde avec debounce (sauvegarde 1 seconde après la dernière modification)
  useEffect(() => {
    if (!isOpen) return;
    
    // Vérifier s'il y a des données à sauvegarder
    const hasData = lines.some(l => l.description || l.quantity > 0 || l.unitPrice > 0) ||
                    sections.some(s => s.title || s.lines.some(l => l.description || l.unitPrice > 0)) ||
                    formData.clientId || formData.publicNotes || formData.projectDescription;
    
    if (!hasData) return;
    
    // Debounce: attendre 1 seconde après la dernière modification
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 1000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isOpen, formData, lines, sections, selectedCategory, selectedModel, selectedAllinoneTemplate, enableTax, enableCommission, enableManagementFee, saveDraft]);
  
  // Charger le brouillon à l'ouverture du modal
  const loadDraft = useCallback(() => {
    try {
      const savedDraft = localStorage.getItem(`${DRAFT_STORAGE_KEY}_${company}`);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        
        // Vérifier que le brouillon est pour la bonne entreprise
        if (draft.company === company) {
          setSelectedCategory(draft.selectedCategory || 'facture');
          setSelectedModel(draft.selectedModel || 'a');
          setSelectedAllinoneTemplate(draft.selectedAllinoneTemplate || 'creation_entreprise');
          setEnableTax(draft.enableTax ?? false);
          setEnableCommission(draft.enableCommission ?? true);
          setEnableManagementFee(draft.enableManagementFee ?? true);
          
          // Restaurer formData mais garder les dates fraîches si plus vieilles
          const savedDate = new Date(draft.savedAt);
          const today = new Date().toISOString().split('T')[0];
          setFormData({
            ...draft.formData,
            issueDate: draft.formData.issueDate < today ? today : draft.formData.issueDate,
            dueDate: draft.formData.dueDate < today 
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              : draft.formData.dueDate,
          });
          
          if (draft.lines && draft.lines.length > 0) {
            setLines(draft.lines);
          }
          if (draft.sections && draft.sections.length > 0) {
            setSections(draft.sections);
          }
          
          setHasDraft(true);
          setLastSaveTime(new Date(draft.savedAt));
          return true;
        }
      }
    } catch (e) {
      console.error('Erreur chargement brouillon:', e);
    }
    return false;
  }, [company]);
  
  // Supprimer le brouillon
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(`${DRAFT_STORAGE_KEY}_${company}`);
      setHasDraft(false);
      setLastSaveTime(null);
    } catch (e) {
      console.error('Erreur suppression brouillon:', e);
    }
  }, [company]);

  useEffect(() => {
    if (isOpen) {
      // Charger le brouillon existant si disponible
      loadDraft();
      fetchClients();
      fetchNextNumber();
    }
  }, [isOpen, company]);

  const fetchClients = async () => {
    try {
      const res = await fetch(`/api/invoices/clients?company=${company}`);
      const data = await res.json();
      if (data.success) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Erreur chargement clients:', error);
    }
  };

  const fetchNextNumber = async () => {
    try {
      const templateCode = company === 'allinone' 
        ? ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.code || 'C.E'
        : undefined;
      const url = company === 'allinone'
        ? `/api/invoices?nextNumber=true&company=${company}&templateCode=${templateCode}`
        : `/api/invoices?nextNumber=true&company=${company}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setNextNumber(data.nextNumber);
      }
    } catch (error) {
      console.error('Erreur chargement numéro:', error);
    }
  };

  const addLine = () => {
    setLines([...lines, { description: '', quantity: 0, unitPrice: 0 }]);
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

  // === Fonctions pour Facture B (sections) ===
  const addSection = () => {
    const newId = `section-${Date.now()}`;
    setSections([...sections, { 
      id: newId, 
      title: '', 
      lines: [{ id: `line-${Date.now()}`, description: '', quantity: 0, squareMeters: 0, days: 0, unitPrice: 0 }] 
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
      unitPrice: 0 
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

  const updateSectionLine = (sectionIndex: number, lineIndex: number, field: keyof InvoiceLineB, value: string | number) => {
    const newSections = [...sections];
    (newSections[sectionIndex].lines[lineIndex] as any)[field] = value;
    setSections(newSections);
  };

  // Calcul du total d'une ligne Facture B
  const calculateLineBTotal = (line: InvoiceLineB): number => {
    // Le total est calculé selon: (Qté ou 1) * (M² ou 1) * (Jour ou 1) * Prix unitaire
    const qty = line.quantity || 1;
    const m2 = line.squareMeters || 1;
    const days = line.days || 1;
    return qty * m2 * days * line.unitPrice;
  };

  // Calcul du sous-total d'une section
  const calculateSectionSubtotal = (section: SectionB): number => {
    return section.lines.reduce((sum, line) => sum + calculateLineBTotal(line), 0);
  };

  // Total hors taxe pour Facture B
  const subtotalB = sections.reduce((sum, section) => sum + calculateSectionSubtotal(section), 0);
  const managementFees = enableManagementFee ? subtotalB * (formData.managementFeeRate / 100) : 0;
  const commissionAgence = enableCommission ? subtotalB * (formData.commissionRate / 100) : 0;
  const totalB = subtotalB + managementFees + commissionAgence;

  // Calculs pour modèle A et ALL IN ONE
  // Pour Placement: Rémunérations brutes = Salaires Nets + Charges (+ TVA si applicable)
  const placementChargesHT = lines.reduce((sum, line) => sum + ((line as any).chargesTTC || 0), 0);
  const placementTVA = (!chargesTTCMode && enablePlacementTVA) ? placementChargesHT * 0.16 : 0;
  const subtotal = company === 'allinone' && selectedAllinoneTemplate === 'placement'
    ? lines.reduce((sum, line) => sum + line.unitPrice + ((line as any).chargesTTC || 0), 0) + placementTVA
    : lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
  const taxAmount = enableTax ? subtotal * (formData.taxRate / 100) : 0;
  const total = subtotal + taxAmount;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' $';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientId) {
      setError('Veuillez sélectionner un client');
      return;
    }
    
    // Validation selon l'entreprise et le modèle
    if (company === 'icones') {
      if (selectedModel === 'a') {
        const validLines = lines.filter(l => l.description && l.quantity > 0 && l.unitPrice > 0);
        if (validLines.length === 0) {
          setError('Ajoutez au moins une ligne avec description, quantité et prix');
          return;
        }
      } else {
        // Modèle B - vérifier qu'il y a au moins une section avec des lignes
        const hasValidSections = sections.some(s => 
          s.title && s.lines.some(l => l.description && l.unitPrice > 0)
        );
        if (!hasValidSections) {
          setError('Ajoutez au moins une section avec un titre et des lignes');
          return;
        }
      }
    } else {
      // ALL IN ONE - validation des lignes
      if (selectedAllinoneTemplate === 'placement') {
        // Placement: Effectif (quantity) > 0 et Salaires Nets (unitPrice) > 0
        const validLines = lines.filter(l => l.quantity > 0 && l.unitPrice > 0);
        if (validLines.length === 0) {
          setError('Ajoutez au moins une ligne avec effectif et salaires nets');
          return;
        }
      } else if (selectedAllinoneTemplate === 'transfert') {
        // Transfert: similaire à Placement
        const validLines = lines.filter(l => l.quantity > 0 && l.unitPrice > 0);
        if (validLines.length === 0) {
          setError('Ajoutez au moins une ligne avec effectif et salaires nets');
          return;
        }
      } else if (selectedAllinoneTemplate === 'recrutement') {
        // Recrutement: Postes (description) et Salaire net (unitPrice) > 0
        const validLines = lines.filter(l => l.description && l.unitPrice > 0);
        if (validLines.length === 0) {
          setError('Ajoutez au moins une ligne avec poste et salaire net');
          return;
        }
      } else {
        const validLines = lines.filter(l => l.description && l.quantity > 0 && l.unitPrice > 0);
        if (validLines.length === 0) {
          setError('Ajoutez au moins une ligne avec description, quantité et prix');
          return;
        }
      }
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Préparer les données
      const templateCode = company === 'allinone' 
        ? ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.code || 'C.E'
        : undefined;
        
      let requestBody: any = {
        template: company === 'icones' ? formData.template : selectedAllinoneTemplate,
        clientId: formData.clientId,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        paymentTerms: formData.paymentTerms,
        publicNotes: formData.publicNotes,
        status: 'draft',
        userInitials: userInitials,
        company: company,
        templateCode: templateCode, // Pour générer le numéro de facture ALL IN ONE
      };

      if (company === 'icones') {
        // ICONES
        if (selectedModel === 'a') {
          // Modèle A - format simple
          const validLines = lines.filter(l => l.description && l.quantity > 0 && l.unitPrice > 0);
          requestBody.lines = validLines;
          requestBody.taxRate = enableTax ? formData.taxRate : 0;
          requestBody.subtotal = subtotal;
          requestBody.taxAmount = taxAmount;
          requestBody.total = total;
        } else {
          // Modèle B - format avec sections
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
                  total: calculateLineBTotal(l),
                })),
              subtotal: calculateSectionSubtotal(s),
            }));
          
          requestBody.sections = validSections;
          requestBody.projectDescription = formData.projectDescription;
          requestBody.projectName = formData.projectName;
          requestBody.commissionRate = enableCommission ? formData.commissionRate : 0;
          requestBody.managementFeeRate = enableManagementFee ? formData.managementFeeRate : 0;
          requestBody.taxRate = 0;
          
          // Calculer les totaux
          requestBody.subtotal = subtotalB;
          requestBody.total = totalB;
        }
      } else {
        // ALL IN ONE - selon le template
        const templateInfo = ALLINONE_TEMPLATES[selectedAllinoneTemplate];
        
        // Filtrage selon le template
        let validLines;
        if (selectedAllinoneTemplate === 'placement') {
          // Placement: Effectif > 0 et Salaires Nets > 0 suffisent
          validLines = lines.filter(l => l.quantity > 0 && l.unitPrice > 0).map(l => ({
            ...l,
            description: l.description || '0', // Nbre de jours stocké dans description
            chargesTTC: (l as any).chargesTTC || 0
          }));
          
          // Ajouter info TVA pour Placement
          requestBody.placementTVAEnabled = !chargesTTCMode && enablePlacementTVA;
          requestBody.chargesTTCMode = chargesTTCMode;
        } else if (selectedAllinoneTemplate === 'transfert') {
          // Transfert: similaire à Placement mais avec TVA obligatoire et Déduction
          validLines = lines.filter(l => l.quantity > 0 && l.unitPrice > 0).map(l => ({
            ...l,
            description: l.description || '0', // Nbre de jours stocké dans description
            chargesTTC: (l as any).chargesTTC || 0
          }));
          
          // TVA 16% sur charges obligatoire pour Transfert
          requestBody.transfertDeduction = transfertDeduction;
          
          // Calculer totaux Transfert
          const totalSalaires = validLines.reduce((sum, l) => sum + l.unitPrice, 0);
          const totalCharges = validLines.reduce((sum, l) => sum + ((l as any).chargesTTC || 0), 0);
          const totalRemunerations = totalSalaires + totalCharges;
          const totalTVA = totalCharges * 0.16;
          const totalGeneral = totalRemunerations + totalTVA;
          const netAPayer = totalGeneral - transfertDeduction;
          
          requestBody.subtotal = totalRemunerations;
          requestBody.taxRate = 16;
          requestBody.taxAmount = totalTVA;
          requestBody.total = netAPayer;
        } else if (selectedAllinoneTemplate === 'recrutement') {
          // Recrutement: Postes (description) et Salaire net (unitPrice) > 0
          validLines = lines.filter(l => l.description && l.unitPrice > 0);
        } else {
          validLines = lines.filter(l => l.description && l.quantity > 0 && l.unitPrice > 0);
        }
        
        requestBody.lines = validLines;
        
        // Pour Transfert, on a déjà calculé les totaux
        if (selectedAllinoneTemplate !== 'transfert') {
          requestBody.subtotal = subtotal;
        }
        
        // Ajouter Management Fees si applicable ET activé (pas pour Placement/Transfert)
        if (selectedAllinoneTemplate !== 'placement' && selectedAllinoneTemplate !== 'transfert' && templateInfo?.hasManagementFees && enableManagementFee) {
          const mgmtFees = subtotal * ((templateInfo.managementFeeRate || 10) / 100);
          requestBody.managementFeeRate = templateInfo.managementFeeRate || 10;
          requestBody.total = subtotal + mgmtFees;
        } 
        // Ajouter TVA si applicable ET activée (pas pour Placement/Transfert)
        else if (selectedAllinoneTemplate !== 'placement' && selectedAllinoneTemplate !== 'transfert' && templateInfo?.hasTVA && enableTax) {
          const tva = subtotal * ((templateInfo.tvaRate || 16) / 100);
          requestBody.taxRate = templateInfo.tvaRate || 16;
          requestBody.taxAmount = tva;
          requestBody.total = subtotal + tva;
        } else if (selectedAllinoneTemplate !== 'transfert') {
          requestBody.total = subtotal;
          requestBody.managementFeeRate = 0; // Explicitement pas de frais
        }
      }

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      const data = await res.json();
      
      if (data.success) {
        onSuccess();
        resetForm();
      } else {
        setError(data.error || 'Erreur lors de la création');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory('facture');
    setSelectedModel('a');
    setSelectedAllinoneTemplate('creation_entreprise');
    setFormData({
      template: 'facture_a',
      clientId: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentTerms: 'Net 30 jours',
      publicNotes: '',
      taxRate: 16,
      commissionRate: 17,
      managementFeeRate: 5,
      projectDescription: '',
      projectName: '',
    });
    setEnableTax(false);
    setEnableCommission(true);
    setEnableManagementFee(true);
    setLines([{ description: '', quantity: 0, unitPrice: 0 }]);
    setSections([{ id: 'section-1', title: '', lines: [{ id: 'line-1', description: '', quantity: 0, squareMeters: 0, days: 0, unitPrice: 0 }] }]);
    setError('');
    // Supprimer le brouillon après création réussie
    clearDraft();
  };

  const handleClose = () => {
    // Ne pas effacer le brouillon à la fermeture - il reste sauvegardé !
    // resetForm(); // Commenté pour garder le brouillon
    onClose();
  };
  
  // Fonction pour effacer le brouillon manuellement et recommencer
  const handleClearDraft = () => {
    if (confirm('Voulez-vous vraiment effacer le brouillon et recommencer à zéro ?')) {
      clearDraft();
      // Reset uniquement les données, pas la fermeture
      setSelectedCategory('facture');
      setSelectedModel('a');
      setSelectedAllinoneTemplate('creation_entreprise');
      setFormData({
        template: 'facture_a',
        clientId: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paymentTerms: 'Net 30 jours',
        publicNotes: '',
        taxRate: 16,
        commissionRate: 17,
        managementFeeRate: 5,
        projectDescription: '',
        projectName: '',
      });
      setEnableTax(false);
      setEnableCommission(true);
      setEnableManagementFee(true);
      setLines([{ description: '', quantity: 0, unitPrice: 0 }]);
      setSections([{ id: 'section-1', title: '', lines: [{ id: 'line-1', description: '', quantity: 0, squareMeters: 0, days: 0, unitPrice: 0 }] }]);
      setError('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[98vh] sm:max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header - RESPONSIVE */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <span className="truncate">Nouvelle facture</span>
            </h2>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {nextNumber && (
                <p className="text-xs sm:text-sm text-gray-500 truncate">N°: {nextNumber}</p>
              )}
              {/* Indicateur de sauvegarde brouillon */}
              {hasDraft && (
                <div className="flex items-center gap-1">
                  {draftSaved ? (
                    <span className="text-xs text-green-600 flex items-center gap-1 animate-pulse">
                      <Cloud className="w-3 h-3" />
                      <span className="hidden sm:inline">Brouillon sauvegardé</span>
                      <span className="sm:hidden">Sauvé</span>
                    </span>
                  ) : lastSaveTime ? (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Cloud className="w-3 h-3" />
                      <span className="hidden sm:inline">Brouillon ({lastSaveTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})</span>
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Bouton pour effacer le brouillon */}
            {hasDraft && (
              <button 
                type="button"
                onClick={handleClearDraft}
                className="text-xs text-gray-500 hover:text-red-600 p-1.5 sm:px-2 sm:py-1 rounded hover:bg-red-50 transition-colors"
                title="Effacer le brouillon et recommencer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        {/* Notification brouillon restauré */}
        {hasDraft && lastSaveTime && (
          <div className="mx-3 sm:mx-4 mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs sm:text-sm text-blue-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              <span>
                Brouillon restauré du {lastSaveTime.toLocaleDateString('fr-FR')} à {lastSaveTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <button 
              type="button"
              onClick={handleClearDraft}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Recommencer à zéro
            </button>
          </div>
        )}
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          
          <div className="space-y-6">
            {/* === SÉLECTION DE TEMPLATES SELON L'ENTREPRISE === */}
            
            {/* Pour ICONES: Sélection Catégorie : Facture ou Proforma */}
            {company === 'icones' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de document *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('facture')}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        selectedCategory === 'facture'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">Facture</div>
                      <div className="text-xs text-gray-500 mt-1">Facture définitive</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('proforma')}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        selectedCategory === 'proforma'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">Proforma</div>
                      <div className="text-xs text-gray-500 mt-1">Facture pro forma</div>
                    </button>
                  </div>
                </div>

                {/* Sélection du modèle A ou B pour ICONES */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modèle *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedModel('a')}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        selectedModel === 'a'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">Modèle A</div>
                      <div className="text-xs text-gray-500 mt-1">Format simple</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedModel('b')}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        selectedModel === 'b'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">Modèle B</div>
                      <div className="text-xs text-gray-500 mt-1">Format avec sections et frais</div>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Pour ALL IN ONE: Sélection du type de facture */}
            {company === 'allinone' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de facture *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(ALLINONE_TEMPLATES).map(([key, template]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedAllinoneTemplate(key as AllinoneTemplate);
                        fetchNextNumber();
                      }}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        selectedAllinoneTemplate === key
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 text-sm">{template.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                      <div className="mt-2 text-xs font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                        Code: {template.code}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Client & Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client *
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                />
              </div>
            </div>
            
            {/* === MODÈLE A ICONES ou ALL IN ONE - Lignes simples === */}
            {((company === 'icones' && selectedModel === 'a') || company === 'allinone') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {company === 'allinone' 
                    ? `Lignes - ${ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.label || 'Facture'}`
                    : 'Lignes de facture'}
                </label>
                <button
                  type="button"
                  onClick={addLine}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une ligne
                </button>
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    {/* En-têtes selon le template */}
                    {company === 'allinone' && selectedAllinoneTemplate === 'recrutement' ? (
                      <tr>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-1/2">Postes</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-24">Effectif</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-32">Salaire net</th>
                        <th className="w-10"></th>
                      </tr>
                    ) : company === 'allinone' && selectedAllinoneTemplate === 'placement' ? (
                      <tr>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase w-20">Effectif</th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase w-24">Nbre Jrs</th>
                        <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase w-28">Salaires Nets</th>
                        <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase w-28 cursor-pointer hover:bg-gray-100" onClick={() => setChargesTTCMode(!chargesTTCMode)}>
                          {chargesTTCMode ? 'Charges TTC' : 'Charges'} 
                          <span className="text-[10px] ml-1">🔄</span>
                        </th>
                        <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase w-32">Rém. brutes</th>
                        <th className="w-10"></th>
                      </tr>
                    ) : company === 'allinone' && selectedAllinoneTemplate === 'transfert' ? (
                      <tr>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase w-16">Effectif</th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase w-20">Nbre Jrs</th>
                        <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase w-24">Salaires Nets</th>
                        <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase w-24">Charges</th>
                        <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase w-28">Rém. brutes</th>
                        <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase w-24">TVA (16%)</th>
                        <th className="w-10"></th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-1/2">Description</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-20">Qté</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-32">
                          {company === 'allinone' ? 'P.U' : 'Prix unit.'}
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-32">
                          {company === 'allinone' ? 'P.T' : 'Total'}
                        </th>
                        <th className="w-10"></th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={index} className="border-t border-gray-100">
                        {/* PLACEMENT: 5 colonnes spécifiques */}
                        {company === 'allinone' && selectedAllinoneTemplate === 'placement' ? (
                          <>
                            {/* Effectif */}
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={line.quantity || ''}
                                onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-sm text-center bg-white text-gray-900"
                                placeholder="37"
                              />
                            </td>
                            {/* Nbre de Jrs Prestés - stocké dans description */}
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={parseInt(line.description) || ''}
                                onChange={(e) => updateLine(index, 'description', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-sm text-center bg-white text-gray-900"
                                placeholder="26"
                              />
                            </td>
                            {/* Salaires Nets */}
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitPrice || ''}
                                onChange={(e) => updateLine(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-sm text-right bg-white text-gray-900"
                                placeholder="15800.00"
                              />
                            </td>
                            {/* Charges TTC - stocké via calcul custom */}
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={(line as any).chargesTTC || ''}
                                onChange={(e) => {
                                  const newLines = [...lines];
                                  (newLines[index] as any).chargesTTC = parseFloat(e.target.value) || 0;
                                  setLines(newLines);
                                }}
                                className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-sm text-right bg-white text-gray-900"
                                placeholder="7700.00"
                              />
                            </td>
                            {/* Rémunérations brutes (calculé) */}
                            <td className="py-2 px-2 text-right text-sm font-medium text-gray-900">
                              {formatCurrency(line.unitPrice + ((line as any).chargesTTC || 0))} $
                            </td>
                            <td className="py-2 px-2">
                              <button
                                type="button"
                                onClick={() => removeLine(index)}
                                className="p-1 text-gray-400 hover:text-red-500"
                                disabled={lines.length === 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </>
                        ) : company === 'allinone' && selectedAllinoneTemplate === 'transfert' ? (
                          <>
                            {/* TRANSFERT: 6 colonnes - Effectif, Nbre Jrs, Salaires Nets, Charges, Rém brutes, TVA */}
                            {/* Effectif */}
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={line.quantity || ''}
                                onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-sm text-center bg-white text-gray-900"
                                placeholder="13"
                              />
                            </td>
                            {/* Nbre de Jrs Prestés */}
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={parseInt(line.description) || ''}
                                onChange={(e) => updateLine(index, 'description', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-sm text-center bg-white text-gray-900"
                                placeholder="26"
                              />
                            </td>
                            {/* Salaires Nets */}
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitPrice || ''}
                                onChange={(e) => updateLine(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-sm text-right bg-white text-gray-900"
                                placeholder="7000.00"
                              />
                            </td>
                            {/* Charges */}
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={(line as any).chargesTTC || ''}
                                onChange={(e) => {
                                  const newLines = [...lines];
                                  (newLines[index] as any).chargesTTC = parseFloat(e.target.value) || 0;
                                  setLines(newLines);
                                }}
                                className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-sm text-right bg-white text-gray-900"
                                placeholder="2836.64"
                              />
                            </td>
                            {/* Rémunérations brutes (calculé) */}
                            <td className="py-2 px-2 text-right text-sm font-medium text-gray-900">
                              {formatCurrency(line.unitPrice + ((line as any).chargesTTC || 0))} $
                            </td>
                            {/* TVA 16% (calculé sur charges) */}
                            <td className="py-2 px-2 text-right text-sm font-medium text-gray-900">
                              {formatCurrency(((line as any).chargesTTC || 0) * 0.16)} $
                            </td>
                            <td className="py-2 px-2">
                              <button
                                type="button"
                                onClick={() => removeLine(index)}
                                className="p-1 text-gray-400 hover:text-red-500"
                                disabled={lines.length === 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => updateLine(index, 'description', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-sm bg-white text-gray-900"
                            placeholder={company === 'allinone' && selectedAllinoneTemplate === 'recrutement' 
                              ? "Nom du poste" 
                              : "Description du produit ou service"}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={line.quantity || ''}
                            onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-sm text-center bg-white text-gray-900"
                            placeholder={company === 'allinone' && selectedAllinoneTemplate === 'recrutement' ? "1" : ""}
                          />
                        </td>
                        {/* Pour Recrutement: pas de colonne P.T, seulement Salaire net */}
                        {company === 'allinone' && selectedAllinoneTemplate === 'recrutement' ? (
                          <>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitPrice || ''}
                                onChange={(e) => updateLine(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-sm text-right bg-white text-gray-900"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <button
                                type="button"
                                onClick={() => removeLine(index)}
                                className="p-1 text-gray-400 hover:text-red-500"
                                disabled={lines.length === 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitPrice || ''}
                                onChange={(e) => updateLine(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 text-sm text-right bg-white text-gray-900"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="py-2 px-3 text-right text-sm font-medium text-gray-900">
                              {formatCurrency(line.quantity * line.unitPrice)} $
                            </td>
                            <td className="py-2 px-3">
                              <button
                                type="button"
                                onClick={() => removeLine(index)}
                                className="p-1 text-gray-400 hover:text-red-500"
                                disabled={lines.length === 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </>
                        )}
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Option TVA pour modèle A ICONES */}
              {company === 'icones' && (
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableTax"
                    checked={enableTax}
                    onChange={(e) => setEnableTax(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="enableTax" className="text-sm font-medium text-gray-700 flex-1">
                    Appliquer la TVA
                  </label>
                  {enableTax && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.taxRate}
                        onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white text-gray-900"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Info frais pour ALL IN ONE avec toggle */}
              {company === 'allinone' && (
              <div className="bg-purple-50 rounded-lg p-4 mt-4">
                {/* Option spéciale pour Placement */}
                {selectedAllinoneTemplate === 'placement' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Calculator className="w-4 h-4 text-purple-600" />
                        <span className="text-gray-700">
                          Mode Charges: <strong>{chargesTTCMode ? 'TTC (TVA incluse)' : 'Hors TVA'}</strong>
                        </span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={chargesTTCMode}
                          onChange={(e) => {
                            setChargesTTCMode(e.target.checked);
                            if (e.target.checked) setEnablePlacementTVA(false);
                          }}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-600">TTC</span>
                      </label>
                    </div>
                    {!chargesTTCMode && (
                      <div className="flex items-center justify-between pl-6 border-l-2 border-purple-300">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-700">
                            Appliquer TVA: <strong>16%</strong> sur les charges
                          </span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enablePlacementTVA}
                            onChange={(e) => setEnablePlacementTVA(e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-600">Activer</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Option spéciale pour Transfert - Déduction */}
                {selectedAllinoneTemplate === 'transfert' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calculator className="w-4 h-4 text-purple-600" />
                      <span className="text-gray-700">
                        TVA: <strong>16%</strong> sur les charges (appliquée automatiquement)
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-purple-200">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-700">Déduction pour absences & retards:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={transfertDeduction || ''}
                          onChange={(e) => setTransfertDeduction(parseFloat(e.target.value) || 0)}
                          className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right bg-white text-gray-900"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedAllinoneTemplate !== 'placement' && selectedAllinoneTemplate !== 'transfert' && ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.hasManagementFees && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Calculator className="w-4 h-4 text-purple-600" />
                      <span className="text-gray-700">
                        Management Fees: <strong>{ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.managementFeeRate || 10}%</strong>
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableManagementFee}
                        onChange={(e) => setEnableManagementFee(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-600">Activer</span>
                    </label>
                  </div>
                )}
                {selectedAllinoneTemplate !== 'placement' && selectedAllinoneTemplate !== 'transfert' && ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.hasTVA && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Calculator className="w-4 h-4 text-purple-600" />
                      <span className="text-gray-700">
                        TVA: <strong>{ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.tvaRate || 16}%</strong>
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableTax}
                        onChange={(e) => setEnableTax(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-600">Activer</span>
                    </label>
                  </div>
                )}
                {selectedAllinoneTemplate !== 'placement' && selectedAllinoneTemplate !== 'transfert' &&
                 !ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.hasManagementFees && 
                 !ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.hasTVA && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calculator className="w-4 h-4" />
                    <span>Pas de frais supplémentaires pour ce type de facture</span>
                  </div>
                )}
              </div>
              )}
            </div>
            )}

            {/* === MODÈLE B ICONES - Sections avec lignes === */}
            {company === 'icones' && selectedModel === 'b' && (
            <div className="space-y-4">
              {/* Informations du projet */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du projet
                  </label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    placeholder="Ex: CONGRES PANAFRICAIN"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    placeholder="Ex: Aménagement et Plan 3D"
                  />
                </div>
              </div>

              {/* Sections */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Sections de la facture
                  </label>
                  <button
                    type="button"
                    onClick={addSection}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une section
                  </button>
                </div>

                <div className="space-y-4">
                  {sections.map((section, sectionIndex) => (
                    <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* En-tête de section */}
                      <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                          className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-sm font-semibold text-gray-900"
                          placeholder="Nom de la section (ex: Branding, Aménagement...)"
                        />
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            type="button"
                            onClick={() => addLineToSection(sectionIndex)}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            + Ligne
                          </button>
                          {sections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSection(sectionIndex)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Tableau des lignes */}
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-2 px-2 text-xs text-gray-500 uppercase">Description</th>
                            <th className="text-center py-2 px-1 text-xs text-gray-500 uppercase w-16">Qté</th>
                            <th className="text-center py-2 px-1 text-xs text-gray-500 uppercase w-16">M²</th>
                            <th className="text-center py-2 px-1 text-xs text-gray-500 uppercase w-16">Jour</th>
                            <th className="text-right py-2 px-2 text-xs text-gray-500 uppercase w-24">P.U</th>
                            <th className="text-right py-2 px-2 text-xs text-gray-500 uppercase w-24">P.T</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.lines.map((line, lineIndex) => (
                            <tr key={line.id} className="border-t border-gray-100">
                              <td className="py-1 px-2">
                                <input
                                  type="text"
                                  value={line.description}
                                  onChange={(e) => updateSectionLine(sectionIndex, lineIndex, 'description', e.target.value)}
                                  className="w-full px-1 py-1 border border-gray-200 rounded text-xs bg-white text-gray-900"
                                  placeholder="Description"
                                />
                              </td>
                              <td className="py-1 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={line.quantity || ''}
                                  onChange={(e) => updateSectionLine(sectionIndex, lineIndex, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border border-gray-200 rounded text-xs text-center bg-white text-gray-900"
                                />
                              </td>
                              <td className="py-1 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={line.squareMeters || ''}
                                  onChange={(e) => updateSectionLine(sectionIndex, lineIndex, 'squareMeters', parseFloat(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border border-gray-200 rounded text-xs text-center bg-white text-gray-900"
                                />
                              </td>
                              <td className="py-1 px-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={line.days || ''}
                                  onChange={(e) => updateSectionLine(sectionIndex, lineIndex, 'days', parseFloat(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border border-gray-200 rounded text-xs text-center bg-white text-gray-900"
                                />
                              </td>
                              <td className="py-1 px-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.unitPrice || ''}
                                  onChange={(e) => updateSectionLine(sectionIndex, lineIndex, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border border-gray-200 rounded text-xs text-right bg-white text-gray-900"
                                />
                              </td>
                              <td className="py-1 px-2 text-right text-xs font-medium text-gray-900">
                                {formatCurrency(calculateLineBTotal(line))}
                              </td>
                              <td className="py-1 px-1">
                                {section.lines.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeLineFromSection(sectionIndex, lineIndex)}
                                    className="p-1 text-red-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={5} className="py-2 px-2 text-right text-xs font-semibold text-gray-600">
                              Sous-total {section.title || 'section'}
                            </td>
                            <td className="py-2 px-2 text-right text-sm font-bold text-gray-900">
                              {formatCurrency(calculateSectionSubtotal(section))}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ))}
                </div>
              </div>

              {/* Frais supplémentaires Facture B - avec checkboxes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Frais additionnels (optionnels)</h4>
                
                {/* Management Fees */}
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="enableManagementFee"
                    checked={enableManagementFee}
                    onChange={(e) => setEnableManagementFee(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="enableManagementFee" className="text-sm text-gray-700 flex-1">
                    Management fees
                  </label>
                  {enableManagementFee && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.managementFeeRate}
                        onChange={(e) => setFormData({ ...formData, managementFeeRate: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white text-gray-900"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  )}
                </div>
                
                {/* Commission Agence */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableCommission"
                    checked={enableCommission}
                    onChange={(e) => setEnableCommission(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="enableCommission" className="text-sm text-gray-700 flex-1">
                    Commission Agence
                  </label>
                  {enableCommission && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.commissionRate}
                        onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center bg-white text-gray-900"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
            
            {/* Conditions & Totaux */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Conditions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conditions de paiement
                  </label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    rows={3}
                    placeholder="Notes additionnelles..."
                  />
                </div>
              </div>
              
              {/* Récapitulatif */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Récapitulatif
                </h3>
                
                {/* Récap ICONES Modèle A */}
                {company === 'icones' && selectedModel === 'a' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sous-total</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  
                  {enableTax && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">TVA ({formData.taxRate}%)</span>
                      <span className="font-medium">{formatCurrency(taxAmount)}</span>
                    </div>
                  )}
                  
                  <hr className="my-2" />
                  
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">TOTAL GÉNÉRAL</span>
                    <span className="text-xl font-bold text-blue-600">{formatCurrency(total)}</span>
                  </div>
                </div>
                )}

                {/* Récap ICONES Modèle B */}
                {company === 'icones' && selectedModel === 'b' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Hors Taxe</span>
                    <span className="font-medium">{formatCurrency(subtotalB)}</span>
                  </div>
                  
                  {(enableManagementFee || enableCommission) && (
                    <>
                      <hr className="my-2" />
                      <div className="text-xs text-gray-500 mb-1">AUTRES FRAIS</div>
                      
                      {enableManagementFee && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Management fees {formData.managementFeeRate}%</span>
                          <span className="font-medium">{formatCurrency(managementFees)}</span>
                        </div>
                      )}
                      
                      {enableCommission && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Commission Agence {formData.commissionRate}%</span>
                          <span className="font-medium">{formatCurrency(commissionAgence)}</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  <hr className="my-2" />
                  
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">TOTAL GÉNÉRAL</span>
                    <span className="text-xl font-bold text-blue-600">{formatCurrency(totalB)}</span>
                  </div>
                </div>
                )}

                {/* Récap ALL IN ONE */}
                {company === 'allinone' && (
                <div className="space-y-2">
                  {/* Récap spécifique pour Placement */}
                  {selectedAllinoneTemplate === 'placement' ? (
                    (() => {
                      const salairesNets = lines.reduce((sum, l) => sum + (l.unitPrice || 0), 0);
                      const chargesHT = lines.reduce((sum, l) => sum + ((l as any).chargesTTC || 0), 0);
                      const tvaOnCharges = !chargesTTCMode && enablePlacementTVA ? chargesHT * 0.16 : 0;
                      const chargesFinal = chargesHT + tvaOnCharges;
                      const remunerationsBrutes = salairesNets + chargesFinal;
                      
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Salaires Nets</span>
                            <span className="font-medium">{formatCurrency(salairesNets)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{chargesTTCMode ? 'Charges TTC' : 'Charges'}</span>
                            <span className="font-medium">{formatCurrency(chargesHT)}</span>
                          </div>
                          {!chargesTTCMode && enablePlacementTVA && (
                            <div className="flex justify-between text-sm text-purple-600">
                              <span>TVA 16% sur charges</span>
                              <span className="font-medium">{formatCurrency(tvaOnCharges)}</span>
                            </div>
                          )}
                          <hr className="my-2" />
                          <div className="flex justify-between">
                            <span className="font-semibold text-gray-900">RÉMUNÉRATIONS BRUTES</span>
                            <span className="text-xl font-bold text-purple-600">{formatCurrency(remunerationsBrutes)}</span>
                          </div>
                        </>
                      );
                    })()
                  ) : selectedAllinoneTemplate === 'transfert' ? (
                    (() => {
                      const salairesNets = lines.reduce((sum, l) => sum + (l.unitPrice || 0), 0);
                      const charges = lines.reduce((sum, l) => sum + ((l as any).chargesTTC || 0), 0);
                      const remunerationsBrutes = salairesNets + charges;
                      const tva16 = charges * 0.16;
                      const totalGeneral = remunerationsBrutes + tva16;
                      const netAPayer = totalGeneral - transfertDeduction;
                      
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Salaires Nets</span>
                            <span className="font-medium">{formatCurrency(salairesNets)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Charges</span>
                            <span className="font-medium">{formatCurrency(charges)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Rémunérations brutes</span>
                            <span className="font-medium">{formatCurrency(remunerationsBrutes)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-purple-600">
                            <span>TVA 16%</span>
                            <span className="font-medium">{formatCurrency(tva16)}</span>
                          </div>
                          <hr className="my-2" />
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold text-gray-700">TOTAL GÉNÉRAL</span>
                            <span className="font-bold">{formatCurrency(totalGeneral)}</span>
                          </div>
                          {transfertDeduction > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span>Déduction absences & retards</span>
                              <span className="font-medium">- {formatCurrency(transfertDeduction)}</span>
                            </div>
                          )}
                          <hr className="my-2" />
                          <div className="flex justify-between">
                            <span className="font-semibold text-gray-900">NET À PAYER</span>
                            <span className="text-xl font-bold text-purple-600">{formatCurrency(netAPayer)}</span>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sous-total</span>
                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                      </div>
                      
                      {ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.hasManagementFees && enableManagementFee && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            Management Fees ({ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.managementFeeRate || 10}%)
                          </span>
                          <span className="font-medium">
                            {formatCurrency(subtotal * ((ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.managementFeeRate || 10) / 100))}
                          </span>
                        </div>
                      )}
                      
                      {ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.hasTVA && enableTax && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            TVA ({ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.tvaRate || 16}%)
                          </span>
                          <span className="font-medium">
                            {formatCurrency(subtotal * ((ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.tvaRate || 16) / 100))}
                          </span>
                        </div>
                      )}
                      
                      <hr className="my-2" />
                      
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-900">TOTAL GÉNÉRAL</span>
                        <span className="text-xl font-bold text-purple-600">
                          {formatCurrency(
                            (ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.hasManagementFees && enableManagementFee)
                              ? subtotal * (1 + (ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.managementFeeRate || 10) / 100)
                              : (ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.hasTVA && enableTax)
                                ? subtotal * (1 + (ALLINONE_TEMPLATES[selectedAllinoneTemplate]?.tvaRate || 16) / 100)
                                : subtotal
                          )}
                        </span>
                      </div>
                    </>
                  )}
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
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Créer la facture
          </button>
        </div>
      </div>
    </div>
  );
}
