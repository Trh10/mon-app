type AuditEvent = { actor: string; action: string; target?: string; meta?: Record<string, any>; ts?: number };

export async function logAction(ev: AuditEvent) {
  const payload = { ...ev, ts: ev.ts ?? Date.now() };
  // eslint-disable-next-line no-console
  console.log("AUDIT", payload);
  try {
    await fetch("/api/audit/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch {}
}