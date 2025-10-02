import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonSafe } from "@/lib/json";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.organizationId) {
      return NextResponse.json({ error: "Session requise" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    const limitParam = searchParams.get("limit") || "50";
    
    const where: any = { organizationId: session.organizationId };
    if (userIdParam) {
      where.userId = Number(userIdParam);
    }
    
    const items = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Number(limitParam)
    });
    
    return NextResponse.json(jsonSafe(items));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.organizationId) {
      return NextResponse.json({ error: "Session requise" }, { status: 401 });
    }

    const body = await request.json();
    const { content, kind = "user", channel = "app", metadata = {} } = body;
    
    const msg = await prisma.message.create({
      data: { 
        organizationId: session.organizationId,
        userId: session.userId ?? null, 
        content, 
        kind, 
        channel, 
        metadata 
      }
    });
    
    return NextResponse.json(jsonSafe(msg), { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
