import { NextResponse } from 'next/server';
import { runtimeStorageInfo } from '@/lib/serverlessStorage';

export async function GET() {
  try {
    const storage = runtimeStorageInfo();
    const envPresence = {
      GROQ_API_KEY: !!process.env.GROQ_API_KEY,
      NEXT_PUBLIC_TINYMCE_KEY: !!process.env.NEXT_PUBLIC_TINYMCE_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    };
    return NextResponse.json({
      success: true,
      mode: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      storage,
      resetSeedOnProd: process.env.RESET_SEED_ON_PROD === 'true',
      env: envPresence,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'runtime_status_error' }, { status: 500 });
  }
}
