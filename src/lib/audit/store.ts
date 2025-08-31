import type { Role } from "../auth/roles";

export type AuditUser = { id: string; name: string; role: Role };
export type AuditEvent = {
  id: string;
  ts: number;
  room: string;
  event: string;
  user: AuditUser;
  payload: any;
  summary: string;
};

const g = globalThis as any;
if (!g.__AUDIT_EVENTS) g.__AUDIT_EVENTS = [] as AuditEvent[];
const events: AuditEvent[] = g.__AUDIT_EVENTS;

export function addAudit(ev: Omit<AuditEvent, "id">) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record: AuditEvent = { id, ...ev };
  events.push(record);
  if (events.length > 1000) events.splice(0, events.length - 1000);
  return record;
}

export function listAudit(limit = 200): AuditEvent[] {
  return events.slice(-limit);
}