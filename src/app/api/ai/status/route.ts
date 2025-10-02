import { NextResponse } from 'next/server';

export async function GET() {
  // Lecture variables d'env pour déterminer le mode
  const groq = process.env.GROQ_API_KEY ? true : false;
  const openai = process.env.OPENAI_API_KEY ? true : false;
  const anthropic = process.env.ANTHROPIC_API_KEY ? true : false;
  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
  const providers = { groq, openai, anthropic };
  const activeProviders = Object.entries(providers).filter(([,v]) => v).map(([k]) => k);
  const fallback = activeProviders.length === 0;
  return NextResponse.json({ ok: true, model, providers, activeProviders, fallback });
}