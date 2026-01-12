const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;
let splashWindow;

// Configuration
const PORT = 3000;
const APP_NAME = 'ICONES Gestion';

// Chemin vers la base de données locale
const userDataPath = app.getPath('userData');
const localDbPath = path.join(userDataPath, 'local-data.db');

// Définir les variables d'environnement pour le mode offline
process.env.OFFLINE_MODE = 'true';
process.env.DATABASE_URL_LOCAL = `file:${localDbPath}`;
process.env.NEXT_PUBLIC_SERVER_URL = 'https://mon-app1.vercel.app';

// Créer une fenêtre splash pendant le chargement
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true
    }
  });

  splashWindow.loadURL(`data:text/html,
    <html>
      <head>
        <style>
          body {
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: white;
          }
          .container {
            text-align: center;
          }
          .logo {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 20px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: bold;
            color: #764ba2;
          }
          h1 {
            margin: 0 0 10px;
            font-size: 24px;
          }
          p {
            margin: 0;
            opacity: 0.8;
          }
          .loader {
            margin-top: 30px;
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-left: auto;
            margin-right: auto;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">IC</div>
          <h1>${APP_NAME}</h1>
          <p>Chargement en cours...</p>
          <div class="loader"></div>
        </div>
      </body>
    </html>
  `);
}

// Initialiser la base de données SQLite locale
async function initLocalDatabase() {
  try {
    // Vérifier si la base existe
    if (!fs.existsSync(localDbPath)) {
      console.log('Création de la base de données locale...');
      // Exécuter prisma migrate pour créer la base
      const prismaPath = app.isPackaged 
        ? path.join(process.resourcesPath, 'node_modules/.bin/prisma')
        : path.join(__dirname, '..', 'node_modules/.bin/prisma');
      
      execSync(`"${prismaPath}" db push --schema=prisma/schema-sqlite.prisma`, {
        cwd: app.isPackaged ? process.resourcesPath : path.join(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: `file:${localDbPath}` }
      });
    }
    return true;
  } catch (error) {
    console.error('Erreur init base locale:', error);
    return false;
  }
}

// Démarrer le serveur Next.js
function startServer() {
  const isProd = app.isPackaged;
  
  if (isProd) {
    const serverPath = path.join(process.resourcesPath, 'server.js');
    serverProcess = spawn('node', [serverPath], {
      cwd: process.resourcesPath,
      env: { 
        ...process.env, 
        PORT: String(PORT),
        NODE_ENV: 'production'
      }
    });
  } else {
    serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '..'),
      shell: true,
      env: { 
        ...process.env, 
        PORT: String(PORT)
      }
    });
  }

  serverProcess.stdout?.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr?.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
    show: false,
  });

  // Menu personnalisé
  const menuTemplate = [
    {
      label: 'Fichier',
      submenu: [
        { label: 'Actualiser', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { type: 'separator' },
        { 
          label: 'Exporter les données...', 
          click: async () => {
            const { filePath } = await dialog.showSaveDialog({
              title: 'Exporter les données',
              defaultPath: `icones-backup-${new Date().toISOString().split('T')[0]}.json`,
              filters: [{ name: 'JSON', extensions: ['json'] }]
            });
            if (filePath) {
              // Exporter la base de données
              mainWindow.webContents.send('export-data', filePath);
            }
          }
        },
        { type: 'separator' },
        { label: 'Quitter', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Zoom +', accelerator: 'CmdOrCtrl+Plus', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
        { label: 'Zoom -', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5) },
        { label: 'Réinitialiser Zoom', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.setZoomLevel(0) },
        { type: 'separator' },
        { label: 'Plein écran', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) }
      ]
    },
    {
      label: 'Synchronisation',
      submenu: [
        { 
          label: 'Synchroniser maintenant', 
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('trigger-sync')
        },
        { type: 'separator' },
        { 
          label: 'Ouvrir le dossier de données', 
          click: () => shell.openPath(userDataPath)
        }
      ]
    },
    {
      label: 'Aide',
      submenu: [
        { 
          label: 'À propos', 
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'À propos',
              message: APP_NAME,
              detail: `Version 1.0.0\n\nApplication de gestion pour ICONES & ALL IN ONE.\n\nBase de données: ${localDbPath}`
            });
          }
        },
        { label: 'DevTools', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  // Attendre que le serveur soit prêt
  const checkServer = setInterval(() => {
    fetch(`http://localhost:${PORT}`)
      .then(() => {
        clearInterval(checkServer);
        mainWindow.loadURL(`http://localhost:${PORT}`);
        mainWindow.show();
        if (splashWindow) {
          splashWindow.close();
          splashWindow = null;
        }
      })
      .catch(() => {
        console.log('Attente du serveur...');
      });
  }, 1000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  createSplashWindow();
  
  // Initialiser la base locale
  await initLocalDatabase();
  
  // Démarrer le serveur
  startServer();
  
  // Créer la fenêtre principale
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
