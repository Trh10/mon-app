export type Task = {
  id: string;
  userId: string;        // assigné à
  title: string;
  project: string;
  status: "todo" | "in_progress" | "done";
  updatedAt: number;
  createdAt: number;
  createdBy: { id: string; name: string }; // qui a créé (le chef)
  dueAt?: number | null; // timestamp ms
};

const g = globalThis as any;
if (!g.__TASKS_STORE__) g.__TASKS_STORE__ = seed();
const store: Task[] = g.__TASKS_STORE__;

function seed(): Task[] {
  // Pas de tâches fictives - les vraies tâches seront ajoutées dynamiquement
  return [];
}

export function listTasksByUser(userId: string) {
  return store
    .filter((t) => t.userId === userId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function addTask(input: {
  userId: string;
  title: string;
  project: string;
  createdBy: { id: string; name: string };
  dueAt?: number | null;
}) {
  const now = Date.now();
  const task: Task = {
    id: `t-${now}-${Math.random().toString(36).slice(2, 8)}`,
    userId: input.userId,
    title: input.title,
    project: input.project,
    status: "todo",
    updatedAt: now,
    createdAt: now,
    createdBy: input.createdBy,
    dueAt: input.dueAt ?? null,
  };
  store.push(task);
  return task;
}