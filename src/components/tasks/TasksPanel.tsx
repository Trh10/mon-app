"use client";

import { useEffect, useMemo, useState } from "react";
import { canAssignTaskTo, getAssignableUsers, UserRole, getRoleDisplayName } from "@/lib/permissions";

type Role = UserRole;
type Member = { id: string; name: string; role: Role; title: string; email: string };
// Adapted to backend Task shape
type Task = {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  assignedBy: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  isPrivate: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
};

export default function TasksPanel({
  currentUser,
  onClose,
}: {
  currentUser: { id: string; name: string; role: Role };
  onClose: () => void;
}) {
  const [directory, setDirectory] = useState<Member[]>([]);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [project, setProject] = useState(""); // short project/context
  const [detail, setDetail] = useState(""); // long description
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [dueText, setDueText] = useState("");
  const [saving, setSaving] = useState(false);

  // Calculer les utilisateurs auxquels on peut assigner des tâches
  const assignableUsers = useMemo(() => {
    return getAssignableUsers(currentUser.role, directory);
  }, [currentUser.role, directory]);

  // Vérifier si l'utilisateur peut assigner des tâches
  const canAssignTasks = ["chef", "administration", "finance"].includes(currentUser.role);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/team/directory", { cache: "no-store" });
      const data = await res.json();
      const items: Member[] = data?.items || [];
      setDirectory(items);
      
      // Par défaut: si peut assigner -> premier utilisateur assignable; sinon -> lui-même
      if (canAssignTasks && assignableUsers.length > 0) {
        setAssigneeId(assignableUsers[0].id);
      } else {
        setAssigneeId(currentUser.id);
      }
    })();
  }, [currentUser.id]);

  useEffect(() => {
    if (!assigneeId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/team/tasks?assignedTo=${encodeURIComponent(assigneeId)}`, { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && data.success) {
          setTasks((data.tasks || []) as Task[]);
        } else {
          setTasks([]);
        }
      } finally { setLoading(false); }
    })();
  }, [assigneeId]);

  async function addTask() {
    if (!title.trim() || !project.trim() || !detail.trim() || !assigneeId) return;
    setSaving(true);
    try {
      // Si l'utilisateur n'est pas chef, forcer l'assignation à lui-même côté client
      const targetUserId = canAssignTasks ? assigneeId : currentUser.id;
      const res = await fetch("/api/team/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: 'create',
          data: {
            title: title.trim(),
            description: [project.trim(), detail.trim()].filter(Boolean).join(' — '),
            assignedTo: targetUserId,
            priority: 'medium',
            isPrivate: false,
            dueDate: dueDate || undefined
          }
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || "Erreur lors de l'ajout");
        return;
      }
      const created = data.task as Task;
      if (created.assignedTo === assigneeId) {
        setTasks(prev => [created, ...prev]);
      }
      // Dispatch global event for TeamPanel sync
      window.dispatchEvent(new CustomEvent('tasks:updated', { detail: { userId: created.assignedTo } }));
      // Reset form
      setTitle("");
  setProject("");
  setDetail("");
      setDueDate("");
      setDueTime("");
      setDueText("");
    } catch {
      alert("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-white border-l border-gray-300 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="font-semibold">Tâches</div>
        <button onClick={onClose} className="px-2 py-1 rounded-md hover:bg-gray-100">✕</button>
      </div>

      <div className="p-4 space-y-4 overflow-auto">
        <section className="border rounded-md p-3">
          <div className="font-semibold mb-2">Ajouter une tâche</div>

          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-1 gap-1">
              <label className="text-xs text-gray-500">Assigner à</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={!canAssignTasks}
                className="border rounded-md px-2 py-1 disabled:opacity-60"
                title={canAssignTasks ? "Choisir un membre" : "Seuls DG, Administration et Finance peuvent assigner des tâches"}
              >
                {(canAssignTasks ? assignableUsers : directory.filter((m) => m.id === currentUser.id)).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {getRoleDisplayName(m.role)}
                  </option>
                ))}
                {!directory.find((m) => m.id === currentUser.id) && (
                  <option value={currentUser.id}>{currentUser.name} · {currentUser.role}</option>
                )}
              </select>
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Titre (ex: "Préparer le rapport")'
              className="border rounded-md px-2 py-1"
            />
            <input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder='Projet / Contexte (ex: "Client X", "Interne")'
              className="border rounded-md px-2 py-1"
            />
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder='Détails: objectifs, livrables, remarques, étapes...'
              className="border rounded-md px-2 py-2 text-sm min-h-[80px] resize-y"
            />

            <div className="text-xs text-gray-500">Échéance (au choix: date/heure OU texte)</div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="border rounded-md px-2 py-1" />
              <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="border rounded-md px-2 py-1" />
            </div>
            <input
              value={dueText}
              onChange={(e) => setDueText(e.target.value)}
              placeholder='Texte (ex: "lundi", "demain 14:00", "14h")'
              className="border rounded-md px-2 py-1"
            />

            <div className="flex gap-2">
              <button
                onClick={addTask}
                disabled={saving || !title.trim() || !project.trim()}
                className="px-3 py-2 rounded-md bg-gray-900 text-white disabled:opacity-50"
              >
                {saving ? "Ajout..." : "Ajouter"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  const yyyy = today.getFullYear();
                  const mm = String(today.getMonth() + 1).padStart(2, "0");
                  const dd = String(today.getDate()).padStart(2, "0");
                  setDueDate(`${yyyy}-${mm}-${dd}`);
                  setDueTime("17:00");
                }}
                className="px-3 py-2 rounded-md border"
                title="Aujourd'hui 17:00"
              >
                Aujourd'hui 17:00
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  const yyyy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                  const dd = String(d.getDate()).padStart(2, "0");
                  setDueDate(`${yyyy}-${mm}-${dd}`);
                  setDueTime("09:00");
                }}
                className="px-3 py-2 rounded-md border"
                title="Demain 09:00"
              >
                Demain 09:00
              </button>
            </div>
          </div>
        </section>

        <section className="border rounded-md p-3">
          <div className="font-semibold mb-2">
            Tâches de {directory.find((m) => m.id === assigneeId)?.name || "la personne sélectionnée"}
          </div>
          {loading ? (
            <div className="text-sm text-gray-500">Chargement…</div>
          ) : tasks.length === 0 ? (
            <div className="text-sm text-gray-500">Aucune tâche.</div>
          ) : (
            <ul className="space-y-2">
              {tasks.map(t => (
                <li key={t.id} className="flex items-start gap-2">
                  <span className={`mt-2 inline-block w-2 h-2 rounded-full ${t.status === 'completed' ? 'bg-green-500' : t.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <div className="flex-1">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-gray-500">{t.description} — {t.status}</div>
                    <div className="text-xs text-gray-400">Créée le {new Date(t.createdAt).toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}