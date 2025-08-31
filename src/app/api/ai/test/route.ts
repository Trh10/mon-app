import { NextResponse } from "next/server";

export async function GET() {
  console.log("🔍 API Test appelée");
  return NextResponse.json({ 
    message: "API AI fonctionne parfaitement !",
    timestamp: new Date().toISOString(),
    user: "Trh10",
    routes: {
      test: "/api/ai/test",
      summarize: "/api/ai/summarize"
    }
  });
}

export async function POST() {
  console.log("🔍 API Test POST appelée");
  return NextResponse.json({ 
    message: "POST API AI fonctionne aussi !",
    timestamp: new Date().toISOString()
  });
}