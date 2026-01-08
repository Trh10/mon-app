// Types pour le module de facturation

// Entreprises supportées
export type Company = 'icones' | 'allinone';

// Types de factures ICONES
export type IconesTemplate = 'facture_a' | 'facture_b' | 'proforma_a' | 'proforma_b';

// Types de factures ALL IN ONE
export type AllinoneTemplate = 'creation_entreprise' | 'creation_asbl' | 'recrutement' | 'placement' | 'transfert';

// Tous les templates
export type InvoiceTemplate = IconesTemplate | AllinoneTemplate;

// Catégories ICONES
export const INVOICE_CATEGORIES = {
  facture: { label: 'Facture', description: 'Facture définitive' },
  proforma: { label: 'Proforma', description: 'Facture pro forma' },
} as const;

// Templates ICONES
export const INVOICE_TEMPLATES = {
  facture_a: { 
    label: 'Modèle A', 
    description: 'Format simple',
    category: 'facture',
    company: 'icones',
    columns: ['N°', 'DESCRIPTION', 'QTÉ', 'PRIX UNIT.', 'TOTAL']
  },
  facture_b: { 
    label: 'Modèle B', 
    description: 'Format avec sections et frais',
    category: 'facture',
    company: 'icones',
    columns: ['DESCRIPTIONS', 'Qté', 'M²', 'Jour', 'Prix unitaire', 'Prix total']
  },
  proforma_a: { 
    label: 'Modèle A', 
    description: 'Format simple',
    category: 'proforma',
    company: 'icones',
    columns: ['N°', 'DESCRIPTION', 'QTÉ', 'PRIX UNIT.', 'TOTAL']
  },
  proforma_b: { 
    label: 'Modèle B', 
    description: 'Format avec sections et frais',
    category: 'proforma',
    company: 'icones',
    columns: ['DESCRIPTIONS', 'Qté', 'M²', 'Jour', 'Prix unitaire', 'Prix total']
  },
} as const;

// Templates ALL IN ONE
export const ALLINONE_TEMPLATES = {
  creation_entreprise: {
    id: 'creation_entreprise',
    code: 'C.E',
    label: 'Création d\'Entreprise',
    description: 'Frais administratifs, bancaires, suivi, honoraires',
    company: 'allinone',
    columns: ['N°', 'Description', 'Qté', 'P.U', 'P.T'],
    hasManagementFees: true,
    managementFeeRate: 10,
    hasTVA: false,
  },
  creation_asbl: {
    id: 'creation_asbl',
    code: 'C.As',
    label: 'Création ASBL',
    description: 'Création d\'associations sans but lucratif',
    company: 'allinone',
    columns: ['N°', 'Description', 'Qté', 'P.U', 'P.T'],
    hasManagementFees: true,
    managementFeeRate: 10,
    hasTVA: false,
  },
  recrutement: {
    id: 'recrutement',
    code: 'REC',
    label: 'Recrutement du Personnel',
    description: 'Postes, effectifs et salaires nets',
    company: 'allinone',
    columns: ['N°', 'Postes', 'Effectif', 'Salaire net'],
    hasManagementFees: false,
    hasTVA: true,
    tvaRate: 16,
  },
  placement: {
    id: 'placement',
    code: 'Plac',
    label: 'Placement du Personnel',
    description: 'Effectif, jours prestés, salaires et charges',
    company: 'allinone',
    columns: ['Effectif', 'Nbre de Jrs Prestés', 'Salaires Nets', 'Charges TTC', 'Rémunérations brutes'],
    hasManagementFees: false,
    hasTVA: false,
  },
  transfert: {
    id: 'transfert',
    code: 'Transf',
    label: 'Transfert du Personnel',
    description: 'Transfert d\'employés avec charges',
    company: 'allinone',
    columns: ['Effectif', 'Nbre de Jrs Prestés', 'Salaires Nets', 'Charges', 'Rémunérations brutes', 'TVA (16%)'],
    hasManagementFees: false,
    hasTVA: true,
    tvaRate: 16,
    hasDeduction: true,
  },
} as const;

