import { resetAllMemory } from './serverlessStorage';

let done = false;

export function ensureSeedReset() {
  if (done) return;
  const flag = process.env.RESET_SEED_ON_PROD === 'true';
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  if (flag && isProd) {
    resetAllMemory();
  }
  done = true;
}
