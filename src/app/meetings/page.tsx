"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function MeetingsIndex() {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');

  async function load() {
    const res = await fetch('/api/meetings', { cache: 'no-store' });
    const data = await res.json();
    if (res.ok) setItems(data.items || []);
  }

  useEffect(() => { load(); }, []);

  async function create() {
    const t = title.trim(); if (!t) return;
    const res = await fetch('/api/meetings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: t, notes: '' }) });
    if (res.ok) { setTitle(''); await load(); }
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <input className="border rounded px-2 py-1 bg-white text-gray-900 placeholder-gray-400" placeholder="Titre de la réunion" value={title} onChange={e => setTitle(e.target.value)} />
        <button className="px-3 py-1 bg-black text-white rounded" onClick={create}>Créer</button>
      </div>
      <div className="divide-y">
        {items.map((m) => (
          <Link key={m.id} href={`/meetings/${m.id}`} className="block px-1 py-2 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-gray-500">{new Date(m.updatedAt).toLocaleString()} · {m.status === 'finalized' ? 'Finalisée' : 'Brouillon'}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${m.status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{m.status === 'finalized' ? 'OK' : 'Draft'}</span>
            </div>
          </Link>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-gray-500 p-2">Aucune réunion pour l'instant.</div>
        )}
      </div>
    </div>
  );
}