// Informations bancaires ALL IN ONE
export const ALLINONE_BANK_ACCOUNTS = [
  { ville: 'KINSHASA', banque: 'RAWBANK SA', intitule: 'ALL IN ONE SAS', compte: '05101-01090698801-19', devise: 'USD' },
  { ville: 'KINSHASA', banque: 'EQUITYBCDC SA', intitule: 'ALL IN ONE SAS', compte: '23320018855446', devise: 'USD' },
  { ville: 'KINSHASA', banque: 'ADVANS CONGO', intitule: 'ALL IN ONE SAS', compte: '28001010011033000000', devise: 'USD' },
  { ville: 'KINSHASA', banque: 'BGFI BANK RDC', intitule: 'ALL IN ONE', compte: '40049592011', devise: 'USD', iban: 'CD48 0003 1261 0040 0495 9201 185', bic: 'BGFICDKI' },
  { ville: 'LUBUMBASHI', banque: 'RAWBANK SA', intitule: 'ALL IN ONE SAS', compte: '05130-00906988002-97', devise: 'USD' },
];

// Informations entreprise ALL IN ONE
export const ALLINONE_COMPANY_INFO = {
  name: 'ALL IN ONE SAS',
  address: 'Immeuble Crown Tower / 9e niveau local 904',
  street: '3098 avenue Batetela / Boulevard du 30 juin',
  city: 'Kinshasa - Gombe',
  idnat: '01-H4901-N33716N',
  rccm: 'CD/KNG/RCCM/22-B-03056',
  impot: 'A 2433361 P',
  phones: ['+243 824 057 241', '999 152 808'],
  email: 'contact@allinone-rdc.com',
  website: 'allinone-rdc.com',
};

export interface Client {
  id: string;
  companyName: string;           // Nom de l'entreprise cliente
  contactName: string;           // Nom du contact
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxNumber?: string;            // Numéro de taxe/TVA
  notes?: string;
  company: Company;              // Entreprise (icones ou allinone)
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;                 // quantity * unitPrice
  chargesTTC?: number;           // Pour Placement: Charges TTC ou HT
}

// Ligne pour Facture B ICONES (avec M² et Jour)
export interface InvoiceLineB {
  id: string;
  description: string;
  quantity?: number;             // Qté
  squareMeters?: number;         // M²
  days?: number;                 // Jour
  unitPrice: number;             // Prix unitaire
  total: number;                 // Prix total
}

// Ligne pour ALL IN ONE Recrutement
export interface RecruitmentLine {
  id: string;
  poste: string;                 // Nom du poste
  effectif: number;              // Nombre de personnes
  salaireNet: number;            // Salaire net
}

// Ligne pour ALL IN ONE Placement/Transfert
export interface PlacementLine {
  id: string;
  effectif: number;              // Nombre d'employés
  joursPrestes: number;          // Nombre de jours prestés
  salairesNets: number;          // Salaires nets
  chargesTTC: number;            // Charges TTC
  remunerationsBrutes: number;   // Rémunérations brutes (calculé)
}

// Section pour Facture B (ex: Branding, Aménagement, etc.)
export interface InvoiceSection {
  id: string;
  title: string;                 // Nom de la section (ex: "Branding")
  lines: InvoiceLineB[];
  subtotal: number;              // Sous-total de la section
}

// Historique des paiements
export interface Payment {
  id: string;
  amount: number;
  date: string;
  method: 'cash' | 'bank_transfer' | 'mobile_money' | 'check' | 'other';
  reference?: string;            // Référence du paiement
  notes?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;         // Numéro de facture (ex: FAC-2025-0001 ou N°012/C.E/Juil/25)
  template: InvoiceTemplate;     // Type de modèle de facture
  company: Company;              // Entreprise (icones ou allinone)
  clientId: string;
  client?: Client;               // Données client au moment de la facture
  
  // Champs spécifiques ALL IN ONE
  serviceType?: string;          // Type de service (ex: "Création d'Entreprise")
  
  // Dates
  issueDate: string;             // Date d'émission
  dueDate: string;               // Date d'échéance
  
