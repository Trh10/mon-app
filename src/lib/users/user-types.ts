// Types pour la gestion des utilisateurs
export interface User {
  id: string;
  code: string;
  name: string;
  email: string;
  level: number;
  levelName: string;
  companyId: string;
  companyCode: string;
  department?: string;
  position?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface CreateUserData {
  code: string;
  name: string;
  email: string;
  level: number;
  companyId: string;
  companyCode: string;
  department?: string;
  position?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  level?: number;
  department?: string;
  position?: string;
  isActive?: boolean;
}

export const USER_LEVELS = {
  1: 'Employé',
  5: 'Acquisiteur',
  6: 'Finance',
  7: 'Administrateur',
  10: 'Directeur Général'
} as const;

export type UserLevel = keyof typeof USER_LEVELS;
