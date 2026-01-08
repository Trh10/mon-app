import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    return NextResponse.json({
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        userCount: org._count.users,
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
