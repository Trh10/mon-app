import { create } from "zustand";

type Density = "compact" | "dense" | "ultra";

// Labels/Étiquettes pour les emails
export type EmailLabel = {
  id: string;
  name: string;
  color: string;
};

// Signatures multiples
export type EmailSignature = {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
};

// Réponses rapides
export type QuickReply = {
  id: string;
  title: string;
  content: string;
  shortcut?: string;
};

// Email programmé
export type ScheduledEmail = {
  id: string;
  to: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  attachments?: string[];
};

type UIState = {
  selectedEmailId?: string | null;
  setSelectedEmailId?: (id: string | null) => void;

  density: Density;
  setDensity?: (d: Density) => void;

  // Mode Focus/Zen
  focusMode: boolean;
  setFocusMode: (enabled: boolean) => void;
  toggleFocusMode: () => void;

  // Mode plein écran immersif
  immersiveMode: boolean;
  setImmersiveMode: (enabled: boolean) => void;
  toggleImmersiveMode: () => void;

  // Mode Gestion (masque les emails pour se concentrer sur la gestion)
  managementMode: boolean;
  setManagementMode: (enabled: boolean) => void;
  toggleManagementMode: () => void;

  // Indicateur de progression
  isLoading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;
  setLoadingProgress: (progress: number) => void;

  // Recherche avancée
  searchQuery: string;
  searchFilters: {
    from?: string;
    to?: string;
    subject?: string;
    hasAttachment?: boolean;
    dateFrom?: string;
    dateTo?: string;
    labels?: string[];
  };
  setSearchQuery: (query: string) => void;
  setSearchFilters: (filters: UIState['searchFilters']) => void;
  clearSearch: () => void;

  // Labels/Étiquettes
  labels: EmailLabel[];
  emailLabels: Record<string, string[]>; // emailId -> labelIds
  addLabel: (label: Omit<EmailLabel, 'id'>) => void;
  removeLabel: (labelId: string) => void;
  updateLabel: (labelId: string, updates: Partial<EmailLabel>) => void;
  assignLabelToEmail: (emailId: string, labelId: string) => void;
  removeLabelFromEmail: (emailId: string, labelId: string) => void;

  // Signatures multiples
  signatures: EmailSignature[];
  activeSignatureId: string | null;
  addSignature: (signature: Omit<EmailSignature, 'id'>) => void;
  removeSignature: (signatureId: string) => void;
  updateSignature: (signatureId: string, updates: Partial<EmailSignature>) => void;
  setActiveSignature: (signatureId: string | null) => void;

  // Réponses rapides
  quickReplies: QuickReply[];
  addQuickReply: (reply: Omit<QuickReply, 'id'>) => void;
  removeQuickReply: (replyId: string) => void;
  updateQuickReply: (replyId: string, updates: Partial<QuickReply>) => void;

  // Planification d'envoi
  scheduledEmails: ScheduledEmail[];
  addScheduledEmail: (email: Omit<ScheduledEmail, 'id'>) => void;
  removeScheduledEmail: (emailId: string) => void;
  updateScheduledEmail: (emailId: string, updates: Partial<ScheduledEmail>) => void;
};

function loadDensity(): Density {
  if (typeof localStorage === "undefined") return "dense";
  const v = localStorage.getItem("ui_density");
  if (v === "compact" || v === "dense" || v === "ultra") return v;
  return "dense";
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof localStorage === "undefined") return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const generateId = () => Math.random().toString(36).substring(2, 9);

// Labels par défaut
const defaultLabels: EmailLabel[] = [
  { id: 'important', name: 'Important', color: '#ef4444' },
  { id: 'travail', name: 'Travail', color: '#3b82f6' },
  { id: 'personnel', name: 'Personnel', color: '#22c55e' },
  { id: 'urgent', name: 'Urgent', color: '#f97316' },
  { id: 'attente', name: 'En attente', color: '#eab308' },
];

// Signature par défaut
const defaultSignatures: EmailSignature[] = [
  {
    id: 'default',
    name: 'Signature principale',
    content: '\n\nCordialement,\n[Votre nom]',
    isDefault: true,
  },
];

// Réponses rapides par défaut
const defaultQuickReplies: QuickReply[] = [
  {
    id: 'merci',
    title: 'Remerciement',
    content: 'Merci pour votre message. Je reviens vers vous rapidement.',
    shortcut: 'Alt+1',
  },
  {
    id: 'recu',
    title: 'Accusé de réception',
    content: 'Bien reçu, merci. Je traite votre demande dans les plus brefs délais.',
    shortcut: 'Alt+2',
  },
  {
    id: 'absent',
    title: 'Absence',
    content: 'Je suis actuellement absent(e) et reviendrai vers vous dès mon retour.',
    shortcut: 'Alt+3',
  },
];

