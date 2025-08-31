export type SendPayload = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  threadId?: string;
  headers?: Record<string, string>;
  attachments?: { filename: string; contentType: string; dataBase64: string }[];
};

export const gmailActions = {
  async me() {
    const r = await fetch("/api/google/me", { cache: "no-store" });
    if (!r.ok) throw new Error(`me: HTTP ${r.status}`);
    return r.json();
  },
  async list() {
    const r = await fetch("/api/google/list", { cache: "no-store" });
    if (!r.ok) throw new Error(`list: HTTP ${r.status}`);
    return r.json();
  },
  async getMessage(id: string) {
    const r = await fetch(`/api/google/message?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`message: HTTP ${r.status}`);
    return r.json();
  },
  attachmentUrl(messageId: string, attachmentId: string) {
    return `/api/google/attachment?messageId=${encodeURIComponent(messageId)}&attachmentId=${encodeURIComponent(attachmentId)}`;
  },
  async send(payload: SendPayload) {
    const r = await fetch("/api/google/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`send: HTTP ${r.status}${t ? `: ${t}` : ""}`);
    }
    return r.json();
  },
  async disconnect() {
    const r = await fetch("/api/google/disconnect", { method: "POST" });
    if (!r.ok) throw new Error(`disconnect: HTTP ${r.status}`);
  },
  connect() {
    window.location.href = "/api/google/auth";
  },
};