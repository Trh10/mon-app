import { getIronSession, SessionOptions } from "iron-session";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export interface SessionData {
  organizationId?: number;
  organizationSlug?: string;
  userId?: number;
  userRole?: string;
  userName?: string;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD || "default-32-char-secret-change-in-production!",
  cookieName: "icones-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    sameSite: "lax",
  },
};

export async function getSession(req: NextRequest): Promise<SessionData> {
  // 1. Essayer d'abord iron-session
  const session = await getIronSession<SessionData>(req, new NextResponse(), sessionOptions);
  
  if (session.organizationId && session.userId) {
    return session;
  }

  // 2. Fallback: lire le cookie legacy 'user-session' si iron-session est vide
  try {
    const cookieStore = cookies();
    const legacyCookie = cookieStore.get('user-session');
    
    if (legacyCookie?.value) {
      const userData = JSON.parse(legacyCookie.value);
      
      // Essayer de trouver l'organization correcte depuis le cookie organizationId
      let orgId: number | undefined;
      const orgCookie = cookieStore.get('organizationId');
      if (orgCookie?.value) {
        orgId = parseInt(orgCookie.value, 10);
      }
      
      // Retourner une session simulée depuis le cookie legacy
      return {
        organizationId: orgId,
        organizationSlug: userData.companyCode?.toLowerCase() || 'default',
        userId: parseInt(userData.id) || undefined,
        userRole: userData.role || userData.levelName,
        userName: userData.name,
      };
    }
  } catch (e) {
    console.error('Failed to read legacy session cookie:', e);
  }

  // 3. Fallback: cookie organizationId simple
  try {
    const cookieStore = cookies();
    const orgCookie = cookieStore.get('organizationId');
    if (orgCookie?.value) {
      return {
        organizationId: parseInt(orgCookie.value, 10)
      };
    }
  } catch {}

  return session;
}

export async function setSession(req: NextRequest, res: NextResponse, data: Partial<SessionData>) {
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  Object.assign(session, data);
  await session.save();
}

export async function clearSession(req: NextRequest, res: NextResponse) {
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  session.destroy();
}