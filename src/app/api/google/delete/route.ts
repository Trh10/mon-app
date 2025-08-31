import { NextRequest, NextResponse } from "next/server";
import { getAuthedGmail } from "@lib/google";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { messageId } = await req.json();
    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId" }, { status: 400 });
    }

    const gmail = getAuthedGmail();
    
    // Supprime définitivement
    await gmail.users.messages.delete({
      userId: "me",
      id: messageId
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const m = e?.message || "Error";
    const status = m.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ error: m }, { status });
  }
}