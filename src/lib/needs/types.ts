// Types pour le système de gestion des besoins (needs)

// Rôle de l'utilisateur dans le workflow des besoins
export type NeedRole = 'employee' | 'manager' | 'admin' | 'finance';

// Statuts possibles d'une demande de besoin
export type NeedStatus =
  | 'draft'
  | 'submitted'
  | 'manager_approved'
  | 'admin_approved'
  | 'finance_approved'
  | 'rejected'
  | 'fulfilled';

// Référence utilisateur compacte (stockée dans Firestore)
export interface UserRef {
  uid: string;
  email: string;
  name: string;
}

// Enregistrement d'approbation
export interface ApprovalRecord {
  role: NeedRole;
  decision: 'approved' | 'rejected';
  comment: string;
  at: string; // ISO string côté client pour l'historique
  by: UserRef;
}

// Pièce jointe pour une demande de besoin
export interface NeedAttachment {
  filename: string;
  url?: string;
  size?: number;
  contentType?: string;
}

// Modèle principal d'une demande de besoin
export interface NeedRequest {
  id: string;
  title: string;
  description: string;
  amount: number | null;
  currency: string; // ex: XOF, USD
  justification: string;

  createdBy: UserRef;
  createdAt: any;      // Firestore serverTimestamp
  lastEventAt: any;    // Firestore serverTimestamp
  status: NeedStatus;

  approvals: ApprovalRecord[];
  history: Array<{
    type: string;
    at: string; // ISO côté client pour l'historique
    by: UserRef;
    data?: any;
  }>;

  attachments?: NeedAttachment[];
}

// Exports utilitaires pour l'UI (labels/couleurs)
export const STATUS_LABELS: Record<NeedStatus, string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  manager_approved: 'Approuvé (Manager)',
  admin_approved: 'Approuvé (Admin)',
  finance_approved: 'Approuvé (Finance)',
  rejected: 'Rejeté',
  fulfilled: 'Exécuté',
};

export const STATUS_COLORS: Record<NeedStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  manager_approved: 'bg-green-100 text-green-800',
  admin_approved: 'bg-green-100 text-green-800',
  finance_approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  fulfilled: 'bg-purple-100 text-purple-800',
};
