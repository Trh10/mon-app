import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Simuler une base de données d'équipe
    const members = [
      {
        id: 'dir-001',
        name: 'Marie Dubois',
        email: 'marie.dubois@company.com',
        role: 'directeur',
        title: 'Directrice Générale',
        department: 'Direction',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        avatar: null
      },
      {
        id: 'mgr-001',
        name: 'Pierre Martin',
        email: 'pierre.martin@company.com',
        role: 'manager',
        title: 'Responsable Commercial',
        department: 'Ventes',
        isOnline: true,
        lastSeen: new Date(Date.now() - 5 * 60000).toISOString(),
        avatar: null
      },
      {
        id: 'mgr-002',
        name: 'Claire Moreau',
        email: 'claire.moreau@company.com',
        role: 'manager',
        title: 'Responsable RH',
        department: 'Ressources Humaines',
        isOnline: false,
        lastSeen: new Date(Date.now() - 15 * 60000).toISOString(),
        avatar: null
      },
      {
        id: 'ast-001',
        name: 'Sophie Leroy',
        email: 'sophie.leroy@company.com',
        role: 'assistant',
        title: 'Assistante Administrative',
        department: 'Administration',
        isOnline: false,
        lastSeen: new Date(Date.now() - 30 * 60000).toISOString(),
        avatar: null
      },
      {
        id: 'ast-002',
        name: 'Marc Petit',
        email: 'marc.petit@company.com',
        role: 'assistant',
        title: 'Assistant RH',
        department: 'Ressources Humaines',
        isOnline: true,
        lastSeen: new Date(Date.now() - 2 * 60000).toISOString(),
        avatar: null
      },
      {
        id: 'emp-001',
        name: 'Thomas Durand',
        email: 'thomas.durand@company.com',
        role: 'employe',
        title: 'Commercial Senior',
        department: 'Ventes',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        avatar: null
      },
      {
        id: 'emp-002',
        name: 'Julie Bernard',
        email: 'julie.bernard@company.com',
        role: 'employe',
        title: 'Comptable',
        department: 'Finance',
        isOnline: false,
        lastSeen: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
        avatar: null
      },
      {
        id: 'emp-003',
        name: 'Antoine Roux',
        email: 'antoine.roux@company.com',
        role: 'employe',
        title: 'Commercial Junior',
        department: 'Ventes',
        isOnline: true,
        lastSeen: new Date(Date.now() - 10 * 60000).toISOString(),
        avatar: null
      },
      {
        id: 'emp-004',
        name: 'Camille Blanc',
        email: 'camille.blanc@company.com',
        role: 'employe',
        title: 'Analyste Financier',
        department: 'Finance',
        isOnline: false,
        lastSeen: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
        avatar: null
      }
    ];

    // Simuler une variation des statuts en ligne
    const now = Date.now();
    members.forEach(member => {
      // 70% de chance d'être en ligne durant les heures de bureau
      const currentHour = new Date().getHours();
      const isBusinessHours = currentHour >= 9 && currentHour <= 18;
      const onlineChance = isBusinessHours ? 0.7 : 0.3;
      
      member.isOnline = Math.random() < onlineChance;
      
      if (!member.isOnline) {
        // Si hors ligne, mettre à jour lastSeen avec un délai aléatoire
        const randomDelay = Math.floor(Math.random() * 4 * 60 * 60 * 1000); // 0-4 heures
        member.lastSeen = new Date(now - randomDelay).toISOString();
      } else {
        // Si en ligne, lastSeen récent
        const recentDelay = Math.floor(Math.random() * 5 * 60 * 1000); // 0-5 minutes
        member.lastSeen = new Date(now - recentDelay).toISOString();
      }
    });

    return NextResponse.json({
      success: true,
      members,
      stats: {
        total: members.length,
        online: members.filter(m => m.isOnline).length,
        byRole: {
          directeur: members.filter(m => m.role === 'directeur').length,
          manager: members.filter(m => m.role === 'manager').length,
          assistant: members.filter(m => m.role === 'assistant').length,
          employe: members.filter(m => m.role === 'employe').length
        }
      }
    });

  } catch (error: any) {
    console.error('Erreur récupération équipe:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, memberId, data } = body;

    // Gestion des actions sur les membres
    switch (action) {
      case 'update_status':
        // Mettre à jour le statut d'un membre
        console.log(`Mise à jour statut membre ${memberId}:`, data);
        return NextResponse.json({ success: true });

      case 'send_message':
        // Envoyer un message à un membre
        console.log(`Message vers ${memberId}:`, data.message);
        return NextResponse.json({ success: true });

      case 'assign_task':
        // Assigner une tâche à un membre
        console.log(`Tâche assignée à ${memberId}:`, data);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: 'Action non reconnue' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Erreur action équipe:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
