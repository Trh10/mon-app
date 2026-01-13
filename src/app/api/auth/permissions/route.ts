import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Configuration des rôles et permissions
const ROLE_CONFIG: Record<string, { level: number; permissions: string[]; displayName: string }> = {
  'Directeur Général': {
    level: 100,
    permissions: ['all', 'view_all', 'manage_users', 'manage_company', 'view_treasury', 'manage_treasury', 'create_invoices', 'delete_invoices', 'view_reports'],
    displayName: 'Directeur Général'
  },
  'Administration': {
    level: 80,
    permissions: ['view_all', 'view_treasury', 'manage_treasury', 'create_invoices', 'delete_invoices', 'view_reports', 'manage_meetings'],
    displayName: 'Administration'
  },
  'DAF': {
    level: 85,
    permissions: ['view_all', 'view_finances', 'view_treasury', 'manage_treasury', 'create_invoices', 'delete_invoices', 'view_invoices', 'view_reports'],
    displayName: 'Directeur Administratif et Financier'
  },
  'Juridique et RH': {
    level: 75,
    permissions: ['view_all', 'view_treasury', 'manage_treasury', 'create_invoices', 'view_invoices', 'view_reports', 'manage_users', 'manage_meetings'],
    displayName: 'Juridique et RH'
  },
  'Finance': {
    level: 70,
    permissions: ['view_finances', 'view_treasury', 'manage_treasury', 'create_invoices', 'view_invoices', 'view_reports'],
    displayName: 'Finance'
  },
  'Financier': {
    level: 70,
    permissions: ['view_finances', 'view_treasury', 'manage_treasury', 'create_invoices', 'view_invoices', 'view_reports'],
    displayName: 'Financier'
  },
  'Comptable': {
    level: 70,
    permissions: ['view_finances', 'view_treasury', 'manage_treasury', 'create_invoices', 'view_invoices', 'view_reports'],
    displayName: 'Comptable'
  },
  'Assistant': {
    level: 40,
    permissions: ['create_invoices', 'view_invoices', 'manage_meetings', 'view_team'],
    displayName: 'Assistant(e)'
  },
  'Assistante': {
    level: 40,
    permissions: ['create_invoices', 'view_invoices', 'manage_meetings', 'view_team'],
    displayName: 'Assistante'
  },
  'Employé': {
    level: 10,
    permissions: ['view_own', 'view_team'],
    displayName: 'Employé'
  }
};

function getRoleConfig(role: string) {
  if (ROLE_CONFIG[role]) {
    return ROLE_CONFIG[role];
  }
  
  // Fallback pour anciens rôles
  const lowerRole = role.toLowerCase();
  if (lowerRole === 'admin' || lowerRole.includes('directeur') || lowerRole.includes('dg')) {
    return ROLE_CONFIG['Directeur Général'];
  }
  if (lowerRole.includes('daf')) {
    return ROLE_CONFIG['DAF'];
  }
  if (lowerRole.includes('juridique') || lowerRole.includes('legal') || lowerRole.includes('rh')) {
    return ROLE_CONFIG['Juridique et RH'];
  }
  if (lowerRole.includes('admin')) {
    return ROLE_CONFIG['Administration'];
  }
  if (lowerRole.includes('financier')) {
    return ROLE_CONFIG['Financier'];
  }
  if (lowerRole.includes('finance') || lowerRole.includes('comptab')) {
    return ROLE_CONFIG['Finance'];
  }
  if (lowerRole.includes('assistant')) {
    return ROLE_CONFIG['Assistant'];
  }
  
  return ROLE_CONFIG['Employé'];
}

/**
 * GET /api/auth/permissions
 * Retourne les permissions de l'utilisateur connecté
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('user-session');
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ 
        authenticated: false,
        error: 'Non authentifié' 
      }, { status: 401 });
    }
    
    let session;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ 
        authenticated: false,
        error: 'Session invalide' 
      }, { status: 401 });
    }
    
    const roleConfig = getRoleConfig(session.role || 'Employé');
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.id,
        name: session.name,
        role: session.role,
        displayRole: roleConfig.displayName,
        level: roleConfig.level
      },
      permissions: roleConfig.permissions,
      // Permissions pratiques pour le frontend
      can: {
        viewAll: roleConfig.permissions.includes('all') || roleConfig.permissions.includes('view_all'),
        viewTreasury: roleConfig.permissions.includes('all') || roleConfig.permissions.includes('view_treasury'),
        manageTreasury: roleConfig.permissions.includes('all') || roleConfig.permissions.includes('manage_treasury'),
        createInvoices: roleConfig.permissions.includes('all') || roleConfig.permissions.includes('create_invoices'),
        deleteInvoices: roleConfig.permissions.includes('all') || roleConfig.permissions.includes('delete_invoices'),
        manageUsers: roleConfig.permissions.includes('all') || roleConfig.permissions.includes('manage_users'),
        viewReports: roleConfig.permissions.includes('all') || roleConfig.permissions.includes('view_reports'),
        manageSettings: roleConfig.permissions.includes('all') || roleConfig.permissions.includes('manage_settings')
      }
    });
    
  } catch (error: any) {
    console.error('[Permissions] Erreur:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: 'Erreur serveur' 
    }, { status: 500 });
  }
}

/**
 * POST /api/auth/permissions
 * Vérifie si l'utilisateur a une permission spécifique
 * Body: { permission: string } ou { permissions: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('user-session');
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ allowed: false, error: 'Non authentifié' }, { status: 401 });
    }
    
    let session;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ allowed: false, error: 'Session invalide' }, { status: 401 });
    }
    
    const body = await req.json();
    const { permission, permissions } = body;
    
    const roleConfig = getRoleConfig(session.role || 'Employé');
    const userPerms = roleConfig.permissions;
    
    // Vérifier une permission unique
    if (permission) {
      const allowed = userPerms.includes('all') || userPerms.includes(permission);
      return NextResponse.json({ allowed, permission });
    }
    
    // Vérifier plusieurs permissions
    if (permissions && Array.isArray(permissions)) {
      const results: Record<string, boolean> = {};
      for (const perm of permissions) {
        results[perm] = userPerms.includes('all') || userPerms.includes(perm);
      }
      return NextResponse.json({ results });
    }
    
    return NextResponse.json({ error: 'Permission(s) non spécifiée(s)' }, { status: 400 });
    
  } catch (error: any) {
    console.error('[Permissions] Erreur:', error);
    return NextResponse.json({ allowed: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
