import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const viewerRole = (url.searchParams.get('viewerRole') || '').toLowerCase();

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 });
    }

    // Permissions simplifiées: certains rôles voient plus de détails
    const canViewDetails = ['dg', 'administration', 'admin', 'finance', 'manager', 'chef'].includes(viewerRole);

    // Données simulées
    const now = Date.now();
    const mockOnline = (parseInt(userId.replace(/\D/g, '') || '1', 10) % 2) === 0;
    const mockLastSeen = new Date(now - (mockOnline ? 2 * 60 * 1000 : 45 * 60 * 1000)).toISOString();

    const response: any = {
      user: {
        id: userId,
        isOnline: mockOnline,
        lastSeen: mockLastSeen,
        loginHistory: []
      }
    };

    if (canViewDetails) {
      response.user.loginHistory = [
        { loginAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(), ipAddress: '192.168.1.10' },
        { loginAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(), ipAddress: '192.168.1.11' }
      ];
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erreur user-activity:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
