import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: false, reason: 'auto-register disabled' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ ok: false, reason: 'auto-register disabled' }, { status: 404 });
}

// Route désactivée : aucun handler métier. Export vide pour garantir un module valide.
export {};
