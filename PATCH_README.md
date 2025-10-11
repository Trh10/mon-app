# Patch Notes (Auth + Temps Réel + Tâches)

Ce patch corrige les points suivants :
- Google OAuth (NextAuth) : scopes valides, callbacks JWT/session, variables `NEXTAUTH_URL` et `NEXTAUTH_SECRET`.
- `SessionProvider` monté dans `src/app/layout.tsx`.
- Page de connexion déplacée vers `/signin` (l’ancienne `/api/google/signin` redirige).
- Sous-système **temps réel** (SSE) propre : présence, chat et événements via `/api/realtime/stream` et `/api/realtime/emit`.
- API **tâches** fonctionnelle : création, mise à jour, changement de statut, annulation, suppression.

## Installation du patch
1. **Ferme** ton serveur de dev.
2. Dézippe ce fichier **à la racine du projet** (là où se trouve `package.json`), en écrasant les fichiers existants.
3. Ajoute/complète ton `.env.local` à partir de `.env.local.example` (renseigne `NEXTAUTH_URL` et `NEXTAUTH_SECRET`).

## Démarrage
```bash
npm install
npm run dev
```
Ensuite ouvre http://localhost:3000/signin pour tester la connexion Google.

## Remarques
- La présence et le chat fonctionnent en mémoire (SSE). Pour la production, remplace par une base/Redis.
- Pour Gmail/IMAP, le patch n’active pas (encore) les scopes Gmail. Une fois ton écran de consentement validé, ajoute les scopes nécessaires dans `src/lib/auth.ts`.
