# 🖥️ Transformer l'application en fichier .EXE

## Vue d'ensemble

Il existe **3 méthodes** pour créer un fichier .exe installable :

| Méthode | Hors ligne | Complexité | Taille | Recommandé |
|---------|------------|------------|--------|------------|
| **Electron** | ✅ Oui | Moyenne | ~200MB | ⭐ Oui |
| **Tauri** | ✅ Oui | Élevée | ~10MB | Pour experts |
| **PWA** | ⚠️ Partiel | Facile | ~1MB | Non |

---

## 🚀 Méthode 1 : Electron (Recommandée)

### Étape 1 : Installer les dépendances

```powershell
# Dans le dossier du projet
npm install --save-dev electron electron-builder concurrently wait-on
```

### Étape 2 : Copier la configuration

Le fichier `electron/main.js` a déjà été créé. Copiez le contenu de `electron-package.json` dans votre `package.json` (section scripts et build).

### Étape 3 : Créer une icône

Créez un fichier `electron/icon.ico` (256x256 pixels minimum) pour l'icône de l'application.

### Étape 4 : Configurer la base de données locale

Pour fonctionner hors ligne, vous devez utiliser **SQLite** au lieu de PostgreSQL :

```prisma
// schema.prisma - Version locale
datasource db {
  provider = "sqlite"
  url      = "file:./data.db"
}
```

### Étape 5 : Build et créer l'exe

```powershell
# Tester en mode dev
npm run electron:dev

# Créer l'installateur Windows
npm run electron:build:win

# Créer une version portable (pas d'installation)
npm run electron:build:portable
```

Les fichiers seront dans `dist-electron/` :
- `ICONES-Gestion-Setup.exe` - Installateur
- `ICONES-Gestion-Portable.exe` - Version portable

---

## 🔌 Configuration Hors Ligne

### 1. Base de données locale (SQLite)

Créez un nouveau schema pour SQLite :

```prisma
// schema-local.prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Copier tous vos models ici...
```

### 2. Variables d'environnement locales

Créez `.env.local` :

```env
DATABASE_URL="file:./local-data.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="votre-secret-local-32-caracteres"
```

### 3. Synchronisation (Online ↔ Offline)

Pour synchroniser avec le serveur quand internet est disponible :

```javascript
// lib/sync.js
export async function syncWithServer() {
  if (!navigator.onLine) return;
  
  // Récupérer les données locales non synchronisées
  const localChanges = await getUnsyncedData();
  
  // Envoyer au serveur
  await fetch('/api/sync', {
    method: 'POST',
    body: JSON.stringify(localChanges)
  });
  
  // Marquer comme synchronisé
  await markAsSynced(localChanges);
}
```

---

## 📦 Structure du projet pour Electron

```
mon-app/
├── electron/
│   ├── main.js          # Point d'entrée Electron
│   ├── preload.js       # Scripts de préchargement (optionnel)
│   └── icon.ico         # Icône de l'application
├── src/                 # Votre code Next.js existant
├── public/
├── package.json         # Avec scripts Electron
└── next.config.js       # Avec output: 'standalone'
```

---

## 🛠️ Scripts à ajouter dans package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:build:win": "npm run build && electron-builder --win",
    "electron:build:portable": "npm run build && electron-builder --win portable"
  },
  "main": "electron/main.js",
  "build": {
    "appId": "com.icones.gestion",
    "productName": "ICONES Gestion",
    "win": {
      "target": ["nsis", "portable"]
    }
  }
}
```

---

## ⚡ Commandes rapides

```powershell
# 1. Installer les dépendances Electron
npm install -D electron electron-builder concurrently wait-on

# 2. Tester l'application desktop
npm run electron:dev

# 3. Créer l'installateur Windows
npm run electron:build:win

# 4. Le fichier .exe sera dans dist-electron/
```

---

## 🔒 Sécurité

Pour une application desktop avec données sensibles :

1. **Chiffrez la base SQLite** avec `better-sqlite3-multiple-ciphers`
2. **Stockez les secrets** dans le keychain Windows avec `keytar`
3. **Signez l'exécutable** avec un certificat code signing

---

## 📱 Alternative : PWA (Progressive Web App)

Si vous voulez juste une icône sur le bureau sans créer d'exe :

1. Ajoutez un `manifest.json` dans `/public`
2. Ajoutez un Service Worker pour le cache offline
3. Les utilisateurs peuvent "Installer" depuis Chrome

Mais cette méthode nécessite toujours une connexion initiale.

---

## ❓ FAQ

**Q: L'exe est trop gros (>200MB) ?**
R: C'est normal avec Electron (inclut Chromium). Utilisez Tauri pour un exe plus léger (~10MB).

**Q: Comment mettre à jour l'application ?**
R: Utilisez `electron-updater` pour les mises à jour automatiques.

**Q: Puis-je vendre cette application ?**
R: Oui, Electron et Next.js sont MIT licensed.

---

## 🎯 Prochaines étapes

1. ✅ Fichiers Electron créés (`electron/main.js`)
2. ⏳ Installer les dépendances : `npm install -D electron electron-builder concurrently wait-on`
3. ⏳ Créer l'icône `electron/icon.ico`
4. ⏳ Configurer SQLite pour le mode hors ligne
5. ⏳ Tester : `npm run electron:dev`
6. ⏳ Build : `npm run electron:build:win`

Voulez-vous que je configure complètement l'un de ces éléments ?
