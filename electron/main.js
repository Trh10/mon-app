const { app, BrowserWindow, Menu, dialog, shell, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');

// Empêcher les instances multiples
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow = null;
  let splashWindow = null;
  let isOnline = true;

  // Configuration
  const APP_NAME = 'ICONES Gestion';
  const ONLINE_URL = 'https://mon-app1.vercel.app';
  const USER_DATA_PATH = app.getPath('userData');
  const OFFLINE_DATA_FILE = path.join(USER_DATA_PATH, 'offline-data.json');
  const PENDING_SYNC_FILE = path.join(USER_DATA_PATH, 'pending-sync.json');

  // Vérifier la connexion internet
  function checkOnlineStatus() {
    return new Promise((resolve) => {
      const request = net.request({ method: 'HEAD', url: 'https://www.google.com' });
      request.on('response', () => resolve(true));
      request.on('error', () => resolve(false));
      setTimeout(() => resolve(false), 5000);
      request.end();
    });
  }

  // Charger les données hors ligne
  function loadOfflineData() {
    try {
      if (fs.existsSync(OFFLINE_DATA_FILE)) {
        return JSON.parse(fs.readFileSync(OFFLINE_DATA_FILE, 'utf8'));
      }
    } catch (e) {
      console.error('Erreur chargement données hors ligne:', e);
    }
    return { invoices: [], clients: [], lastSync: null };
  }

  // Sauvegarder les données hors ligne
  function saveOfflineData(data) {
    try {
      fs.writeFileSync(OFFLINE_DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Erreur sauvegarde données hors ligne:', e);
    }
  }

  // Charger les données en attente de sync
  function loadPendingSync() {
    try {
      if (fs.existsSync(PENDING_SYNC_FILE)) {
        return JSON.parse(fs.readFileSync(PENDING_SYNC_FILE, 'utf8'));
      }
    } catch (e) {
      console.error('Erreur chargement pending sync:', e);
    }
    return [];
  }

  // Sauvegarder les données en attente de sync
  function savePendingSync(data) {
    try {
      fs.writeFileSync(PENDING_SYNC_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Erreur sauvegarde pending sync:', e);
    }
  }

  // Créer le splash screen
  function createSplashWindow() {
    splashWindow = new BrowserWindow({
      width: 500,
      height: 420,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      webPreferences: { nodeIntegration: false }
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
            }
            .logo-text { font-size: 48px; font-weight: bold; color: #667eea; }
            h1 { font-size: 26px; margin-bottom: 8px; font-weight: 600; }
            .subtitle { opacity: 0.7; font-size: 13px; margin-bottom: 30px; }
            .status { opacity: 0.9; font-size: 14px; margin-bottom: 20px; color: #a0aec0; }
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
            .dots::after { content: ''; animation: dots 1.5s steps(4, end) infinite; }
            @keyframes dots {
              0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo-container">
              <span class="logo-text">IC</span>
            </div>
            <h1>${APP_NAME}</h1>
            <p class="subtitle">Application de gestion professionnelle</p>
            <p class="status">Vérification de la connexion<span class="dots"></span></p>
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
        preload: path.join(__dirname, 'preload.js'),
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
          { label: 'Synchroniser maintenant', accelerator: 'CmdOrCtrl+S', click: () => attemptSync() },
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
          { label: 'Accueil', accelerator: 'Alt+Home', click: () => loadApp() },
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
            label: 'Statut de connexion',
            click: async () => {
              const online = await checkOnlineStatus();
              const pending = loadPendingSync();
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Statut',
                message: online ? '✅ En ligne' : '⚠️ Hors ligne',
                detail: `${pending.length} élément(s) en attente de synchronisation`
              });
            }
          },
          { type: 'separator' },
          {
            label: 'À propos',
            click: () => {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'À propos',
                message: APP_NAME,
                detail: 'Version 2.0.0\n\n✅ Mode hors ligne\n✅ Synchronisation automatique\n✅ Création de factures\n\n© 2024-2026 ICONES & ALL IN ONE'
              });
            }
          }
        ]
      }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

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
        updateOnlineStatus();
      }, 500);
    });

    // Erreur de chargement - passer en mode hors ligne
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Erreur de chargement:', errorCode, errorDescription);
      isOnline = false;
      loadOfflineMode();
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

  // Charger l'application
  async function loadApp() {
    isOnline = await checkOnlineStatus();
    console.log('Statut connexion:', isOnline ? 'EN LIGNE' : 'HORS LIGNE');

    if (isOnline) {
      mainWindow.loadURL(ONLINE_URL);
      attemptSync();
    } else {
      loadOfflineMode();
    }
  }

  // Générer HTML mode hors ligne
  function generateOfflineHTML() {
    const data = loadOfflineData();
    const pendingSync = loadPendingSync();
    
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${APP_NAME} - Mode Hors Ligne</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      color: #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      padding: 20px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo { display: flex; align-items: center; gap: 15px; }
    .logo-icon {
      width: 50px; height: 50px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: bold; color: white;
    }
    .logo-text h1 { font-size: 22px; font-weight: 700; }
    .logo-text p { font-size: 12px; color: #94a3b8; }
    .status-badge {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border-radius: 30px; font-weight: 600; font-size: 14px;
    }
    .main { padding: 30px; max-width: 1400px; margin: 0 auto; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px; margin-bottom: 30px;
    }
    .stat-card {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      padding: 25px; border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .stat-card h3 { font-size: 14px; color: #94a3b8; margin-bottom: 10px; }
    .stat-card .value { font-size: 32px; font-weight: 700; }
    .stat-card.pending .value { color: #f59e0b; }
    .stat-card.invoices .value { color: #8b5cf6; }
    .stat-card.clients .value { color: #22c55e; }
    .actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px; margin-bottom: 30px;
    }
    .action-card {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      padding: 30px; border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.1);
      cursor: pointer; transition: all 0.3s;
    }
    .action-card:hover {
      transform: translateY(-5px);
      border-color: #8b5cf6;
      box-shadow: 0 20px 40px rgba(139, 92, 246, 0.2);
    }
    .action-card .icon {
      width: 60px; height: 60px; border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; margin-bottom: 20px;
    }
    .action-card.invoice .icon { background: linear-gradient(135deg, #8b5cf6, #6366f1); }
    .action-card.client .icon { background: linear-gradient(135deg, #22c55e, #16a34a); }
    .action-card.sync .icon { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .action-card h3 { font-size: 18px; margin-bottom: 8px; }
    .action-card p { font-size: 14px; color: #94a3b8; }
    .section {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 20px; overflow: hidden;
    }
    .section-header {
      padding: 20px 25px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex; justify-content: space-between; align-items: center;
    }
    .section-header h2 { font-size: 18px; }
    .section-content { padding: 20px 25px; }
    .list-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 15px; background: rgba(255,255,255,0.03);
      border-radius: 10px; margin-bottom: 10px;
    }
    .list-item:last-child { margin-bottom: 0; }
    .list-item .info h4 { font-size: 15px; margin-bottom: 4px; }
    .list-item .info p { font-size: 13px; color: #94a3b8; }
    .list-item .badge {
      padding: 6px 14px; border-radius: 20px;
      font-size: 12px; font-weight: 600;
    }
    .badge.pending { background: #f59e0b; color: #000; }
    .badge.synced { background: #22c55e; color: #000; }
    .form-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.8); z-index: 1000;
      justify-content: center; align-items: center; padding: 20px;
    }
    .form-overlay.active { display: flex; }
    .form-container {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      border-radius: 20px; width: 100%; max-width: 700px;
      max-height: 90vh; overflow-y: auto;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .form-header {
      padding: 25px 30px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex; justify-content: space-between; align-items: center;
    }
    .form-header h2 { font-size: 22px; }
    .form-close {
      background: none; border: none;
      font-size: 28px; color: #94a3b8; cursor: pointer;
    }
    .form-body { padding: 30px; }
    .form-group { margin-bottom: 20px; }
    .form-group label {
      display: block; font-size: 14px;
      color: #94a3b8; margin-bottom: 8px;
    }
    .form-group input, .form-group select, .form-group textarea {
      width: 100%; padding: 14px 18px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; color: white; font-size: 15px;
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      outline: none; border-color: #8b5cf6;
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .btn {
      padding: 14px 28px; border: none; border-radius: 10px;
      font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4);
    }
    .btn-secondary { background: rgba(255,255,255,0.1); color: white; }
    .form-actions {
      display: flex; gap: 15px; justify-content: flex-end;
      padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);
    }
    .invoice-items { margin-bottom: 20px; }
    .invoice-item {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr auto;
      gap: 10px; margin-bottom: 10px; align-items: center;
    }
    .invoice-item input {
      padding: 10px; background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; color: white;
    }
    .add-item-btn {
      padding: 10px 20px; background: rgba(139, 92, 246, 0.2);
      border: 1px dashed #8b5cf6; border-radius: 8px;
      color: #8b5cf6; cursor: pointer;
    }
    .remove-item {
      background: #ef4444; color: white; border: none;
      width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
    }
    .toast {
      position: fixed; bottom: 30px; right: 30px;
      padding: 18px 28px;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: white; border-radius: 12px; font-weight: 600;
      z-index: 2000; transform: translateX(150%); transition: transform 0.3s;
    }
    .toast.show { transform: translateX(0); }
    .toast.error { background: linear-gradient(135deg, #ef4444, #dc2626); }
    .toast.warning { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .empty-state { text-align: center; padding: 50px; color: #64748b; }
    .empty-state .icon { font-size: 60px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">IC</div>
      <div class="logo-text">
        <h1>${APP_NAME}</h1>
        <p>Mode Hors Ligne</p>
      </div>
    </div>
    <div class="status-badge">⚡ Hors Ligne - ${pendingSync.length} en attente</div>
  </div>
  
  <div class="main">
    <div class="stats">
      <div class="stat-card pending">
        <h3>📤 En attente de sync</h3>
        <div class="value">${pendingSync.length}</div>
      </div>
      <div class="stat-card invoices">
        <h3>📄 Factures locales</h3>
        <div class="value">${data.invoices?.length || 0}</div>
      </div>
      <div class="stat-card clients">
        <h3>👥 Clients enregistrés</h3>
        <div class="value">${data.clients?.length || 0}</div>
      </div>
    </div>
    
    <div class="actions">
      <div class="action-card invoice" onclick="openInvoiceForm()">
        <div class="icon">📄</div>
        <h3>Nouvelle Facture</h3>
        <p>Créer une facture hors ligne</p>
      </div>
      <div class="action-card client" onclick="openClientForm()">
        <div class="icon">👤</div>
        <h3>Nouveau Client</h3>
        <p>Ajouter un client</p>
      </div>
      <div class="action-card sync" onclick="checkConnection()">
        <div class="icon">🔄</div>
        <h3>Vérifier Connexion</h3>
        <p>Tester et synchroniser</p>
      </div>
    </div>
    
    <div class="section">
      <div class="section-header"><h2>📤 En attente de synchronisation</h2></div>
      <div class="section-content">
        ${pendingSync.length === 0 ? 
          '<div class="empty-state"><div class="icon">✅</div><p>Tout est synchronisé !</p></div>' : 
          pendingSync.map(item => `
            <div class="list-item">
              <div class="info">
                <h4>${item.type === 'invoice' ? '📄 Facture' : '👤 Client'}: ${item.data.reference || item.data.companyName || 'N/A'}</h4>
                <p>Créé le ${new Date(item.createdAt).toLocaleString('fr-FR')}</p>
              </div>
              <span class="badge pending">En attente</span>
            </div>
          `).join('')}
      </div>
    </div>
    
    <div class="section">
      <div class="section-header"><h2>📄 Factures créées hors ligne</h2></div>
      <div class="section-content">
        ${(data.invoices || []).length === 0 ? 
          '<div class="empty-state"><div class="icon">📄</div><p>Aucune facture</p></div>' :
          (data.invoices || []).map(inv => `
            <div class="list-item">
              <div class="info">
                <h4>${inv.reference} - ${inv.clientName}</h4>
                <p>${inv.items?.length || 0} article(s) • ${formatCurrency(inv.total || 0)}</p>
              </div>
              <span class="badge ${inv.synced ? 'synced' : 'pending'}">${inv.synced ? 'Synchronisé' : 'En attente'}</span>
            </div>
          `).join('')}
      </div>
    </div>
  </div>
  
  <!-- Formulaire Facture -->
  <div class="form-overlay" id="invoice-form">
    <div class="form-container">
      <div class="form-header">
        <h2>📄 Nouvelle Facture</h2>
        <button class="form-close" onclick="closeForm('invoice-form')">&times;</button>
      </div>
      <div class="form-body">
        <div class="form-row">
          <div class="form-group">
            <label>Entreprise</label>
            <select id="inv-company">
              <option value="icones">ICONES</option>
              <option value="allinone">ALL IN ONE</option>
            </select>
          </div>
          <div class="form-group">
            <label>Type</label>
            <select id="inv-type">
              <option value="facture">Facture</option>
              <option value="proforma">Proforma</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Client *</label>
          <input type="text" id="inv-client" placeholder="Nom du client">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="inv-description" rows="2" placeholder="Description"></textarea>
        </div>
        <div class="form-group">
          <label>Articles</label>
          <div class="invoice-items" id="invoice-items">
            <div class="invoice-item">
              <input type="text" placeholder="Désignation" class="item-desc">
              <input type="number" placeholder="Qté" class="item-qty" value="1">
              <input type="number" placeholder="Prix" class="item-price">
              <input type="text" class="item-total" readonly placeholder="Total">
              <button class="remove-item" onclick="removeItem(this)">&times;</button>
            </div>
          </div>
          <button class="add-item-btn" onclick="addItem()">+ Ajouter article</button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>TVA (%)</label>
            <input type="number" id="inv-tva" value="16">
          </div>
          <div class="form-group">
            <label>Total</label>
            <input type="text" id="inv-total" readonly>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="closeForm('invoice-form')">Annuler</button>
          <button class="btn btn-primary" onclick="saveInvoice()">💾 Enregistrer</button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Formulaire Client -->
  <div class="form-overlay" id="client-form">
    <div class="form-container">
      <div class="form-header">
        <h2>👤 Nouveau Client</h2>
        <button class="form-close" onclick="closeForm('client-form')">&times;</button>
      </div>
      <div class="form-body">
        <div class="form-group">
          <label>Nom entreprise *</label>
          <input type="text" id="client-company" placeholder="Entreprise">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Contact</label>
            <input type="text" id="client-contact" placeholder="Nom">
          </div>
          <div class="form-group">
            <label>Téléphone</label>
            <input type="text" id="client-phone" placeholder="+243">
          </div>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="client-email" placeholder="email@exemple.com">
        </div>
        <div class="form-group">
          <label>Adresse</label>
          <textarea id="client-address" rows="2"></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="closeForm('client-form')">Annuler</button>
          <button class="btn btn-primary" onclick="saveClient()">💾 Enregistrer</button>
        </div>
      </div>
    </div>
  </div>
  
  <div class="toast" id="toast"></div>
  
  <script>
    let offlineData = ${JSON.stringify(data)};
    let pendingSync = ${JSON.stringify(pendingSync)};
    
    function formatCurrency(amount) {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(amount);
    }
    
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = 'toast ' + type + ' show';
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
    
    function openInvoiceForm() { document.getElementById('invoice-form').classList.add('active'); }
    function openClientForm() { document.getElementById('client-form').classList.add('active'); }
    function closeForm(id) { document.getElementById(id).classList.remove('active'); }
    
    function addItem() {
      const container = document.getElementById('invoice-items');
      const item = document.createElement('div');
      item.className = 'invoice-item';
      item.innerHTML = '<input type="text" placeholder="Désignation" class="item-desc"><input type="number" placeholder="Qté" class="item-qty" value="1"><input type="number" placeholder="Prix" class="item-price"><input type="text" class="item-total" readonly placeholder="Total"><button class="remove-item" onclick="removeItem(this)">&times;</button>';
      container.appendChild(item);
      attachItemListeners(item);
    }
    
    function removeItem(btn) {
      if (document.querySelectorAll('.invoice-item').length > 1) {
        btn.parentElement.remove();
        calculateTotal();
      }
    }
    
    function attachItemListeners(item) {
      const qty = item.querySelector('.item-qty');
      const price = item.querySelector('.item-price');
      const total = item.querySelector('.item-total');
      const calc = () => {
        const q = parseFloat(qty.value) || 0;
        const p = parseFloat(price.value) || 0;
        total.value = formatCurrency(q * p);
        calculateTotal();
      };
      qty.addEventListener('input', calc);
      price.addEventListener('input', calc);
    }
    
    function calculateTotal() {
      let subtotal = 0;
      document.querySelectorAll('.invoice-item').forEach(item => {
        const qty = parseFloat(item.querySelector('.item-qty').value) || 0;
        const price = parseFloat(item.querySelector('.item-price').value) || 0;
        subtotal += qty * price;
      });
      const tva = parseFloat(document.getElementById('inv-tva').value) || 0;
      document.getElementById('inv-total').value = formatCurrency(subtotal * (1 + tva / 100));
    }
    
    document.querySelectorAll('.invoice-item').forEach(attachItemListeners);
    document.getElementById('inv-tva').addEventListener('input', calculateTotal);
    
    function generateReference(company, type) {
      const prefix = company === 'icones' ? 'IC' : 'AIO';
      const typePrefix = type === 'proforma' ? 'PRO' : 'FAC';
      const date = new Date();
      const num = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
      return prefix + '-' + typePrefix + '-' + date.getFullYear() + String(date.getMonth()+1).padStart(2,'0') + '-' + num;
    }
    
    function saveInvoice() {
      const company = document.getElementById('inv-company').value;
      const type = document.getElementById('inv-type').value;
      const client = document.getElementById('inv-client').value;
      const description = document.getElementById('inv-description').value;
      const tva = parseFloat(document.getElementById('inv-tva').value) || 0;
      
      if (!client) { showToast('Entrez le nom du client', 'error'); return; }
      
      const items = [];
      let subtotal = 0;
      document.querySelectorAll('.invoice-item').forEach(item => {
        const desc = item.querySelector('.item-desc').value;
        const qty = parseFloat(item.querySelector('.item-qty').value) || 0;
        const price = parseFloat(item.querySelector('.item-price').value) || 0;
        if (desc && qty > 0 && price > 0) {
          items.push({ designation: desc, quantity: qty, unitPrice: price, total: qty * price });
          subtotal += qty * price;
        }
      });
      
      if (items.length === 0) { showToast('Ajoutez au moins un article', 'error'); return; }
      
      const invoice = {
        id: 'offline-' + Date.now(),
        reference: generateReference(company, type),
        company, type, clientName: client, description, items, subtotal, tva,
        tvaAmount: subtotal * tva / 100,
        total: subtotal * (1 + tva / 100),
        createdAt: new Date().toISOString(),
        synced: false
      };
      
      offlineData.invoices = offlineData.invoices || [];
      offlineData.invoices.push(invoice);
      pendingSync.push({ id: invoice.id, type: 'invoice', data: invoice, createdAt: invoice.createdAt });
      
      if (window.electronAPI) {
        window.electronAPI.saveOfflineData(offlineData);
        window.electronAPI.savePendingSync(pendingSync);
      }
      
      showToast('✅ Facture enregistrée !');
      closeForm('invoice-form');
      location.reload();
    }
    
    function saveClient() {
      const company = document.getElementById('client-company').value;
      if (!company) { showToast('Entrez le nom entreprise', 'error'); return; }
      
      const client = {
        id: 'offline-client-' + Date.now(),
        companyName: company,
        contactName: document.getElementById('client-contact').value,
        phone: document.getElementById('client-phone').value,
        email: document.getElementById('client-email').value,
        address: document.getElementById('client-address').value,
        createdAt: new Date().toISOString(),
        synced: false
      };
      
      offlineData.clients = offlineData.clients || [];
      offlineData.clients.push(client);
      pendingSync.push({ id: client.id, type: 'client', data: client, createdAt: client.createdAt });
      
      if (window.electronAPI) {
        window.electronAPI.saveOfflineData(offlineData);
        window.electronAPI.savePendingSync(pendingSync);
      }
      
      showToast('✅ Client enregistré !');
      closeForm('client-form');
      location.reload();
    }
    
    function checkConnection() {
      showToast('🔄 Vérification...', 'warning');
      if (window.electronAPI) window.electronAPI.checkConnection();
    }
  </script>
</body>
</html>`;
  }

  // Charger le mode hors ligne
  function loadOfflineMode() {
    console.log('Chargement du mode hors ligne...');
    const offlineHTML = generateOfflineHTML();
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(offlineHTML));
    
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
  }

  // Mettre à jour le statut en ligne
  function updateOnlineStatus() {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.executeJavaScript(`
        window.__isElectronApp = true;
        window.__isOnline = ${isOnline};
      `).catch(() => {});
    }
  }

  // Tenter la synchronisation
  async function attemptSync() {
    if (!isOnline) return;

    const pending = loadPendingSync();
    if (pending.length === 0) return;

    console.log(`Synchronisation de ${pending.length} éléments...`);
    const synced = [];

    for (const item of pending) {
      try {
        const endpoint = item.type === 'invoice' 
          ? `${ONLINE_URL}/api/invoices/offline-sync`
          : `${ONLINE_URL}/api/clients/offline-sync`;

        const response = await net.fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        });

        if (response.ok) {
          synced.push(item.id);
          console.log(`✅ Synchronisé: ${item.id}`);
        }
      } catch (error) {
        console.error(`Erreur sync ${item.id}:`, error);
      }
    }

    if (synced.length > 0) {
      const remaining = pending.filter(p => !synced.includes(p.id));
      savePendingSync(remaining);
      
      if (remaining.length === 0) {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Synchronisation terminée',
          message: `✅ ${synced.length} élément(s) synchronisé(s) !`
        });
      }
    }
  }

  // Surveillance de la connexion
  setInterval(async () => {
    const wasOnline = isOnline;
    isOnline = await checkOnlineStatus();

    if (!wasOnline && isOnline) {
      console.log('🟢 Connexion rétablie !');
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Connexion rétablie',
        message: '🟢 Internet est de retour !',
        detail: 'Synchroniser les données maintenant ?',
        buttons: ['Synchroniser', 'Plus tard']
      }).then(result => {
        if (result.response === 0) {
          attemptSync();
          loadApp();
        }
      });
    }
  }, 30000);

  // IPC Handlers
  ipcMain.handle('save-offline-data', (event, data) => {
    saveOfflineData(data);
    return true;
  });

  ipcMain.handle('save-pending-sync', (event, data) => {
    savePendingSync(data);
    return true;
  });

  ipcMain.handle('check-connection', async () => {
    isOnline = await checkOnlineStatus();
    if (isOnline) {
      loadApp();
    } else {
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Hors ligne',
        message: '⚠️ Pas de connexion internet',
        detail: 'Continuez à travailler hors ligne. Synchronisation auto quand internet revient.'
      });
    }
    return isOnline;
  });

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    console.log('=== ICONES Gestion v2.0 ===');
    createSplashWindow();
    createMainWindow();
    setTimeout(loadApp, 1000);
  });

  app.on('window-all-closed', () => app.quit());
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });

  process.on('uncaughtException', (error) => console.error('Erreur:', error));
}
