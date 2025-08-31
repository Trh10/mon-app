import { NextResponse } from "next/server";
import { getOverview } from "@/lib/analytics";

export async function GET() {
  const data = getOverview();
  return NextResponse.json(data);
}