  // Lignes de la facture (Facture A ICONES / Création Entreprise ALL IN ONE)
  lines: InvoiceLine[];
  
  // Lignes spécifiques ALL IN ONE
  recruitmentLines?: RecruitmentLine[];  // Pour Recrutement
  placementLines?: PlacementLine[];      // Pour Placement/Transfert
  
  // Options Placement du Personnel
  placementTVAEnabled?: boolean;  // TVA 16% sur charges activée
  chargesTTCMode?: boolean;       // true = Charges TTC, false = Charges (hors TVA)
  
  // Options Transfert du Personnel
  transfertDeduction?: number;    // Déduction pour absences & retards
  
  // Sections de la facture (Facture B ICONES)
  sections?: InvoiceSection[];
  
  // Champs spécifiques Facture B
  projectDescription?: string;   // Description du projet (ex: "Aménagement et Plan 3D")
  projectName?: string;          // Nom du projet (ex: "CONGRES PANAFRICAIN")
  
  // Montants
  subtotal: number;              // Sous-total avant taxes
  taxRate: number;               // Taux de taxe en % (ex: 14.975 pour TPS+TVQ)
  taxAmount: number;             // Montant des taxes
  total: number;                 // Total TTC
  
  // Statut
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  
  // Paiement
  paymentTerms?: string;         // Conditions de paiement
  paymentMethod?: string;        // Mode de paiement
  paidAt?: string;               // Date de paiement complet
  paidAmount?: number;           // Montant total payé
  remainingAmount?: number;      // Solde restant
  payments?: Payment[];          // Historique des paiements
  
  // Notes
  notes?: string;                // Notes internes
  publicNotes?: string;          // Notes visibles sur la facture
  
  // Champs spécifiques Proforma
  commissionRate?: number;       // Taux commission agence (ex: 17%)
  managementFeeRate?: number;    // Taux management fees (ex: 5%)
  
