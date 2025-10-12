# ENVIRONMENT.md

Documentation des variables d'environnement et bonnes pratiques de sécurité.

## 1. Fichiers cibles
- `.env.example` : modèle public (fourni)
- `.env.local` : valeurs locales (NE PAS COMMITTER)
- Variables CI/CD (Vercel, Docker, etc.) : à définir dans le panneau de configuration.

## 2. Variables principales
| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `APP_NAME` | Non (def=Collab Suite) | Nom affiché dans l'UI / métadonnées. |
| `COMPANY_DEFAULT` | Non (def=ACME) | Identifiant entreprise par défaut (données mock). |
| `GOOGLE_CLIENT_ID` | Oui (si Gmail) | OAuth Google ID (console cloud). |
| `GOOGLE_CLIENT_SECRET` | Oui (si Gmail) | Secret OAuth. |
| `GOOGLE_REDIRECT_URI` | Oui | Doit pointer vers `/api/google/callback`. |
| `GROQ_API_KEY` | Oui* | Clé IA (si fonctions IA actives). |
| `OPENAI_API_KEY` | Oui* | Clé OpenAI (si fallback ou usage GPT). |
| `ANTHROPIC_API_KEY` | Optionnel | Fournisseur IA supplémentaire. |
| `NEXT_PUBLIC_TINYMCE_KEY` | Optionnel | Clé éditeur riche collaborative. |
| `SMTP_HOST/PORT/USER/PASS` | Optionnel | Envoi SMTP direct si non Gmail API. |

## 3. Recommandations sécurité
1. Ne jamais committer `.env.local` ou des clés privées.
2. Utiliser des rôles distincts par environnement (dev/staging/prod).
3. Rotation périodique des clés (tous les 90 jours recommandé).
4. Vérifier que les journaux n’affichent pas les tokens OAuth (masquage côté code si besoin).

## 4. Gmail OAuth
- Dans la console Google: activer Gmail API + OAuth consent screen.
- Ajouter l’URL d’origine + `GOOGLE_REDIRECT_URI` exacte.
- Vérifier les scopes minimalistes (lecture/envoi). 

## 5. IA Providers
Ordre de fallback géré dans le Smart Provider (Groq → OpenAI → Anthropic). Fournir au moins une clé valide.

## 6. SMTP vs Gmail API
| Option | Avantages | Limites |
|--------|-----------|---------|
| Gmail API | OAuth sécurisé, quotas généreux | Setup OAuth plus complexe |
| SMTP custom | Simple, réutilisable | Risque de délivrabilité / SPF-DKIM à configurer |

## 7. Migration future
- Centraliser davantage via un fichier `src/config/env.ts` (validation stricte).
- Ajouter un script de sanity-check lancé au démarrage (ex: `npm run env:check`).

## 8. Exemple de validation (futur `env.ts`)
```ts
const required = ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'];
required.forEach(v => { if(!process.env[v]) console.warn(`[ENV] Manquant: ${v}`); });
```

## 9. Variables supplémentaires potentielles
| Variable | Usage futur |
|----------|-------------|
| `PUBLIC_BASE_URL` | Génération de liens absolus (emails, callbacks). |
| `DISABLE_AUTO_SUMMARY` | Désactiver résumés IA auto. |
| `ENABLE_DEBUG_LOGS` | Verbosité augmentée. |
| `JWT_SIGNING_KEY` | Signature tokens custom si introduction de JWT. |

## 10. Vérification rapide manuelle
```bash
# Lister les principales valeurs (sans afficher secrets)
node -e "['APP_NAME','GOOGLE_CLIENT_ID','GROQ_API_KEY'].forEach(k=>console.log(k, process.env[k]?'OK':'ABSENT'))"
```

---
Pour toute nouvelle variable, l’ajouter dans `.env.example` + documenter ici.
