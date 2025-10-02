import { NextRequest, NextResponse } from "next/server";
import { COMPANY_DEFAULT, LEGACY_BRAND_NAMES } from "@/config/branding";

// Mock database pour les membres d'équipe avec hiérarchie
const BRAND = LEGACY_BRAND_NAMES[1] || LEGACY_BRAND_NAMES[0] || COMPANY_DEFAULT;
const mockTeamMembers = [
  {
    id: "user1",
    name: "Marie Dubois",
  email: `marie.dubois@${BRAND.toLowerCase()}.com`,
    role: "DG",
    level: 10,
  company: BRAND,
    department: "Direction",
    status: "online",
    avatar: null,
    joinedAt: "2023-01-15T10:00:00Z",
    lastSeen: new Date().toISOString()
  },
  {
    id: "user2", 
    name: "Pierre Martin",
  email: `pierre.martin@${BRAND.toLowerCase()}.com`,
    role: "Admin",
    level: 8,
  company: BRAND,
    department: "Administration",
    status: "online",
    avatar: null,
    joinedAt: "2023-02-01T09:00:00Z",
    lastSeen: new Date(Date.now() - 300000).toISOString() // 5 min ago
  },
  {
    id: "user3",
    name: "Sophie Bernard",
  email: `sophie.bernard@${BRAND.toLowerCase()}.com`, 
    role: "Finance",
    level: 8,
  company: BRAND,
    department: "Finances",
    status: "away",
    avatar: null,
    joinedAt: "2023-02-15T08:30:00Z",
    lastSeen: new Date(Date.now() - 1800000).toISOString() // 30 min ago
  },
  {
    id: "user4",
    name: "Thomas Leroy",
  email: `thomas.leroy@${BRAND.toLowerCase()}.com`,
    role: "Assistant",
    level: 5,
  company: BRAND, 
    department: "Support",
    status: "offline",
    avatar: null,
    joinedAt: "2023-03-01T14:00:00Z",
    lastSeen: new Date(Date.now() - 7200000).toISOString() // 2h ago
  },
  {
    id: "user5",
    name: "Julie Moreau",
  email: `julie.moreau@${BRAND.toLowerCase()}.com`,
    role: "Employe",
    level: 3,
  company: BRAND,
    department: "Production",
    status: "busy",
    avatar: null,
    joinedAt: "2023-03-15T13:30:00Z",
    lastSeen: new Date(Date.now() - 600000).toISOString() // 10 min ago
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
  const company = searchParams.get('company') || BRAND;
    
    // Filtrer par entreprise si spécifié
    const filteredMembers = mockTeamMembers.filter(member => 
      !company || member.company.toLowerCase() === company.toLowerCase()
    );
    
    // Trier par niveau hiérarchique (DG en premier)
    const sortedMembers = filteredMembers.sort((a, b) => b.level - a.level);
    
    return NextResponse.json({
      success: true,
      members: sortedMembers,
      totalCount: sortedMembers.length
    });
    
  } catch (error) {
    console.error('Erreur API team members:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, targetUserId, data } = body;
    
    switch (action) {
      case 'update-status':
        // Mettre à jour le statut d'un utilisateur
        const memberIndex = mockTeamMembers.findIndex(m => m.id === targetUserId);
        
        if (memberIndex !== -1) {
          mockTeamMembers[memberIndex].status = data.status;
          mockTeamMembers[memberIndex].lastSeen = new Date().toISOString();
        }
        
        return NextResponse.json({
          success: true,
          message: 'Statut mis à jour'
        });
        
      case 'assign-task':
        // Assigner une tâche
        console.log(`Tâche assignée à ${targetUserId}:`, data);
        return NextResponse.json({
          success: true,
          message: 'Tâche assignée'
        });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Action non supportée' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Erreur API team POST:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
