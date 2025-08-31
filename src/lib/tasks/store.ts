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
  const now = Date.now();
  return [
    {
      id: "t-1",
      userId: "u-alice",
      title: "Kick-off client X",
      project: "Client X",
      status: "done",
      updatedAt: now - 86400000 * 2,
      createdAt: now - 86400000 * 3,
      createdBy: { id: "u-dina", name: "Dina" },
      dueAt: now - 86400000 * 2,
    },
    {
      id: "t-2",
      userId: "u-alice",
      title: "Roadmap Q4",
      project: "Interne",
      status: "in_progress",
      updatedAt: now - 3600_000,
      createdAt: now - 86400000,
      createdBy: { id: "u-dina", name: "Dina" },
      dueAt: now + 2 * 86400000,
    },
    {
      id: "t-3",
      userId: "u-bob",
      title: "Préparer devis",
      project: "Client Y",
      status: "in_progress",
      updatedAt: now - 2 * 3600_000,
      createdAt: now - 2 * 86400000,
      createdBy: { id: "u-alice", name: "Alice" },
      dueAt: now + 3600_000,
    },
    {
      id: "t-4",
      userId: "u-chris",
      title: "Suivi prospects",
      project: "CRM",
      status: "todo",
      updatedAt: now - 3 * 86400000,
      createdAt: now - 3 * 86400000,
      createdBy: { id: "u-alice", name: "Alice" },
      dueAt: null,
    },
    {
      id: "t-5",
      userId: "u-dina",
      title: "Budget 2025",
      project: "Direction",
      status: "in_progress",
      updatedAt: now - 7200_000,
      createdAt: now - 7200_000,
      createdBy: { id: "u-dina", name: "Dina" },
      dueAt: now + 5 * 86400000,
    },
  ];
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