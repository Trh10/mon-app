import { getIronSession, SessionOptions } from "iron-session";
import { NextRequest, NextResponse } from "next/server";

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
  const session = await getIronSession<SessionData>(req, new NextResponse(), sessionOptions);
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