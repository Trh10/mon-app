"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const RichEditor = dynamic(() => import('@/components/meetings/RichEditor'), { ssr: false });

export default function MeetingRoom({ params }: { params: { id: string } }) {
  const { id } = params;
  const [meeting, setMeeting] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/meetings/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || 'Impossible de charger la réunion'); return; }
      setMeeting(data.meeting);
      setNotes(data.meeting?.notes || '');
      setTitle(data.meeting?.title || '');
      setCanManage(Boolean(data.canManage));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Erreur réseau');
    }
  }

  useEffect(() => { load(); }, [id]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, notes }) });
      if (res.ok) await load();
    } finally { setSaving(false); }
  }

  async function finalize() {
    setFinalizing(true);
    try {
      const res = await fetch(`/api/meetings/${id}/finalize`, { method: 'POST' });
      if (res.ok) await load();
    } finally { setFinalizing(false); }
  }

  const when = useMemo(() => {
    const created = (meeting && meeting.createdAt) ? new Date(meeting.createdAt) : null;
    if (!created || isNaN(created.getTime())) return { date: '', time: '' };
    const date = created.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const time = created.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return { date, time };
  }, [meeting?.createdAt]);

  if (error) return (
    <div className="p-4">
      <div className="mb-2"><Link href="/" className="text-blue-600">← Retour</Link></div>
      <div className="text-red-600">{error}</div>
    </div>
  );

  if (!meeting) return (
    <div className="p-4">
      <div className="mb-2"><Link href="/" className="text-blue-600">← Retour</Link></div>
      Chargement…
    </div>
  );

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-blue-600">← Retour</Link>
          <input className="border rounded px-2 py-1 bg-white text-gray-900" value={title} onChange={e => setTitle(e.target.value)} disabled={!canManage} />
          <span className={`text-xs px-2 py-0.5 rounded ${meeting.status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{meeting.status === 'finalized' ? 'Finalisée' : 'Brouillon'}</span>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <button className="px-3 py-1 border rounded" onClick={save} disabled={saving}>Enregistrer</button>
              <button className="px-3 py-1 bg-black text-white rounded" onClick={finalize} disabled={finalizing || meeting.status === 'finalized'}>Finaliser</button>
            </>
          )}
        </div>
      </div>
      <div className="text-sm text-gray-600">Réunion du {when.date} à {when.time}</div>
      <div className="bg-white rounded">
        {canManage ? (
          <RichEditor value={notes} onChange={(html) => setNotes(html)} readOnly={false} />
        ) : (
          <div className="prose max-w-none border rounded p-3 bg-white" dangerouslySetInnerHTML={{ __html: notes || '<p><em>Aucun contenu</em></p>' }} />
        )}
      </div>
      {meeting.extractedActions?.length ? (
        <div className="text-sm text-gray-700">
          Actions détectées: {meeting.extractedActions.length} · Tâches créées: {meeting.tasksCreated?.length || 0}
        </div>
      ) : null}
    </div>
  );
}
