const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// Démarrer le serveur Next.js en mode production
function startServer() {
  const isProd = app.isPackaged;
  
  if (isProd) {
    // En production, utiliser le serveur standalone
    const serverPath = path.join(process.resourcesPath, 'server.js');
    serverProcess = spawn('node', [serverPath], {
      cwd: path.join(process.resourcesPath),
      env: { ...process.env, PORT: '3000' }
    });
  } else {
    // En dev, utiliser npm run dev
    serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '..'),
      shell: true,
      env: { ...process.env, PORT: '3000' }
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
      label: 'Aide',
      submenu: [
        { label: 'À propos', click: () => { /* Afficher dialog */ } },
        { label: 'DevTools', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  // Attendre que le serveur soit prêt
  const checkServer = setInterval(() => {
    fetch('http://localhost:3000')
      .then(() => {
        clearInterval(checkServer);
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.show();
      })
      .catch(() => {
        console.log('Attente du serveur...');
      });
  }, 1000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startServer();
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
