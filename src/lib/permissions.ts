// Permissions et rôles pour ICONES RDC
export type UserRole = "Directeur Général" | "Administration" | "Financier" | "Assistant" | "Assistante" | "Employé";

// Hiérarchie des rôles (plus le nombre est élevé, plus le rôle a de pouvoir)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  "Directeur Général": 100,  // DG - Directeur Général
  "Administration": 80,      // Administration
  "Financier": 80,          // Finance  
  "Assistant": 40,          // Assistant
  "Assistante": 40,         // Assistante
  "Employé": 20             // Employé
};

// Rôles qui peuvent assigner des tâches
export const CAN_ASSIGN_TASKS: UserRole[] = ["Directeur Général", "Administration", "Financier"];

// Rôles administratifs
export const ADMIN_ROLES: UserRole[] = ["Directeur Général", "Administration", "Financier"];

/**
 * Vérifie si un utilisateur peut assigner une tâche à un autre utilisateur
 */
export function canAssignTaskTo(assignerRole: UserRole, targetRole: UserRole): boolean {
  // Personne ne peut assigner de tâche au DG
  if (targetRole === "Directeur Général") {
    return false;
  }
  
  // Seuls certains rôles peuvent assigner des tâches
  if (!CAN_ASSIGN_TASKS.includes(assignerRole)) {
    return false;
  }
  
  // Le DG peut assigner à tout le monde (sauf à lui-même, déjà vérifié)
  if (assignerRole === "Directeur Général") {
    return true;
  }
  
  // Administration et Finance peuvent assigner à tous (sauf au DG, déjà filtré)
  if (assignerRole === "Administration" || assignerRole === "Financier") {
    return true;
  }
  
  return false;
}

/**
 * Obtient la liste des utilisateurs auxquels on peut assigner une tâche
 */
export function getAssignableUsers(assignerRole: UserRole, allUsers: Array<{id: string, name: string, role: UserRole}>): Array<{id: string, name: string, role: UserRole}> {
  return allUsers.filter(user => canAssignTaskTo(assignerRole, user.role));
}

/**
 * Vérifie si un utilisateur peut voir les détails d'un autre utilisateur
 */
export function canViewUserDetails(viewerRole: UserRole, targetRole: UserRole): boolean {
  // Le DG peut voir tout le monde
  if (viewerRole === "Directeur Général") {
    return true;
  }
  
  // Administration et Finance peuvent voir tout le monde sauf certains détails du DG
  if (viewerRole === "Administration" || viewerRole === "Financier") {
    return true;
  }
  
  // Les autres ne peuvent voir que leurs propres détails
  return false;
}

/**
 * Détermine le niveau d'accès aux informations d'un utilisateur
 */
export function getUserAccessLevel(viewerRole: UserRole, targetRole: UserRole): "full" | "limited" | "none" {
  if (viewerRole === targetRole) {
    return "full"; // Peut voir ses propres infos
  }
  
  if (viewerRole === "Directeur Général") {
    return "full"; // Le DG voit tout
  }
  
  if ((viewerRole === "Administration" || viewerRole === "Financier") && targetRole !== "Directeur Général") {
    return "full"; // Admin/Finance voient tout sauf le DG
  }
  
  if ((viewerRole === "Administration" || viewerRole === "Financier") && targetRole === "Directeur Général") {
    return "limited"; // Admin/Finance voient le DG de façon limitée
  }
  
  return "none";
}

/**
 * Obtient le nom d'affichage d'un rôle
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    "Directeur Général": "Directeur Général",
    "Administration": "Administration", 
    "Financier": "Financier",
    "Assistant": "Assistant",
    "Assistante": "Assistante",
    "Employé": "Employé"
  };
  return names[role] || role;
}
