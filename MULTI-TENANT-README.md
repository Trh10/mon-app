# 🏢 Extension Multi-Tenant ajoutée à votre application

Cette extension ajoute la gestion multi-organisations à votre app existante **sans modifier l'interface actuelle**. 

## ✨ Fonctionnalités ajoutées

- **🏢 Multi-tenant** : Organisations séparées avec leurs propres données
- **🔐 Auth par PIN** : Connexion simple par nom + PIN (4 chiffres)
- **💾 Persistance** : Messages et tâches maintenant stockés en DB par organisation
- **⚡ Temps réel** : Socket.IO pour collaboration multi-org
- **🔒 Sécurité** : Sessions chiffrées avec iron-session

## 🗂️ Structure ajoutée

```
src/
├── lib/
│   ├── hash.ts         # Hashage sécurisé des PINs
│   └── session.ts      # Gestion sessions multi-tenant
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── start/         # POST - Sélectionner org
│   │   │   └── org-login/     # POST - Connexion par PIN
│   │   └── socket/            # Socket.IO multi-org
│   └── (org)/
│       └── [slug]/
│           └── page.tsx       # Dashboard par organisation
```

## 🚀 Comment tester

### 1. Variables d'environnement

Ajoutez dans votre `.env` :

```bash
# Multi-tenant auth (REQUIS)
SESSION_PASSWORD=votre-phrase-secrete-de-32-caracteres-minimum-pour-iron-session

# Base de données (déjà configuré)
DB_PROVIDER=sqlite
DATABASE_URL=file:./dev.db

# Firebase (hors service par défaut)
FIREBASE_ENABLED=false
```

### 2. Initialisation des données

Par défaut, aucune organisation ni utilisateur n'est inséré automatiquement. 

Pour créer vos premières données :

1. **Ouvrez Prisma Studio** (ou votre outil SQL préféré)
  ```bash
  npx prisma studio
  ```
2. Ajoutez une entrée dans `Organization` (ex: nom = "ICONES", slug = "icones").
3. Créez un utilisateur dans `User` en renseignant `organizationId`, `name` et `pinHash`.
   - Générez le `pinHash` via un one-liner :
     ```bash
     npx tsx -e "import { hashPin } from './src/lib/hash'; console.log(hashPin('1234'))"
     ```
     (remplacez `1234` par le PIN souhaité).

### 3. Test du flux complet

**a) Sélectionner l'organisation :**
```bash
curl -X POST http://localhost:3000/api/auth/start \
  -H "Content-Type: application/json" \
  -d '{"orgNameOrSlug": "icones"}'
```

**b) Se connecter avec PIN :**
```bash
curl -X POST http://localhost:3000/api/auth/org-login \
  -H "Content-Type: application/json" \
  -d '{"name": "Israël", "pin": "1234"}'
```

**c) Ouvrir le dashboard :**
```
http://localhost:3000/<votre-slug>
```

## 🔧 APIs enrichies

Toutes vos APIs existantes fonctionnent **exactement pareil**, mais maintenant :

- **`/api/messages`** : Filtrés par organization automatiquement
- **`/api/tasks`** : Filtrés par organization automatiquement  
- **`/api/realtime/*`** : Persistance en DB par organization

### Exemples d'usage

**Messages (filtrage automatique par org en session) :**
```javascript
// GET - Récupérer messages de l'org
fetch('/api/messages?limit=50')

// POST - Créer message dans l'org  
fetch('/api/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: "Hello depuis l'organisation!",
    kind: "user"
  })
})
```

**Tâches (même principe) :**
```javascript
// GET - Tâches de l'org
fetch('/api/tasks')

// POST - Nouvelle tâche
fetch('/api/tasks', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "Tâche importante",
    description: "À faire aujourd'hui"
  })
})
```

## 🔗 Socket.IO temps réel

```javascript
import { io } from "socket.io-client";

const socket = io({ path: "/api/socket" });

// Rejoindre l'organisation
socket.emit("join-org", "icones");

// Écouter les nouveaux messages
socket.on("message", (message) => {
  console.log("Nouveau message:", message);
});

// Écouter les nouvelles tâches  
socket.on("task", (task) => {
  console.log("Nouvelle tâche:", task);
});

// Envoyer un message à toute l'org
socket.emit("org-message", {
  orgSlug: "icones",
  message: { content: "Hello team!" }
});
```

## 📊 Base de données

Le schéma existant a été enrichi avec :

- **`Organization`** : Table des organisations  
- **`organizationId`** : Ajouté à User, Message, Task, ActivityLog
- **Relations CASCADE** : Suppression d'une org = suppression de toutes ses données

### Migration en production

Pour PostgreSQL en production :

1. **Changer le provider dans `schema.prisma` :**
```prisma
datasource db {
  provider = "postgresql" // au lieu de "sqlite"
  url      = env("DATABASE_URL")
}
```

2. **Configurer l'URL :**
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/appdb
```

3. **Migrer :**
```bash
npx prisma migrate dev --name add-organizations
npx prisma generate
```

## 🛡️ Sécurité

- **Sessions chiffrées** : iron-session avec clé secrète
- **PINs hashés** : PBKDF2 avec salt unique (100k iterations)
- **Isolation** : Chaque org voit uniquement ses données
- **Validation** : Vérification organizationId sur toutes les routes

## 🚀 Roadmap

- **Présence temps réel** : Voir qui est en ligne dans l'org
- **Rôles/Permissions** : Admin, Manager, User avec droits différents  
- **Invitations** : Ajouter des utilisateurs par email/code
- **Fichiers** : Upload/partage de documents par org
- **Audit** : Logs détaillés des actions par org

## 💡 Notes importantes

- **Interface actuelle** : Aucun changement - tout fonctionne comme avant
- **Compatibilité** : Fallback sur organizationId=1 si pas de session
- **Performance** : Index sur organizationId pour requêtes rapides
- **Scalabilité** : Prêt pour Redis + clustering Socket.IO
- **Rôles utilisateurs** : Le champ `role` existant est conservé, aucune donnée ajoutée automatiquement

---

**🎯 L'extension est 100% compatible avec votre app existante. Vos utilisateurs actuels peuvent continuer à utiliser l'interface normale, et les nouvelles organisations utilisent le dashboard `/[slug]`.**