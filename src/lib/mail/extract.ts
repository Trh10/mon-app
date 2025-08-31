// Extraction depuis un objet Gmail Message (format "full")
type Header = { name: string; value: string };
type Body = { data?: string; size?: number };
type Part = {
  mimeType?: string;
  filename?: string;
  headers?: Header[];
  body?: Body;
  parts?: Part[];
};
type GmailMessage = {
  id?: string;
  snippet?: string;
  payload?: {
    mimeType?: string;
    headers?: Header[];
    body?: Body;
    parts?: Part[];
  };
};

function b64urlDecode(input?: string): string {
  if (!input) return "";
  try {
    const data = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = data.length % 4 === 0 ? "" : "=".repeat(4 - (data.length % 4));
    if (typeof atob !== "undefined") {
      const s = atob(data + pad);
      return decodeURIComponent(
        Array.prototype.map
          .call(s, (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
    } else {
      return Buffer.from(data + pad, "base64").toString("utf8");
    }
  } catch {
    try {
      if (typeof atob !== "undefined") return atob(input!);
      return Buffer.from(input!, "base64").toString("utf8");
    } catch {
      return "";
    }
  }
}

function findHeader(headers: Header[] | undefined, name: string): string {
  if (!headers) return "";
  const h = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return h?.value || "";
}

function collectParts(p: Part | undefined, out: { html?: string; text?: string }) {
  if (!p) return;
  const mt = (p.mimeType || "").toLowerCase();

  if (p.body?.data) {
    const decoded = b64urlDecode(p.body.data);
    if (mt === "text/html") out.html = (out.html || "") + decoded;
    else if (mt === "text/plain") out.text = (out.text || "") + decoded;
  }
  if (Array.isArray(p.parts)) {
    for (const child of p.parts) collectParts(child, out);
  }
}

export function extractFromGmailMessage(message: GmailMessage): {
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
} {
  const payload = message?.payload || {};
  const subject = findHeader(payload.headers, "Subject");

  const out: { html?: string; text?: string } = {};
  if (payload.body?.data && payload.mimeType) {
    const decoded = b64urlDecode(payload.body.data);
    if ((payload.mimeType || "").toLowerCase() === "text/html") out.html = decoded;
    else if ((payload.mimeType || "").toLowerCase() === "text/plain") out.text = decoded;
  }
  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) collectParts(part, out);
  }
  if (!out.html && !out.text && message?.snippet) {
    out.text = message.snippet;
  }

  return { subject, bodyHtml: out.html, bodyText: out.text };
}