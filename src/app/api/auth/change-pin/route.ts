import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { getUsers } from '@/lib/auth/store';
import { hashPin, verifyPin } from '@/lib/hash';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/*
  POST /api/auth/change-pin
  Body: { currentPIN, newPIN }
  - Auth via user-session cookie
  - Validate current matches
  - Enforce complexity (4-6 digits, not trivial repeats/sequences, not same as current)
*/

const FORBIDDEN = new Set(['0000','1111','2222','3333','4444','5555','6666','7777','8888','9999','1234','4321','1122','1212']);

export async function POST(req: NextRequest) {
  try {
    const sessionRaw = cookies().get('user-session')?.value;
    if (!sessionRaw) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    let session: any = null; try { session = JSON.parse(sessionRaw); } catch {}
    if (!session?.id || !session?.companyId) return NextResponse.json({ error: 'Session invalide' }, { status: 400 });

    const { currentPIN, newPIN } = await req.json();
    if (!currentPIN || !newPIN) return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    if (!/^\d{4,6}$/.test(newPIN)) return NextResponse.json({ error: 'PIN doit être 4-6 chiffres' }, { status: 400 });
    if (FORBIDDEN.has(newPIN)) return NextResponse.json({ error: 'PIN trop simple' }, { status: 400 });
    if (newPIN === currentPIN) return NextResponse.json({ error: 'Nouveau PIN identique' }, { status: 400 });

    const user = getUsers().find(u => u.id === session.id && u.companyId === session.companyId);
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    if (!verifyPin(currentPIN, user.pinHash)) return NextResponse.json({ error: 'PIN actuel incorrect' }, { status: 401 });

    user.pinHash = hashPin(newPIN);
    (user as any).lastPinChangeAt = new Date().toISOString();

    return NextResponse.json({ success: true, message: 'PIN modifié' });
  } catch (e) {
    console.error('Erreur changement PIN:', e);
    return NextResponse.json({ error: 'Erreur interne serveur' }, { status: 500 });
  }
}
