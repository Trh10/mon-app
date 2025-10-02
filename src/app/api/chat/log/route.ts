import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const LOG_FILE = join(process.cwd(), 'data', 'chat-log.json');

type StoredMsg = { id: string; room: string; user: { id: string; name: string; role?: string }; text: string; ts: number };

function load(): StoredMsg[] {
  try { if (!existsSync(LOG_FILE)) return []; return JSON.parse(readFileSync(LOG_FILE, 'utf8')); } catch { return []; }
}
function save(list: StoredMsg[]) {
  try { mkdirSync(dirname(LOG_FILE), { recursive: true }); writeFileSync(LOG_FILE, JSON.stringify(list.slice(-5000), null, 2), 'utf8'); } catch (e) { console.warn('[chat/log] save fail', e); }
}

export async function POST(req: NextRequest) {
  try {
    const { id, room, user, text, ts } = await req.json();
    if (!id || !room || !user || !text) return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    const list = load();
    if (!list.find(m => m.id === id)) { list.push({ id, room, user, text, ts: ts || Date.now() }); save(list); }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room');
  const limit = Number(searchParams.get('limit') || '200');
  const list = load();
  const filtered = room ? list.filter(m => m.room === room) : list;
  return NextResponse.json({ ok: true, items: filtered.slice(-limit) });
}