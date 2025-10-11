// Centralisation & validation des variables d'environnement
// Usage: import { env } from '@/config/env'

function requireVar(name: string, optional = false, fallback?: string): string | undefined {
  const v = process.env[name];
  if (v && v.trim() !== '') return v;
  if (fallback !== undefined) return fallback;
  if (!optional) {
    console.warn(`[ENV] Variable manquante: ${name}`);
  }
  return undefined;
}

export const env = {
  appName: requireVar('APP_NAME', true, 'Collab Suite')!,
  companyDefault: requireVar('COMPANY_DEFAULT', true, 'ACME')!,
  googleClientId: requireVar('GOOGLE_CLIENT_ID', true),
  googleClientSecret: requireVar('GOOGLE_CLIENT_SECRET', true),
  googleRedirectUri: requireVar('GOOGLE_REDIRECT_URI', true),
  groqKey: requireVar('GROQ_API_KEY', true),
  openaiKey: requireVar('OPENAI_API_KEY', true) || requireVar('NEXT_PUBLIC_OPENAI_API_KEY', true),
  anthropicKey: requireVar('ANTHROPIC_API_KEY', true),
  tinymceKey: requireVar('NEXT_PUBLIC_TINYMCE_KEY', true),
  smtpHost: requireVar('SMTP_HOST', true),
  smtpPort: requireVar('SMTP_PORT', true),
  smtpUser: requireVar('SMTP_USER', true),
  smtpPass: requireVar('SMTP_PASS', true),
  disableAutoSummary: requireVar('DISABLE_AUTO_SUMMARY', true),
  enableDebugLogs: requireVar('ENABLE_DEBUG_LOGS', true)
};

export type EnvShape = typeof env;

// Petit helper pour vérifier rapidement dans un script ou route
export function reportMissingEnv(): string[] {
  const requiredCore = ['APP_NAME']; // ajouter ici si vous passez une variable en "obligatoire" stricte
  return requiredCore.filter(k => !process.env[k]);
}
