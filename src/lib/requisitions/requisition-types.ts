// Types pour le système de gestion des réquisitions
export interface Requisition {
  id: string;
  title: string;
  description: string;
  category: RequisitionCategory;
  priority: RequisitionPriority;
  budget: number;
  justification: string;
  status: RequisitionStatus;
  requesterId: string;
  requesterName: string;
  companyId: string;
  companyCode: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string; // Date d'approbation finale (si approuvée définitivement)
  workflow: WorkflowStep[];
  attachments?: Attachment[];
}

export type RequisitionCategory = 
  | 'materiel'      // Équipements, machines, outils
  | 'logiciel'      // Software, licences, applications
  | 'formation'     // Formation du personnel
  | 'service'       // Services externes, consultants
  | 'fourniture'    // Fournitures de bureau, consommables
  | 'maintenance'   // Réparations, entretien
  | 'autre';        // Autres réquisitions

export type RequisitionPriority = 
  | 'faible'        // Peut attendre
  | 'moyenne'       // Normal
  | 'haute'         // Important
  | 'urgente';      // Critique

export type RequisitionStatus = 
  | 'brouillon'     // En cours de rédaction
  | 'soumis'        // Soumis pour approbation
  | 'en_review'     // En cours d'examen
  | 'approuve'      // Approuvé et en cours
  | 'rejete'        // Rejeté
  | 'complete'      // Terminé/livré
  | 'annule';       // Annulé

export interface WorkflowStep {
  id: string;
  requisitionId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerLevel: number;
  action: WorkflowAction;
  comment?: string;
  createdAt: string;
  completedAt?: string;
  isRequired: boolean;
  isCompleted: boolean;
}

export type WorkflowAction = 
  | 'pending'       // En attente de review
  | 'approved'      // Approuvé
  | 'rejected'      // Rejeté
  | 'commented'     // Commenté
  | 'requested_info'; // Demande d'informations

export interface Attachment {
  id: string;
  requisitionId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
}

// Données pour créer une nouvelle réquisition
export interface CreateRequisitionData {
  title: string;
  description: string;
  category: RequisitionCategory;
  priority: RequisitionPriority;
  budget: number;
  justification: string;
}

// Données pour mettre à jour une réquisition
export interface UpdateRequisitionData {
  title?: string;
  description?: string;
  category?: RequisitionCategory;
  priority?: RequisitionPriority;
  budget?: number;
  justification?: string;
  status?: RequisitionStatus;
}

// Données pour une action de workflow
export interface WorkflowActionData {
  requisitionId: string;
  action: WorkflowAction;
  comment?: string;
}

// Configuration d'approbation par défaut
export const DEFAULT_APPROVAL_CONFIG = {
  // Budget < $1100 : Approbation niveau 7 uniquement
  SMALL_BUDGET_THRESHOLD: 1100, // 1000 EUR → 1100 USD
  SMALL_BUDGET_LEVELS: [7],
  
  // Budget $1100-$5400 : Approbation niveau 7 puis 6
  MEDIUM_BUDGET_THRESHOLD: 5400, // 5000 EUR → 5400 USD
  MEDIUM_BUDGET_LEVELS: [7, 6],
  
  // Budget > $5400 : Approbation niveau 7, puis 6, puis 10
  LARGE_BUDGET_LEVELS: [7, 6, 10]
};

// Labels pour l'affichage
export const CATEGORY_LABELS: Record<RequisitionCategory, string> = {
  materiel: 'Matériel',
  logiciel: 'Logiciel',
  formation: 'Formation',
  service: 'Service',
  fourniture: 'Fourniture',
  maintenance: 'Maintenance',
  autre: 'Autre'
};

export const PRIORITY_LABELS: Record<RequisitionPriority, string> = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  haute: 'Haute',
  urgente: 'Urgente'
};

export const STATUS_LABELS: Record<RequisitionStatus, string> = {
  brouillon: 'Brouillon',
  soumis: 'Soumis',
  en_review: 'En révision',
  approuve: 'Approuvé',
  rejete: 'Rejeté',
  complete: 'Terminé',
  annule: 'Annulé'
};

// Couleurs pour l'affichage
export const PRIORITY_COLORS: Record<RequisitionPriority, string> = {
  faible: 'bg-gray-100 text-gray-800',
  moyenne: 'bg-blue-100 text-blue-800',
  haute: 'bg-yellow-100 text-yellow-800',
  urgente: 'bg-red-100 text-red-800'
};

export const STATUS_COLORS: Record<RequisitionStatus, string> = {
  brouillon: 'bg-gray-100 text-gray-800',
  soumis: 'bg-blue-100 text-blue-800',
  en_review: 'bg-yellow-100 text-yellow-800',
  approuve: 'bg-green-100 text-green-800',
  rejete: 'bg-red-100 text-red-800',
  complete: 'bg-purple-100 text-purple-800',
  annule: 'bg-gray-100 text-gray-800'
};

// Permissions d'accès aux réquisitions
export const REQUISITION_ACCESS_LEVELS = [6, 7, 10]; // Finance, Administration, DG uniquement

// Vérifier si un utilisateur peut accéder aux réquisitions
export function canAccessRequisitions(userLevel: number): boolean {
  return REQUISITION_ACCESS_LEVELS.includes(userLevel);
}

// Vérifier si un utilisateur peut approuver à un certain niveau
export function canApproveAtLevel(userLevel: number, requiredLevel: number): boolean {
  // DG (niveau 10) peut approuver à n'importe quel niveau; sinon, niveau exact requis
  return userLevel === 10 || userLevel === requiredLevel;
}
