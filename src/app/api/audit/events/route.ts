import { NextResponse } from "next/server";
import { listAudit } from "@/lib/audit/store";

export async function GET() {
  return NextResponse.json({ items: listAudit(200) });
}