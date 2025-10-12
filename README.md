# Collab Suite (ex-Pepite Mail) — Plateforme Email & Collaboration

Ce dépôt contient une application Next.js (App Router) intégrant:
- Lecture/gestion emails (Gmail OAuth + IMAP / SMTP réel)
- Actions: marquer lu/non lu, archiver, supprimer, reply réel (nodemailer)
- Résumés & assistances IA (Groq → OpenAI → Anthropic fallback)
- Collaboration: présence, chat persistant, réunions avec éditeur riche
- Connexion IMAP réelle (ImapFlow), caching sélectif, diagnostics OAuth Gmail, purge tokens invalides
- Centralisation & neutralisation du branding (`src/config/branding.ts`)

### Fonctionnalités principales
- Vue 3 panneaux + mode focus boîte de réception
- Densités UI (Compact / Dense / Ultra)
- Parsing avancé Gmail & IMAP (HTML + pièces jointes)
- Réponses email avec en-têtes `In-Reply-To` / `References`
- Endpoint statut IA: `/api/ai/status`
- Chat persistant: `/api/chat/log`
- Fallback IA propre (évite JSON brut visible)

### Démarrage rapide
```bash
npm install
npm run dev
# Ouvrir: http://localhost:3000
```

### Build production
```bash
npm run build
npm run start
```

### Variables d'environnement
Copiez `.env.example` vers `.env.local` puis renseignez:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `GROQ_API_KEY`, `OPENAI_API_KEY` (optionnel: `ANTHROPIC_API_KEY`)
- `NEXT_PUBLIC_TINYMCE_KEY` (si éditeur)
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (si envoi custom)

Détails supplémentaires: voir `ENVIRONMENT.md`.

### Structure
```
src/
  app/api/...       # Routes API emails, IA, meetings, team, requisitions
  components/       # UI (Header, EmailList, Readers, Auth, Chat, etc.)
  lib/              # Clients email, AI provider, helpers
  config/           # branding.ts / env.ts
```

### Branding
Anciennes chaînes (ICONES BOX, etc.) centralisées & neutralisées.
Classes CSS legacy `.icones-*` gardées (compat visuelle) + alias `.app-*`.

### Sécurité & déploiement
- Jamais committer `.env.local` ni clés privées.
- Vérifier `firebase-service-account.json` hors dépôt public.
- Consulter `ENVIRONMENT.md` pour la checklist.

### Améliorations futures (suggestions)
- Migration JSON → base (Postgres / Firestore)
- Tests unitaires parsing email
- Healthcheck `/api/health`
- Logger structuré (pino) avec niveaux
- Purge complète des classes legacy si souhaité

---
Pour contributions: ouvrir issues techniques (branding complet, tests, migration DB).
\n+### Réinitialisation des données seed (runtime éphémère)
En production (Vercel serverless) le système stocke désormais les états mutables dans `/tmp` via le helper `serverlessStorage`.

Variable: `RESET_SEED_ON_PROD=true`
- Si définie et `NODE_ENV=production` (ou `VERCEL` présent) alors les structures en mémoire sont vidées au démarrage de chaque instance froide (pas de persistance durable entre déploiements).
- Utile pour éviter de conserver des jeux de données *seed* ou de vieux comptes email lorsque aucune base externe n'est branchée.

### Endpoint statut runtime
`GET /api/status/runtime` retourne:
```jsonc
{
  "success": true,
  "mode": "production|development",
  "vercel": true,
  "storage": { "base": "/tmp/app-data", "inMemoryKeys": ["email/email-accounts.json"], "count": 1 },
  "resetSeedOnProd": true,
  "env": { "GROQ_API_KEY": true, "NEXT_PUBLIC_TINYMCE_KEY": true, "OPENAI_API_KEY": false },
  "timestamp": "2025-09-13T10:15:00.000Z"
}
```
Ne divulgue que la présence booléenne des clés critiques (pas les valeurs). Permet debugging rapide.

### Migration future recommandée
Pour un environnement multi-instance cohérent (chat, emails en temps réel) utiliser Redis / Firestore / Postgres et remplacer progressivement les appels `readJSON/writeJSON`.
\n+### Responsive / Mobile
L'application détecte automatiquement un affichage mobile (`<=768px`) via le hook `useIsMobile` (`src/hooks/useIsMobile.ts`).\n\n+Comportement mobile:\n+- Passage en **layout mono-panneau**: un seul des éléments (Dossiers, Liste, Lecture) visible à la fois.\n+- Barre de navigation inférieure (tabs: Dossiers / Liste / Lecture).\n+- Changement de dossier ramène automatiquement sur l'onglet Liste.\n+- Desktop (>768px) conserve le layout 3 panneaux (Sidebar + Liste + Lecteur redimensionnable).\n\n+Implémentation clé:\n+- `export const viewport` ajouté dans `src/app/layout.tsx` (width=device-width, initialScale=1).\n+- Remplacement des largeurs forcées par un flux conditionnel côté composant `EmailApp`.\n+- Aucune dépendance externe; pure logique React + Tailwind.\n\n+Améliorations possibles:\n+- Animation de transition entre panneaux mobile.\n+- Conservation d'un email sélectionné et auto-switch vers Lecture.\n+- Mode split landscape tablette (> 900px).\n+