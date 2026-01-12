/**
 * Script de préparation pour le build Electron
 * Ce script prépare les fichiers Next.js standalone pour être inclus dans l'app Electron
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STANDALONE_PATH = path.join(ROOT, '.next', 'standalone');
const STATIC_PATH = path.join(ROOT, '.next', 'static');
const PUBLIC_PATH = path.join(ROOT, 'public');

console.log('=== Préparation du build Electron ===\n');

// Vérifier que le build Next.js existe
if (!fs.existsSync(STANDALONE_PATH)) {
  console.error('❌ Erreur: Le dossier .next/standalone n\'existe pas.');
  console.error('   Exécutez d\'abord: npm run build');
  process.exit(1);
}

console.log('✅ Dossier standalone trouvé');

// Vérifier le fichier server.js
const serverPath = path.join(STANDALONE_PATH, 'server.js');
if (!fs.existsSync(serverPath)) {
  console.error('❌ Erreur: server.js non trouvé dans standalone');
  process.exit(1);
}

console.log('✅ server.js trouvé');

// Copier les fichiers static si nécessaire
const staticDest = path.join(STANDALONE_PATH, '.next', 'static');
if (!fs.existsSync(staticDest) && fs.existsSync(STATIC_PATH)) {
  console.log('📁 Copie des fichiers statiques...');
  fs.mkdirSync(path.dirname(staticDest), { recursive: true });
  copyFolderSync(STATIC_PATH, staticDest);
  console.log('✅ Fichiers statiques copiés');
}

// Copier le dossier public si nécessaire
const publicDest = path.join(STANDALONE_PATH, 'public');
if (!fs.existsSync(publicDest) && fs.existsSync(PUBLIC_PATH)) {
  console.log('📁 Copie du dossier public...');
  copyFolderSync(PUBLIC_PATH, publicDest);
  console.log('✅ Dossier public copié');
}

// Créer un fichier .env pour la production si nécessaire
const envPath = path.join(STANDALONE_PATH, '.env');
const envContent = `
NODE_ENV=production
PORT=3456
HOSTNAME=localhost
`.trim();

fs.writeFileSync(envPath, envContent);
console.log('✅ Fichier .env créé');

console.log('\n=== Préparation terminée ! ===');
console.log('Vous pouvez maintenant lancer: npx electron-builder --win');

// Fonction utilitaire pour copier un dossier récursivement
function copyFolderSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyFolderSync(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}
