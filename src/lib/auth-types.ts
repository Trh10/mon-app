// Types pour le système d'authentification par code multi-entreprises
export interface Company {
  id: string;
  name: string;
  code: string; // Code court (ex: ACME, BETA)
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface UserLevel {
  id: string;
  name: string;
  code: string; // Format: COMPANY-XXXX
  level: number;
  permissions: string[];
  companyId: string;
  companyCode: string;
  createdBy?: string;
  createdAt: string;
  lastUsed?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  level: number;
  permissions: string[];
  companyId: string;
  companyCode: string;
  companyName: string;
  isFirstUser?: boolean;
}

export interface NeedRequest {
  id: string;
  title: string;
  description: string;
  category: 'materiel' | 'formation' | 'conge' | 'autre';
  urgency: 'basse' | 'moyenne' | 'haute';
  requestedBy: string;
  requestedAt: string;
  status: 'en_attente' | 'approuve' | 'refuse' | 'execute';
  approvedBy?: string;
  approvedAt?: string;
  refusedBy?: string;
  refusedAt?: string;
  refusalReason?: string;
  executedBy?: string;
  executedAt?: string;
  estimatedCost?: number;
  comments?: string;
}

// Permissions par niveau
export const LEVEL_PERMISSIONS = {
  10: ['all'], // DG - Toutes les permissions
  7: ['view_needs', 'execute_approved', 'manage_users'], // Administration
  6: ['view_needs', 'financial_review'], // Financier
  5: ['create_needs', 'view_own_needs'], // Employé
} as const;

// Niveaux prédéfinis
export const USER_LEVELS = {
  10: 'Directeur Général',
  7: 'Administration', 
  6: 'Financier',
  5: 'Employé',
} as const;
