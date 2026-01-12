const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');

// Empêcher les instances multiples
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow = null;
  let splashWindow = null;

  // Configuration
  const APP_NAME = 'ICONES Gestion';
  const ONLINE_URL = 'https://mon-app1.vercel.app';

  // Créer le splash screen
  function createSplashWindow() {
    const iconPath = path.join(__dirname, 'icon.png');
    
    splashWindow = new BrowserWindow({
      width: 450,
      height: 380,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: false
      }
    });

    const splashHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: white;
              border-radius: 20px;
              border: 1px solid rgba(255,255,255,0.1);
            }
            .container { text-align: center; padding: 30px; }
            .logo-container {
              width: 120px;
              height: 120px;
              background: white;
              border-radius: 30px;
              margin: 0 auto 25px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 15px 40px rgba(0,0,0,0.3);
              overflow: hidden;
            }
            .logo-container img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .logo-text {
              font-size: 48px;
              font-weight: bold;
              color: #667eea;
            }
            h1 { font-size: 26px; margin-bottom: 8px; font-weight: 600; }
            .subtitle { opacity: 0.7; font-size: 13px; margin-bottom: 30px; }
            .status { 
              opacity: 0.9; 
              font-size: 14px; 
              margin-bottom: 20px;
              color: #a0aec0;
            }
            .loader {
              width: 45px;
              height: 45px;
              border: 3px solid rgba(255,255,255,0.1);
              border-top-color: #667eea;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            .dots::after {
              content: '';
              animation: dots 1.5s steps(4, end) infinite;
            }
            @keyframes dots {
              0% { content: ''; }
              25% { content: '.'; }
              50% { content: '..'; }
              75% { content: '...'; }
              100% { content: ''; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo-container">
              <span class="logo-text">IC</span>
            </div>
            <h1>${APP_NAME}</h1>
            <p class="subtitle">Application de gestion</p>
            <p class="status">Connexion en cours<span class="dots"></span></p>
            <div class="loader"></div>
          </div>
        </body>
      </html>
    `;

    splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHTML));
  }

  // Créer la fenêtre principale
  function createMainWindow() {
    const iconPath = path.join(__dirname, 'icon.png');

    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 900,
      minHeight: 600,
      icon: iconPath,
      show: false,
      backgroundColor: '#1a1a2e',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
      },
      titleBarStyle: 'default',
    });

    // Menu
    const menuTemplate = [
      {
        label: 'Fichier',
        submenu: [
          { label: 'Actualiser', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
          { label: 'Actualiser (vider cache)', accelerator: 'CmdOrCtrl+Shift+R', click: () => mainWindow.webContents.reloadIgnoringCache() },
          { type: 'separator' },
          { label: 'Quitter', accelerator: 'Alt+F4', click: () => app.quit() }
        ]
      },
      {
        label: 'Affichage',
        submenu: [
          { label: 'Zoom avant', accelerator: 'CmdOrCtrl+Plus', click: () => mainWindow.webContents.setZoomFactor(mainWindow.webContents.getZoomFactor() + 0.1) },
          { label: 'Zoom arrière', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.setZoomFactor(mainWindow.webContents.getZoomFactor() - 0.1) },
          { label: 'Taille normale', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.setZoomFactor(1) },
          { type: 'separator' },
          { label: 'Plein écran', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
          { type: 'separator' },
          { label: 'Outils développeur', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() }
        ]
      },
      {
        label: 'Navigation',
        submenu: [
          { label: 'Accueil', accelerator: 'Alt+Home', click: () => mainWindow.loadURL(ONLINE_URL) },
          { label: 'Page précédente', accelerator: 'Alt+Left', click: () => mainWindow.webContents.goBack() },
          { label: 'Page suivante', accelerator: 'Alt+Right', click: () => mainWindow.webContents.goForward() }
        ]
      },
      {
        label: 'Aide',
        submenu: [
          { label: 'Ouvrir dans le navigateur', click: () => shell.openExternal(ONLINE_URL) },
          { type: 'separator' },
          {
            label: 'À propos',
            click: () => {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'À propos',
                message: APP_NAME,
                detail: 'Version 1.0.0\n\nApplication de gestion ICONES & ALL IN ONE\n\n© 2024-2026',
                icon: iconPath
              });
            }
          }
        ]
      }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

    // Charger l'application
    console.log('Chargement de:', ONLINE_URL);
    mainWindow.loadURL(ONLINE_URL);

    // Quand la page est prête
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('Page chargée !');
      setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
          splashWindow = null;
        }
        mainWindow.show();
        mainWindow.focus();
      }, 500);
    });

    // Erreur de chargement
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Erreur:', errorCode, errorDescription);
      
      const errorHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: white;
              }
              .container { text-align: center; padding: 40px; max-width: 500px; }
              .icon { font-size: 72px; margin-bottom: 25px; }
              h1 { font-size: 28px; margin-bottom: 15px; }
              p { opacity: 0.8; line-height: 1.6; margin-bottom: 30px; }
              button {
                padding: 14px 35px;
                font-size: 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
              }
              button:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
              }
              .error-code { 
                margin-top: 25px; 
                font-size: 12px; 
                opacity: 0.4;
                font-family: monospace;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">📡</div>
              <h1>Connexion impossible</h1>
              <p>Impossible de se connecter au serveur ICONES.<br>Vérifiez votre connexion internet et réessayez.</p>
              <button onclick="location.reload()">🔄 Réessayer</button>
              <div class="error-code">Erreur: ${errorDescription} (${errorCode})</div>
            </div>
          </body>
        </html>
      `;

      mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHTML));
      
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow.show();
    });

    // Ouvrir les liens externes dans le navigateur
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (!url.includes('mon-app1.vercel.app') && !url.includes('localhost')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
      return { action: 'allow' };
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  // Quand une deuxième instance essaie de s'ouvrir
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Démarrage de l'application
  app.whenReady().then(() => {
    console.log('=== ICONES Gestion - Démarrage ===');
    createSplashWindow();
    createMainWindow();
  });

  // Fermer proprement
  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  // Gérer les erreurs
  process.on('uncaughtException', (error) => {
    console.error('Erreur:', error);
  });
}
