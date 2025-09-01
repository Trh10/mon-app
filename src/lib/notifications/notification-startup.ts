// Service de démarrage automatique des notifications
let initialized = false;

export function initializeNotificationSystem() {
  if (initialized) {
    return;
  }
  
  try {
    console.log('🚀 Initialisation du système de notifications...');
    
    // Import dynamique pour éviter les problèmes Edge Runtime
    import('./smtp-sender').then(({ startEmailQueueProcessor, initializeEmailTransporter }) => {
      import('./email-service').then(({ getNotificationSettings }) => {
        const settings = getNotificationSettings();
        
        if (settings.enabled) {
          // Initialiser le transporteur email
          const transporterReady = initializeEmailTransporter();
          
          if (transporterReady) {
            // Démarrer le processeur automatique de queue
            startEmailQueueProcessor();
            console.log('✅ Système de notifications initialisé avec succès');
          } else {
            console.log('⚠️  Transporteur email non configuré correctement');
          }
        } else {
          console.log('📴 Notifications email désactivées');
        }
        
        initialized = true;
      }).catch(error => {
        console.error('❌ Erreur import email-service:', error);
      });
    }).catch(error => {
      console.error('❌ Erreur import smtp-sender:', error);
    });
  } catch (error) {
    console.error('❌ Erreur initialisation système notifications:', error);
  }
}
