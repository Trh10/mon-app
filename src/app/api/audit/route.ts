import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuditLogs, getAuditLogsForRequisition, getAuditLogsForUser, getRecentAuditLogs } from '@/lib/audit/audit-store';

// Récupérer l'utilisateur actuel depuis la session
async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('user-session');
    if (!sessionCookie) return null;
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    // Seuls les niveaux 7+ peuvent accéder aux logs complets
    // Les autres utilisateurs peuvent voir seulement leurs propres actions
    if (user.level < 7) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const requisitionId = searchParams.get('requisitionId');
    const userId = searchParams.get('userId');
    const hours = searchParams.get('hours');
    const limit = parseInt(searchParams.get('limit') || '100');

    let logs;

    if (requisitionId) {
      logs = getAuditLogsForRequisition(requisitionId);
    } else if (userId) {
      logs = getAuditLogsForUser(userId);
    } else if (hours) {
      logs = getRecentAuditLogs(parseInt(hours));
    } else {
      logs = getAuditLogs();
    }

    // Limiter le nombre de résultats
    logs = logs.slice(-limit);

    // Trier par timestamp décroissant (plus récent en premier)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      logs,
      total: logs.length
    });

  } catch (error) {
    console.error('Erreur récupération logs audit:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
