"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "chef" | "manager" | "assistant" | "employe";
type Member = { id: string; name: string; role: Role; title: string; email: string };
type Task = {
  id: string;
  userId: string;
  title: string;
  project: string;
  status: "todo" | "in_progress" | "done";
  updatedAt: number;
  createdAt: number;
  createdBy: { id: string; name: string };
  dueAt?: number | null;
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
  const [project, setProject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [dueText, setDueText] = useState("");
  const [saving, setSaving] = useState(false);

  const canAssignAnyone = currentUser.role === "chef";

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/team/directory", { cache: "no-store" });
      const data = await res.json();
      const items: Member[] = data?.items || [];
      setDirectory(items);
      // Par défaut: si employé -> lui-même; si chef -> lui-même (modifiable)
      const defaultId = items.find((m) => m.id === currentUser.id)?.id || currentUser.id || items[0]?.id || "";
      setAssigneeId(defaultId);
    })();
  }, [currentUser.id]);

  useEffect(() => {
    if (!assigneeId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/team/tasks?userId=${encodeURIComponent(assigneeId)}`, { cache: "no-store" });
        const data = await res.json();
        setTasks((data?.items || []) as Task[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [assigneeId]);

  async function addTask() {
    if (!title.trim() || !project.trim() || !assigneeId) return;
    setSaving(true);
    try {
      // Si l'utilisateur n'est pas chef, forcer l'assignation à lui-même côté client
      const targetUserId = canAssignAnyone ? assigneeId : currentUser.id;
      const res = await fetch("/api/team/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: currentUser,
          userId: targetUserId,
          title: title.trim(),
          project: project.trim(),
          dueDate: dueDate || undefined,
          dueTime: dueTime || undefined,
          dueText: dueText || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || "Erreur lors de l'ajout");
        return;
      }
      const created = data.task as Task;
      // Rafraîchir la liste si on est sur la même personne
      if (created.userId === assigneeId) {
        setTasks((prev) => [created, ...prev]);
      }
      // Reset form
      setTitle("");
      setProject("");
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
                disabled={!canAssignAnyone}
                className="border rounded-md px-2 py-1 disabled:opacity-60"
                title={canAssignAnyone ? "Choisir un membre" : "Seul un chef peut assigner à quelqu'un d'autre"}
              >
                {(canAssignAnyone ? directory : directory.filter((m) => m.id === currentUser.id)).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.role}
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
              placeholder='Projet (ex: "Client X" ou "Interne")'
              className="border rounded-md px-2 py-1"
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
              {tasks.map((t) => (
                <li key={t.id} className="flex items-start gap-2">
                  <span
                    className={`mt-2 inline-block w-2 h-2 rounded-full ${
                      t.status === "done" ? "bg-green-500" : t.status === "in_progress" ? "bg-blue-500" : "bg-gray-300"
                    }`}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-gray-500">
                      {t.project} — {t.status}
                      {t.dueAt ? ` · Échéance: ${new Date(t.dueAt).toLocaleString()}` : ""}
                    </div>
                    <div className="text-xs text-gray-400">
                      Ajoutée par {t.createdBy?.name} · {new Date(t.createdAt).toLocaleString()}
                    </div>
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