  // Métadonnées
  createdBy: string;             // ID de l'utilisateur créateur
  createdByInitials?: string;    // Initiales de l'utilisateur (ex: G-T pour Guylain Tshibamba)
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceFormData {
  clientId: string;
  issueDate: string;
  dueDate: string;
  lines: Omit<InvoiceLine, 'id' | 'total'>[];
  taxRate: number;
  paymentTerms?: string;
  notes?: string;
  publicNotes?: string;
}

// Statuts avec labels et couleurs
export const INVOICE_STATUSES = {
  draft: { label: 'Brouillon', color: 'bg-gray-500', textColor: 'text-gray-700' },
  sent: { label: 'Envoyée', color: 'bg-blue-500', textColor: 'text-blue-700' },
  partial: { label: 'En cours', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
  paid: { label: 'Soldée', color: 'bg-green-500', textColor: 'text-green-700' },
  overdue: { label: 'En retard', color: 'bg-red-500', textColor: 'text-red-700' },
  cancelled: { label: 'Annulée', color: 'bg-orange-500', textColor: 'text-orange-700' },
} as const;

// Méthodes de paiement
export const PAYMENT_METHODS = {
  cash: { label: 'Espèces', icon: '💵' },
  bank_transfer: { label: 'Virement bancaire', icon: '🏦' },
  mobile_money: { label: 'Mobile Money', icon: '📱' },
  check: { label: 'Chèque', icon: '📝' },
  other: { label: 'Autre', icon: '💳' },
} as const;

// Taux de taxes prédéfinis (Congo-Kinshasa)
export const TAX_RATES = [
  { id: 'none', label: 'Sans taxe (0%)', rate: 0 },
  { id: 'tva_16', label: 'TVA (16%)', rate: 16 },
  { id: 'custom', label: 'Personnalisé', rate: 0 },
] as const;

// Rôles autorisés pour le module facturation (mots-clés)
export const INVOICE_ALLOWED_KEYWORDS = [
  'DG', 'DIRECTEUR', 'DIRECTOR', 'GENERAL',
  'FINANCE', 'FINANCIER', 'COMPTABLE', 'COMPTABILITE', 'ACCOUNTING',
  'ADMINISTRATION', 'ADMIN', 'ADMINISTRATEUR',
  'MANAGER', 'GESTIONNAIRE', 'CEO', 'CFO', 'COO'
];

// Normaliser une chaîne en supprimant les accents
function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export function canAccessInvoices(userRole: string): boolean {
  if (!userRole) return false;
  
  const role = normalizeString(userRole);
  
  // Vérifier si le rôle contient un des mots-clés autorisés
  return INVOICE_ALLOWED_KEYWORDS.some(keyword => role.includes(keyword));
}

// Générer un numéro de facture avec initiales de l'utilisateur
// Format: FAC-XX/JJ/MM/AAAA/0001 (XX = initiales)
export function generateInvoiceNumber(lastNumber?: string, userInitials?: string): string {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  
  // Initiales par défaut si non fournies
  const initials = userInitials || 'XX';
  
  // Prefix avec initiales et date
  const datePrefix = `FAC-${initials}/${day}/${month}/${year}/`;
  
  // Trouver le prochain numéro
  // On cherche le dernier numéro de la même date (peu importe les initiales)
  const todayPrefix = `/${day}/${month}/${year}/`;
  
  let nextNum = 1;
  if (lastNumber && lastNumber.includes(todayPrefix)) {
    // Extraire le numéro séquentiel
    const parts = lastNumber.split('/');
    if (parts.length >= 5) {
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextNum = lastSeq + 1;
      }
    }
  }
  
  return `${datePrefix}${nextNum.toString().padStart(4, '0')}`;
}

// Générer un numéro de facture ALL IN ONE
// Format: N°XXX/CODE/Mois/Année (ex: N°012/C.E/Juil/25)
export function generateAllinoneInvoiceNumber(
  lastNumber: string | undefined,
  templateCode: string,
  sequenceNumber?: number
): string {
  const now = new Date();
  const monthNames = ['Janv', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear().toString().slice(-2);
  
  let nextNum = sequenceNumber || 1;
  
  // Si on a un dernier numéro, extraire le séquentiel
  if (lastNumber && !sequenceNumber) {
    const match = lastNumber.match(/N°(\d+)\//);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  
  return `N°${nextNum.toString().padStart(3, '0')}/${templateCode}/${month}/${year}`;
}

// Calculer les totaux d'une facture
export function calculateInvoiceTotals(lines: InvoiceLine[], taxRate: number) {
  const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// Convertir un nombre en lettres (pour ALL IN ONE)
export function numberToWords(num: number): string {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  
  if (num === 0) return 'zéro';
  if (num < 0) return 'moins ' + numberToWords(-num);
  
  let words = '';
  
  // Millions
  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    words += (millions === 1 ? 'un million' : numberToWords(millions) + ' millions') + ' ';
    num %= 1000000;
  }
  
  // Milliers
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    words += (thousands === 1 ? 'mille' : numberToWords(thousands) + ' mille') + ' ';
    num %= 1000;
  }
  
  // Centaines
  if (num >= 100) {
    const hundreds = Math.floor(num / 100);
    words += (hundreds === 1 ? 'cent' : units[hundreds] + ' cent') + ' ';
    num %= 100;
  }
  
  // Dizaines et unités
  if (num >= 10 && num < 20) {
    words += teens[num - 10];
  } else if (num >= 20) {
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    if (ten === 7 || ten === 9) {
      words += tens[ten] + '-' + (unit === 1 && ten === 7 ? 'et-onze' : teens[unit]);
    } else {
      words += tens[ten] + (unit === 1 && ten < 8 ? '-et-' : unit > 0 ? '-' : '') + (unit === 1 && ten < 8 ? 'un' : units[unit]);
    }
  } else if (num > 0) {
    words += units[num];
  }
  
  return words.trim();
}

// Formater le montant en lettres pour ALL IN ONE
export function formatAmountInWords(amount: number): string {
  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);
  
  let result = 'Dollars américains ' + numberToWords(dollars).charAt(0).toUpperCase() + numberToWords(dollars).slice(1);
  
  if (cents > 0) {
    result += ', ' + numberToWords(cents) + ' centimes';
  }
  
  return result + '.';
}
