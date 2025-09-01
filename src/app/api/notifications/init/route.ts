import { NextRequest, NextResponse } from 'next/server';
import { initializeNotificationSystem } from '@/lib/notifications/notification-startup';

let initialized = false;

export async function GET(request: NextRequest) {
  try {
    if (!initialized) {
      // Initialiser le système seulement côté serveur
      initializeNotificationSystem();
      initialized = true;
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Système de notifications initialisé',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Erreur initialisation notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur initialisation' },
      { status: 500 }
    );
  }
}

// Auto-appeler cette route au démarrage (côté serveur seulement)
if (typeof window === 'undefined') {
  setTimeout(async () => {
    try {
      // Auto-initialisation après 3 secondes
      await fetch('http://localhost:3000/api/notifications/init', {
        method: 'GET'
      }).catch(() => {
        // Ignorer les erreurs de connexion au démarrage
        console.log('Auto-initialisation différée...');
      });
    } catch (error) {
      // Silencieux - normal au démarrage
    }
  }, 3000);
}
