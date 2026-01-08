// Types pour le système de gestion des besoins (Needs)
// Réutilise les types de base de requisition-types pour éviter la duplication

import {
  RequisitionCategory,
  RequisitionPriority,
  RequisitionStatus,
  WorkflowAction,
  Attachment
} from '@/lib/requisitions/requisition-types';

// Alias de types pour le module Needs
export type NeedCategory = RequisitionCategory;
export type NeedPriority = RequisitionPriority;
export type NeedStatus = RequisitionStatus;

// Réexporter pour compatibilité
export type { WorkflowAction, Attachment };

// Interface Need (légèrement différente de Requisition pour supporter needId)
export interface Need {
  id: string;
  title: string;
  description: string;
  category: NeedCategory;
  priority: NeedPriority;
  budget: number;
  justification: string;
  status: NeedStatus;
  requesterId: string;
  requesterName: string;
  companyId: string;
  companyCode: string;
  createdAt: string;
  updatedAt: string;
  workflow: WorkflowStep[];
  attachments?: NeedAttachment[];
}

// WorkflowStep adapté pour les besoins (utilise needId au lieu de requisitionId)
export interface WorkflowStep {
  id: string;
  needId: string;
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

// Attachment adapté pour les besoins
export interface NeedAttachment {
  id: string;
  needId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
}

// Données pour créer un nouveau besoin
export interface CreateNeedData {
  title: string;
  description: string;
  category: NeedCategory;
  priority: NeedPriority;
  budget: number;
  justification: string;
}

// Données pour mettre à jour un besoin
export interface UpdateNeedData {
  title?: string;
  description?: string;
  category?: NeedCategory;
  priority?: NeedPriority;
  budget?: number;
  justification?: string;
  status?: NeedStatus;
}

// Données pour une action de workflow
export interface WorkflowActionData {
  needId: string;
  action: WorkflowAction;
  comment?: string;
}

// Configuration par défaut des approbations
export const DEFAULT_APPROVAL_CONFIG = {
  level5_max: 500,        // Employé : jusqu'à 500€
  level6_required: 1000,  // Finance : à partir de 1000€
  level7_required: 5400,  // Admin : à partir de $5400 (5000 EUR → 5400 USD)
  level10_required: 10000 // DG : à partir de 10000€
};

// Labels pour l'interface utilisateur
export const CATEGORY_LABELS: Record<NeedCategory, string> = {
  materiel: 'Matériel & Équipements',
  logiciel: 'Logiciels & Licences',
  formation: 'Formation',
  service: 'Services Externes',
  fourniture: 'Fournitures',
  maintenance: 'Maintenance & Réparation',
  autre: 'Autres'
};

export const PRIORITY_LABELS: Record<NeedPriority, string> = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  haute: 'Haute',
  urgente: 'Urgente'
};

export const STATUS_LABELS: Record<NeedStatus, string> = {
  brouillon: 'Brouillon',
  soumis: 'Soumis',
  en_review: 'En Examen',
  approuve: 'Approuvé',
  rejete: 'Rejeté',
  complete: 'Terminé',
  annule: 'Annulé'
};

// Couleurs pour l'interface
export const PRIORITY_COLORS: Record<NeedPriority, string> = {
  faible: 'bg-gray-100 text-gray-800',
  moyenne: 'bg-blue-100 text-blue-800',
  haute: 'bg-orange-100 text-orange-800',
  urgente: 'bg-red-100 text-red-800'
};

export const STATUS_COLORS: Record<NeedStatus, string> = {
  brouillon: 'bg-gray-100 text-gray-800',
  soumis: 'bg-blue-100 text-blue-800',
  en_review: 'bg-yellow-100 text-yellow-800',
  approuve: 'bg-green-100 text-green-800',
  rejete: 'bg-red-100 text-red-800',
  complete: 'bg-purple-100 text-purple-800',
  annule: 'bg-gray-100 text-gray-800'
};
