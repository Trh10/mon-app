import { NextResponse } from "next/server";
import { listMembers } from "../../../../lib/team/directory";

export async function GET() {
  return NextResponse.json({ items: listMembers() });
}