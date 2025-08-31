"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Role = "chef" | "manager" | "assistant" | "employe";
type Member = { id: string; name: string; role: Role; title: string; email: string; avatar?: string };
type Task = { id: string; title: string; project: string; status: "todo" | "in_progress" | "done"; updatedAt: number; createdAt: number; createdBy: { id: string; name: string }; dueAt?: number | null };
type Audit = { id: string; ts: number; event: string; summary: string };
type SharedFile = { id: string; name: string; size: number; mime: string; url: string; createdAt: number; from: { id: string; name: string }; toUserId?: string };

export default function UserDrawer({
  member,
  online,
  onClose,
  currentUser, // l'utilisateur courant (peut être chef)
}: {
  member: Member;
  online: boolean;
  onClose: () => void;
  currentUser: { id: string; name: string; role: Role };
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<Aduit[]>([] as any);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sending, setSending] = useState(false);
  const [fileNote, setFileNote] = useState("");

  const todayInfo = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startYesterday = startToday - 86400000;
    const today = activity.filter((a: any) => a.ts >= startToday).length;
    const yesterday = activity.filter((a: any) => a.ts >= startYesterday && a.ts < startToday).length;
    const currentTask = tasks.find((t) => t.status === "in_progress");
    const project = currentTask?.project || tasks.slice().reverse().find(Boolean)?.project || "—";
    return { today, yesterday, project };
  }, [activity, tasks]);

  useEffect(() => {
    (async () => {
      const [tRes, aRes, fRes] = await Promise.all([
        fetch(`/api/team/tasks?userId=${encodeURIComponent(member.id)}`, { cache: "no-store" }),
        fetch(`/api/team/activity?userId=${encodeURIComponent(member.id)}`, { cache: "no-store" }),
        fetch(`/api/files/list?userId=${encodeURIComponent(member.id)}`, { cache: "no-store" }),
      ]);
      const t = await tRes.json();
      const a = await aRes.json();
      const f = await fRes.json();
      setTasks(t?.items || []);
      setActivity(a?.items || []);
      setFiles(f?.items || []);
    })();
  }, [member.id]);

  async function handleSendFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("actorId", currentUser.id);
      fd.append("actorName", currentUser.name);
      fd.append("actorRole", currentUser.role);
      fd.append("scope", "direct");
      fd.append("toUserId", member.id);
      if (fileNote.trim()) fd.append("message", fileNote.trim());
      fd.append("file", file, file.name);

      const res = await fetch("/api/files/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || "Envoi échoué");
      } else {
        setFiles((prev) => [data.file, ...prev]);
        setFileNote("");
      }
    } catch {
      alert("Erreur réseau");
    } finally {
      setSending(false);
      e.currentTarget.value = "";
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-white border-l border-gray-300 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <div className="font-semibold">
            {member.name} <span className="text-xs text-gray-500">· {member.role}</span>
          </div>
          <div className="text-sm text-gray-500">
            {member.title} — {member.email}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${online ? "bg-green-500" : "bg-gray-300"}`} title={online ? "En ligne" : "Hors ligne"} />
          <button onClick={onClose} className="px-2 py-1 rounded-md hover:bg-gray-100">✕</button>
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-auto">
        <section className="border rounded-md p-3">
          <div className="font-semibold mb-1">Résumé</div>
          <div className="text-sm text-gray-700">
            - En ligne: {online ? "Oui" : "Non"}<br />
            - Projet actuel: {todayInfo.project}<br />
            - Activité aujourd'hui: {todayInfo.today} évènement(s)<br />
            - Activité hier: {todayInfo.yesterday} évènement(s)
          </div>
        </section>

        <section className="border rounded-md p-3">
          <div className="font-semibold mb-2">Envoyer un fichier à {member.name}</div>
          <div className="grid gap-2">
            <input
              value={fileNote}
              onChange={(e) => setFileNote(e.target.value)}
              placeholder="Message (optionnel)"
              className="border rounded-md px-2 py-1"
            />
            <div className="flex items-center gap-2">
              <button onClick={() => fileInputRef.current?.click()} disabled={sending} className="px-3 py-2 rounded-md border">
                {sending ? "Envoi…" : "Choisir un fichier"}
              </button>
              <span className="text-xs text-gray-500">Le fichier sera visible ici et téléchargeable.</span>
            </div>
            <input ref={fileInputRef} type="file" onChange={handleSendFile} hidden />
          </div>
        </section>

        <section className="border rounded-md p-3">
          <div className="font-semibold mb-2">Fichiers échangés</div>
          {files.length === 0 ? (
            <div className="text-sm text-gray-500">Aucun fichier.</div>
          ) : (
            <ul className="space-y-2">
              {files.map((f) => (
                <li key={f.id} className="text-sm">
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {f.name}
                  </a>{" "}
                  <span className="text-gray-500">({Math.round((f as any).size / 1024)} Ko)</span>
                  <div className="text-xs text-gray-500">
                    {f.from?.id === member.id ? "Envoyé par" : "Envoyé à"} {f.from?.name} · {new Date(f.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border rounded-md p-3">
          <div className="font-semibold mb-2">Tâches</div>
          {tasks.length === 0 ? (
            <div className="text-sm text-gray-500">Aucune tâche.</div>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-start gap-2">
                  <span className={`mt-2 inline-block w-2 h-2 rounded-full ${
                    t.status === "done" ? "bg-green-500" : t.status === "in_progress" ? "bg-blue-500" : "bg-gray-300"
                  }`} />
                  <div className="flex-1">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-gray-500">
                      {t.project} — {t.status}
                      {t.dueAt ? ` · Échéance: ${new Date(t.dueAt).toLocaleString()}` : ""}
                    </div>
                    <div className="text-xs text-gray-400">
                      Assignée par {t.createdBy?.name} · {new Date(t.createdAt).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border rounded-md p-3">
          <div className="font-semibold mb-2">Activité récente</div>
          {activity.length === 0 ? (
            <div className="text-sm text-gray-500">Aucune activité récente.</div>
          ) : (
            <ul className="space-y-2">
              {(activity as any).slice().reverse().map((a: any) => (
                <li key={a.id} className="text-sm">
                  <span className="text-gray-500 mr-2">{new Date(a.ts).toLocaleString()}</span>
                  {a.summary}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}