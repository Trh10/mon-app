# Checklist de Déploiement - ICONES BOX

## ✅ Ce qui est prêt :

### 📧 **Fonctionnalités Email**
- ✅ Connexion Gmail avec OAuth2
- ✅ Lecture et affichage des emails
- ✅ Composition et envoi d'emails
- ✅ Actions sur les emails (marquer lu, supprimer, etc.)
- ✅ Interface responsive et moderne

### 🤖 **Intelligence Artificielle**
- ✅ Système multi-provider (Groq, OpenAI, Claude)
- ✅ Résumé automatique des emails
- ✅ Analyse de sentiment
- ✅ Prédiction de priorité
- ✅ Suggestions de réponses
- ✅ Traduction automatique
- ✅ Basculement automatique entre providers

### 🏢 **Gestion d'Entreprise**
- ✅ Système d'authentification par code entreprise
- ✅ Gestion des utilisateurs et rôles
- ✅ Système de besoins/réquisitions
- ✅ Audit et traçabilité
- ✅ Analytics et rapports

### 🔄 **Collaboration Temps Réel**
- ✅ Chat en temps réel
- ✅ Partage de fichiers
- ✅ Notifications live
- ✅ Curseurs collaboratifs

## ❌ Ce qu'il faut corriger pour le déploiement :

### 🐛 **Problèmes de Build**
1. **Erreurs TypeScript** - Certains fichiers ont des problèmes de types
2. **Modules manquants** - Quelques dépendances à installer
3. **Configuration NextAuth** - À finaliser pour la production

### 🔑 **Variables d'environnement requises**
```bash
# Authentication Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_random_secret_key

# AI Providers
GROQ_API_KEY=your_groq_api_key (gratuit)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Firebase (optionnel)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
```

### 🌐 **Options de déploiement recommandées**

1. **Vercel** (Recommandé - gratuit)
   - ✅ Optimisé pour Next.js
   - ✅ Déploiement automatique depuis GitHub
   - ✅ SSL gratuit
   - ✅ CDN mondial

2. **Netlify** (Alternative)
   - ✅ Déploiement facile
   - ✅ SSL gratuit
   - ⚠️ Peut nécessiter des ajustements pour les API

3. **Railway/Render** (Plus avancé)
   - ✅ Base de données incluse
   - ✅ Variables d'environnement faciles
   - 💰 Payant mais abordable

## 🚀 **Étapes pour déployer**

### Étape 1: Corriger les erreurs de build
```bash
npm run build
```

### Étape 2: Configurer les variables d'environnement
- Créer un compte sur la plateforme choisie
- Ajouter toutes les variables d'environnement

### Étape 3: Configurer GitHub
- Pusher le code sur GitHub
- Connecter le repo à la plateforme de déploiement

### Étape 4: Tester en production
- Vérifier toutes les fonctionnalités
- Tester l'authentification Google
- Valider les APIs IA

## 💡 **Recommandations**

1. **Commencer par Vercel** - Le plus simple pour Next.js
2. **Utiliser Groq** - API IA gratuite et ultra-rapide
3. **Configurer un domaine personnalisé** pour le professionnalisme
4. **Mettre en place la surveillance** avec les logs Vercel

## 📊 **Estimation du coût**
- **Gratuit** : Vercel + Groq + domaine basique
- **~5€/mois** : Domaine personnalisé + OpenAI backup
- **~15€/mois** : Version pro avec plus de fonctionnalités

Votre application est **80% prête** pour la production ! 🎉

---
## 🚀 Déploiement Automatisé Vercel (Ajout)

### 1. Script local
Utilisation:
```powershell
pwsh ./scripts/deploy-vercel.ps1           # Pré-déploiement (aperçu)
pwsh ./scripts/deploy-vercel.ps1 -Prod     # Déploiement production
```
Pré-requis: `vercel login` déjà effectué + variables configurées dans le dashboard.

### 2. GitHub Action CI/CD
Fichier: `.github/workflows/deploy.yml`

Secrets requis dans GitHub (Settings > Secrets > Actions):
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (selon besoins)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (si routes NextAuth actives)
- `NEXT_PUBLIC_TINYMCE_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (si SMTP)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (si Firebase)

Déclenchement: push sur `main` ou `prod` ou manuel (workflow_dispatch).

### 3. Notes Techniques
- Les messages *Dynamic server usage* pendant build sont normaux pour les routes utilisant `cookies` / `request.url`.
- `output: 'standalone'` déjà configuré (optimisation Vercel/Node). 
- Si tu ajoutes d'autres libs natives lourdes, penser à `serverComponentsExternalPackages`.

### 4. Santé Post-Déploiement (Check rapide)
```bash
curl -I https://ton-app.vercel.app/
curl https://ton-app.vercel.app/api/ai/status
curl https://ton-app.vercel.app/api/email/active
```

### 5. Prochaines optimisations possibles
- Ajout `/api/health` minimal (status: ok, version commit).
- Logging structuré (pino) + trace ID.
- Mise en cache edge (si certaines routes deviennent purement GET).

---
