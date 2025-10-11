"use client";

import { useState, useEffect } from 'react';
import { Users, ListChecks } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  displayRole: string;
  level: number;
  isOnline: boolean;
  lastSeen?: string;
  activeTasks: number;
  completedTasks: number;
  companyId: string;
  joinedAt: string;
  email: string;
  title: string;
}

export default function TeamPanel({ onClose }: { onClose: () => void }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<TeamMember | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  // Charger les tâches du membre actif
  useEffect(() => {
    if (!active) return;
    (async () => {
      try {
        setTasksLoading(true);
        const res = await fetch(`/api/team/tasks?assignedTo=${active.id}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setTasks(data.tasks || []);
        } else {
          setTasks([]);
        }
      } finally {
        setTasksLoading(false);
      }
    })();
  }, [active]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/team/directory', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur chargement équipe');
        setMembers(data.items || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Écoute des mises à jour de tâches pour actualiser si le panneau d'un membre est ouvert
  useEffect(() => {
    function onTasksUpdated(e: any) {
      if (!active) return;
      const detail = e.detail || {};
      if (detail.userId === active.id) {
        // rechargement silencieux des tâches
        fetch(`/api/team/tasks?assignedTo=${active.id}`)
          .then(r => r.json())
          .then(d => { if (d.success) setTasks(d.tasks || []); });
      }
    }
    window.addEventListener('tasks:updated', onTasksUpdated as any);
    return () => window.removeEventListener('tasks:updated', onTasksUpdated as any);
  }, [active]);

  const filtered = members.filter(m => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return [m.name, m.role, m.email, m.title].some(x => String(x).toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-white border-l border-gray-300 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="font-semibold">Équipe</div>
        <button onClick={onClose} className="px-2 py-1 rounded-md hover:bg-gray-100">✕</button>
      </div>

      <div className="p-3 border-b">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email, rôle, poste…"
          className="w-full border rounded-md px-2 py-1"
        />
      </div>

      <div className="p-3 overflow-auto">
        {loading && <div className="text-sm text-gray-500">Chargement…</div>}
        {error && <div className="text-sm text-red-600">⚠️ {error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-sm text-gray-500">Aucun membre.</div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <ul className="space-y-2">
            {filtered.map(m => (
              <li key={m.id}>
                <button
                  onClick={() => setActive(m)}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-left"
                >
                  <span className={`w-2 h-2 rounded-full ${m.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} title={m.isOnline ? 'En ligne' : 'Hors ligne'} />
                  <div className="flex-1">
                    <div className="font-medium">{m.name} <span className="text-xs text-gray-500">· {m.role}</span></div>
                    <div className="text-xs text-gray-500">{m.title} — {m.email}</div>
                  </div>
                  {m.isOnline && <span className="text-xs text-green-600">En ligne</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {active && (
        <div className="absolute inset-0 bg-black/30 flex items-start justify-end" onClick={() => setActive(null)}>
          <div className="bg-white rounded-l-lg shadow-xl p-4 w-[420px] h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-lg">{active.name}</div>
                <div className="text-sm text-gray-600">{active.role}</div>
              </div>
              <button onClick={() => setActive(null)} className="text-sm px-2 py-1 hover:bg-gray-100 rounded">✕</button>
            </div>
            {active.email && (
              <p className="text-xs text-gray-500 mb-2">Email: {active.email}</p>
            )}
            <div className="text-xs text-gray-500 mb-4">Inscrit le {new Date(active.joinedAt).toLocaleDateString('fr-FR')}</div>
            <div className="flex items-center gap-2 mb-2 text-sm font-medium">
              <ListChecks className="w-4 h-4" /> Tâches
            </div>
            {tasksLoading && <div className="text-xs text-gray-500">Chargement des tâches...</div>}
            {!tasksLoading && tasks.length === 0 && <div className="text-xs text-gray-500">Aucune tâche.</div>}
            {!tasksLoading && tasks.length > 0 && (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-1">En cours</div>
                  <ul className="space-y-1">
                    {tasks.filter(t => t.status !== 'completed').map(t => (
                      <li key={t.id} className="p-2 rounded-md border text-xs flex items-center justify-between">
                        <span>{t.title}</span>
                        <span className="text-[10px] uppercase text-gray-500">{t.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-1">Terminées</div>
                  <ul className="space-y-1">
                    {tasks.filter(t => t.status === 'completed').map(t => (
                      <li key={t.id} className="p-2 rounded-md border bg-green-50 text-xs flex items-center justify-between">
                        <span>{t.title}</span>
                        <span className="text-[10px] uppercase text-green-600">OK</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}