import { NextRequest, NextResponse } from "next/server";
import { getUsers, getCompanies, UserRecord } from "@/lib/auth/store";

export const dynamic = 'force-dynamic';

/**
 * API pour récupérer tous les membres d'une entreprise
 * Utilise le store en mémoire (fichier .data/users.json)
 * Trie par niveau (hiérarchie) puis par nom
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyCode = searchParams.get("companyCode") || searchParams.get("company");
    const companyId = searchParams.get("companyId");
    
    // Récupérer tous les utilisateurs
    const allUsers = getUsers();
    const companies = getCompanies();
    
    // Filtrer par company si spécifié
    let filteredUsers: UserRecord[] = allUsers;
    
    if (companyCode) {
      filteredUsers = allUsers.filter(u => 
        u.companyCode === companyCode || 
        u.companyId === companyCode
      );
    } else if (companyId) {
      filteredUsers = allUsers.filter(u => u.companyId === companyId);
    }
    
    // Trier par niveau (desc) puis par nom (asc)
    filteredUsers.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return a.name.localeCompare(b.name);
    });
    
    // Formater les données pour le frontend
    const members = filteredUsers.map(u => {
      const company = companies.find(c => c.id === u.companyId);
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        level: u.level,
        levelName: getLevelName(u.level),
        companyId: u.companyId,
        companyCode: u.companyCode,
        companyName: company?.name || "",
        isOnline: u.isOnline || false,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        permissions: u.permissions || []
      };
    });
    
    return NextResponse.json({
      success: true,
      members,
      total: members.length,
      online: members.filter(m => m.isOnline).length
    });
  } catch (error: any) {
    console.error("[API team/all] Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erreur serveur",
      members: []
    }, { status: 500 });
  }
}

function getLevelName(level: number): string {
  if (level >= 10) return "Directeur Général";
  if (level >= 8) return "Administration/Finance";
  if (level >= 5) return "Assistant";
  return "Employé";
}
