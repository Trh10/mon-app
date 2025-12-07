// Centralisation branding & identifiants génériques pour déploiement neutre
export const APP_NAME = process.env.APP_NAME || 'ICONES BOX';
export const COMPANY_DEFAULT = process.env.COMPANY_DEFAULT || 'ICONES';
// Legacy identifiers (used in codebase; retain for data mapping / compatibility)
export const LEGACY_BRAND_NAMES = ['ICONES BOX','ICONES'];
export const LEGACY_COMPANY_IDS = ['icones-rdc'];
export const LEGACY_EMAIL_DOMAINS = ['icones.com','icones-rdc.com','pepitemail.com'];
export const COOKIE_GOOGLE_PRIMARY = 'oauth_google_tokens';
// Anciennes valeurs conservées pour compat rétro
export const LEGACY_GOOGLE_COOKIES = ['google-tokens','pepite_google_tokens'];
export const UI_BRAND_CLASSES = {
  header: 'app-header',
  sidebar: 'app-sidebar',
  panel: 'app-panel'
};
export const SYSTEM_EVENT_PREFIX = 'icones'; // remplace pepite
