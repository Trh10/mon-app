export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session.organizationId || !session.userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }
    
    const db: any = prisma;
    const requisitions = await db.requisition.findMany({
      where: { organizationId: session.organizationId, status: 'approuve' },
      include: { workflow: true, requester: { select: { name: true } } },
      orderBy: { approvedAt: 'desc' }
    });
    
    // Générer PDF simple (temporaire - peut utiliser jsPDF ou autre lib plus tard)
    return NextResponse.json({
      success: true,
      message: 'PDF generation placeholder - implement with jsPDF if needed',
      count: requisitions.length,
      requisitions: requisitions.slice(0, 10) // Preview
    });
  } catch (error) {
    console.error('Erreur PDF:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

