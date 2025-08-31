import { google } from "googleapis";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send"
];

function getRedirectUri() {
  return process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || "http://localhost:3000/api/google/callback";
}

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET manquants dans .env.local");
  }
  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
}

export function getAuthUrl() {
  const oAuth2Client = getOAuthClient();
  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES
  });
}

const COOKIE_NAME = "pepite_google_tokens";

export type GoogleTokens = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
};

export function readTokensFromCookie(): GoogleTokens | null {
  const c = cookies();
  const raw = c.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeTokensToResponse(res: NextResponse, tokens: GoogleTokens) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: JSON.stringify(tokens),
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });
}

export function clearTokensOnResponse(res: NextResponse) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export function getAuthedGmail() {
  const tokens = readTokensFromCookie();
  if (!tokens || !tokens.access_token) throw new Error("Not authenticated");
  const oAuth2Client = getOAuthClient();
  oAuth2Client.setCredentials(tokens);
  return google.gmail({ version: "v1", auth: oAuth2Client });
}

export function normalizeHeader(headers: Array<{ name: string; value: string }> | undefined, key: string) {
  const h = headers?.find((x) => x.name.toLowerCase() === key.toLowerCase());
  return h?.value || "";
}

export function parseFrom(value: string) {
  const m = value.match(/^(.*?)(?:\s*<([^>]+)>)?$/);
  const fromName = (m?.[1] || "").replace(/"/g, "").trim();
  const from = (m?.[2] || m?.[1] || "").trim();
  return { fromName: fromName || from, from };
}

export function scorePriority(subject: string, snippet: string) {
  const t = (subject + " " + snippet).toLowerCase();
  if (/(urgent|urgence|asap|immédiat|immediat|avant|deadline)/.test(t)) return "P1";
  if (/(important|priorité|priorite)/.test(t)) return "P2";
  return "P3";
}