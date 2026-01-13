const { contextBridge, ipcRenderer } = require('electron');

// Exposer les APIs sécurisées au renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Sauvegarder les données hors ligne
  saveOfflineData: (data) => ipcRenderer.invoke('save-offline-data', data),
  
  // Sauvegarder les données en attente de sync
  savePendingSync: (data) => ipcRenderer.invoke('save-pending-sync', data),
  
  // Vérifier la connexion
  checkConnection: () => ipcRenderer.invoke('check-connection'),
  
  // Écouter les événements de synchronisation
  onSyncComplete: (callback) => ipcRenderer.on('sync-complete', callback),
  
  // Écouter les changements de statut de connexion
  onConnectionChange: (callback) => ipcRenderer.on('connection-change', callback)
});

// Indiquer que c'est une app Electron
window.addEventListener('DOMContentLoaded', () => {
  window.__isElectronApp = true;
});