export const useUI = create<UIState>((set, get) => ({
  selectedEmailId: null,
  setSelectedEmailId: (id) => set({ selectedEmailId: id }),

  density: loadDensity(),
  setDensity: (d) => {
    try { localStorage.setItem("ui_density", d); } catch {}
    set({ density: d });
  },

  // Mode Focus/Zen
  focusMode: loadFromStorage('ui_focus_mode', false),
  setFocusMode: (enabled) => {
    saveToStorage('ui_focus_mode', enabled);
    set({ focusMode: enabled });
  },
  toggleFocusMode: () => {
    const newValue = !get().focusMode;
    saveToStorage('ui_focus_mode', newValue);
    set({ focusMode: newValue });
  },

  // Mode plein écran immersif
  immersiveMode: false,
  setImmersiveMode: (enabled) => set({ immersiveMode: enabled }),
  toggleImmersiveMode: () => {
    const newValue = !get().immersiveMode;
    set({ immersiveMode: newValue });
    // Toggle fullscreen browser API
    if (typeof document !== 'undefined') {
      if (newValue && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (!newValue && document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  },

  // Mode Gestion (masque les emails pour se concentrer sur la gestion)
  managementMode: loadFromStorage('ui_management_mode', false),
  setManagementMode: (enabled) => {
    saveToStorage('ui_management_mode', enabled);
    set({ managementMode: enabled });
  },
  toggleManagementMode: () => {
    const newValue = !get().managementMode;
    saveToStorage('ui_management_mode', newValue);
    set({ managementMode: newValue });
  },

  // Indicateur de progression
  isLoading: false,
  loadingProgress: 0,
  loadingMessage: '',
  setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message, loadingProgress: loading ? 0 : 100 }),
  setLoadingProgress: (progress) => set({ loadingProgress: progress }),

  // Recherche avancée
  searchQuery: '',
  searchFilters: {},
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchFilters: (filters) => set({ searchFilters: filters }),
  clearSearch: () => set({ searchQuery: '', searchFilters: {} }),

  // Labels/Étiquettes
  labels: loadFromStorage('ui_labels', defaultLabels),
  emailLabels: loadFromStorage('ui_email_labels', {}),
  addLabel: (label) => {
    const newLabel = { ...label, id: generateId() };
    const labels = [...get().labels, newLabel];
    saveToStorage('ui_labels', labels);
    set({ labels });
  },
  removeLabel: (labelId) => {
    const labels = get().labels.filter(l => l.id !== labelId);
    saveToStorage('ui_labels', labels);
    set({ labels });
  },
  updateLabel: (labelId, updates) => {
    const labels = get().labels.map(l => l.id === labelId ? { ...l, ...updates } : l);
    saveToStorage('ui_labels', labels);
    set({ labels });
  },
  assignLabelToEmail: (emailId, labelId) => {
    const emailLabels = { ...get().emailLabels };
    if (!emailLabels[emailId]) emailLabels[emailId] = [];
    if (!emailLabels[emailId].includes(labelId)) {
      emailLabels[emailId] = [...emailLabels[emailId], labelId];
      saveToStorage('ui_email_labels', emailLabels);
      set({ emailLabels });
    }
  },
  removeLabelFromEmail: (emailId, labelId) => {
    const emailLabels = { ...get().emailLabels };
    if (emailLabels[emailId]) {
      emailLabels[emailId] = emailLabels[emailId].filter(id => id !== labelId);
      saveToStorage('ui_email_labels', emailLabels);
      set({ emailLabels });
    }
  },

  // Signatures multiples
  signatures: loadFromStorage('ui_signatures', defaultSignatures),
  activeSignatureId: loadFromStorage('ui_active_signature', 'default'),
  addSignature: (signature) => {
    const newSignature = { ...signature, id: generateId() };
    const signatures = [...get().signatures, newSignature];
    saveToStorage('ui_signatures', signatures);
    set({ signatures });
  },
  removeSignature: (signatureId) => {
    const signatures = get().signatures.filter(s => s.id !== signatureId);
    saveToStorage('ui_signatures', signatures);
    set({ signatures });
  },
  updateSignature: (signatureId, updates) => {
    const signatures = get().signatures.map(s => s.id === signatureId ? { ...s, ...updates } : s);
    saveToStorage('ui_signatures', signatures);
    set({ signatures });
  },
  setActiveSignature: (signatureId) => {
    saveToStorage('ui_active_signature', signatureId);
    set({ activeSignatureId: signatureId });
  },

  // Réponses rapides
  quickReplies: loadFromStorage('ui_quick_replies', defaultQuickReplies),
  addQuickReply: (reply) => {
    const newReply = { ...reply, id: generateId() };
    const quickReplies = [...get().quickReplies, newReply];
    saveToStorage('ui_quick_replies', quickReplies);
    set({ quickReplies });
  },
  removeQuickReply: (replyId) => {
    const quickReplies = get().quickReplies.filter(r => r.id !== replyId);
    saveToStorage('ui_quick_replies', quickReplies);
    set({ quickReplies });
  },
  updateQuickReply: (replyId, updates) => {
    const quickReplies = get().quickReplies.map(r => r.id === replyId ? { ...r, ...updates } : r);
    saveToStorage('ui_quick_replies', quickReplies);
    set({ quickReplies });
  },

  // Planification d'envoi
  scheduledEmails: loadFromStorage('ui_scheduled_emails', []),
  addScheduledEmail: (email) => {
    const newEmail = { ...email, id: generateId() };
    const scheduledEmails = [...get().scheduledEmails, newEmail];
    saveToStorage('ui_scheduled_emails', scheduledEmails);
    set({ scheduledEmails });
  },
  removeScheduledEmail: (emailId) => {
    const scheduledEmails = get().scheduledEmails.filter(e => e.id !== emailId);
    saveToStorage('ui_scheduled_emails', scheduledEmails);
    set({ scheduledEmails });
  },
  updateScheduledEmail: (emailId, updates) => {
    const scheduledEmails = get().scheduledEmails.map(e => e.id === emailId ? { ...e, ...updates } : e);
    saveToStorage('ui_scheduled_emails', scheduledEmails);
    set({ scheduledEmails });
  },
}));