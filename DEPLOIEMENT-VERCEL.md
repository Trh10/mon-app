# 🚀 DÉPLOIEMENT VERCEL - GUIDE RAPIDE

## Option 1 : Via l'interface Web Vercel (Recommandé)

### 1️⃣ Aller sur Vercel
- Visitez : https://vercel.com
- Cliquez sur "Login" ou "Sign Up"
- Connectez-vous avec GitHub

### 2️⃣ Importer le projet
- Cliquez sur "Add New..." → "Project"
- Sélectionnez votre repository : **Trh10/mon-app**
- Branche : **fix/login-syntax**

### 3️⃣ Configurer le projet
- **Framework Preset** : Next.js (détecté automatiquement)
- **Root Directory** : `./` (par défaut)
- **Build Command** : `npm run build`
- **Output Directory** : `.next`
- **Install Command** : `npm install`

### 4️⃣ Configurer les variables d'environnement

Cliquez sur "Environment Variables" et ajoutez :

```
DATABASE_URL=postgresql://neondb_owner:npg_gpiyR7kqfd2T@ep-muddy-sky-ad8o2hsl-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

DB_PROVIDER=postgresql

FIREBASE_ENABLED=false

SESSION_SECRET=<générer-une-clé-aléatoire-32-caractères>

NODE_ENV=production
```

**⚠️ IMPORTANT** : Générer une clé SESSION_SECRET :
```powershell
# Dans PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

### 5️⃣ Déployer
- Cliquez sur **"Deploy"**
- Attendez 3-5 minutes ⏱️
- Votre app sera disponible sur : `https://mon-app-xxx.vercel.app`

---

## Option 2 : Via Vercel CLI

### 1️⃣ Installer Vercel CLI
```powershell
npm install -g vercel
```

### 2️⃣ Login
```powershell
vercel login
```

### 3️⃣ Déployer
```powershell
vercel
```

Suivez les instructions :
- **Set up and deploy** : Yes
- **Which scope** : Votre compte
- **Link to existing project** : No
- **What's your project's name** : mon-app
- **In which directory** : ./
- **Want to modify settings** : No

### 4️⃣ Ajouter les variables d'environnement
```powershell
vercel env add DATABASE_URL
# Entrer la valeur : postgresql://...

vercel env add DB_PROVIDER
# Entrer : postgresql

vercel env add SESSION_SECRET
# Entrer : votre-clé-générée
```

### 5️⃣ Redéployer avec les variables
```powershell
vercel --prod
```

---

## 📋 CHECKLIST POST-DÉPLOIEMENT

### ✅ Vérifications immédiates

- [ ] L'URL Vercel s'ouvre sans erreur
- [ ] La page `/login` affiche le formulaire
- [ ] La page `/` (dashboard) est accessible

### ✅ Tests fonctionnels

1. **Créer une organisation**
   - Aller sur `/login`
   - "Créer une nouvelle entreprise"
   - Code fondateur : `1234`
   - Vérifier la création

2. **Se connecter**
   - Nom de l'entreprise
   - Nom d'utilisateur
   - PIN (1234 pour le premier utilisateur)

3. **Tester les fonctionnalités**
   - [ ] Chat : Envoyer un message
   - [ ] Email : Connecter un compte (si configuré)
   - [ ] Tâches : Créer une tâche
   - [ ] Réquisitions : Soumettre une réquisition
   - [ ] Réunions : Créer une réunion

### ⚠️ Si des erreurs apparaissent

1. **Vérifier les logs**
   ```powershell
   vercel logs <deployment-url>
   ```

2. **Vérifier la base de données**
   - Aller sur console.neon.tech
   - SQL Editor → `SELECT COUNT(*) FROM "Organization";`

3. **Vérifier les variables d'environnement**
   - Vercel Dashboard → Votre projet → Settings → Environment Variables

---

## 🔧 COMMANDES UTILES

### Voir les déploiements
```powershell
vercel list
```

### Voir les logs
```powershell
vercel logs
```

### Voir les variables d'environnement
```powershell
vercel env ls
```

### Redéployer
```powershell
vercel --prod
```

### Rollback (revenir à un déploiement précédent)
```powershell
vercel rollback
```

---

## 🌐 DOMAINE PERSONNALISÉ (Optionnel)

### 1️⃣ Ajouter un domaine
- Vercel Dashboard → Votre projet → Settings → Domains
- Cliquer "Add"
- Entrer votre domaine : `exemple.com`

### 2️⃣ Configurer DNS
Ajouter ces enregistrements chez votre registrar :

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 3️⃣ Vérifier
- Attendre 5-10 minutes
- Vercel vérifiera automatiquement
- SSL sera configuré automatiquement

---

## 📊 MONITORING

### Vercel Analytics (Gratuit)
- Vercel Dashboard → Votre projet → Analytics
- Activez pour voir :
  - Nombre de visiteurs
  - Temps de chargement
  - Erreurs

### Vercel Speed Insights
- Vercel Dashboard → Votre projet → Speed Insights
- Activez pour mesurer les performances

---

## 🆘 TROUBLESHOOTING

### Build échoue
```powershell
# Tester localement d'abord
npm run build

# Vérifier les logs Vercel
vercel logs
```

### Erreur 500
- Vérifier DATABASE_URL dans Vercel
- Vérifier que Neon est accessible
- Voir les logs : `vercel logs`

### Page blanche
- Vérifier la console du navigateur (F12)
- Vérifier les logs Vercel
- Vérifier que toutes les variables d'env sont définies

---

## 🎉 SUCCÈS !

Une fois déployé, votre application sera disponible 24/7 avec :
- ✅ SSL automatique (HTTPS)
- ✅ CDN global
- ✅ Déploiements automatiques (sur push GitHub)
- ✅ Aperçus de branche (preview deployments)
- ✅ Rollback en un clic

**URL de production** : `https://mon-app-xxx.vercel.app`

---

**Documentation complète** : GUIDE-DEPLOIEMENT-FINAL.md
