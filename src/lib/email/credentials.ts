export type CompanyRole = 'directeur' | 'manager' | 'assistant' | 'employe';

export type StoredCredentials = {
  email?: string;
  provider?: string;
  userName?: string;
  companyRole?: CompanyRole;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  imap?: { host?: string; port?: number; secure?: boolean; user?: string; pass?: string };
  smtp?: { host?: string; port?: number; secure?: boolean; user?: string; pass?: string };
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  secure?: boolean;
  timestamp?: string;
  [k: string]: any;
};

export function deriveUserName(email?: string): string {
  if (!email) return "User";
  const local = String(email).split("@")[0] || "user";
  return local
    .split(/[.\-_]/g)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
}

export function nowUTCString() {
  try {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  } catch {
    return "";
  }
}

export function getStoredEmailCredentials(): StoredCredentials | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const b64 = localStorage.getItem("email_credentials");
    if (!b64) return null;
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

export function saveEmailCredentials(creds: StoredCredentials) {
  try {
    const withName = { ...creds, userName: creds.userName || deriveUserName(creds.email) };
    localStorage.setItem("email_credentials", btoa(JSON.stringify(withName)));
  } catch {}
}

export function clearEmailCredentials() {
  try { localStorage.removeItem("email_credentials"); } catch {}
}

export function saveGoogleTokens(tokens: any) {
  try { if (!tokens) return; localStorage.setItem("google_oauth", JSON.stringify(tokens)); } catch {}
}

export function getAuthHeader(): Record<string, string> {
  try {
    if (typeof localStorage === "undefined") return {};
    const b64 = localStorage.getItem("email_credentials");
    if (!b64) return {};
    return { Authorization: `Bearer ${b64}` };
  } catch {
    return {};
  }
}