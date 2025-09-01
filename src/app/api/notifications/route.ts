import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  getNotificationSettings, 
  saveNotificationSettings, 
  createEmailNotification, 
  getPendingNotifications,
  getNotifications 
} from '../../../lib/notifications/email-service';
import { 
  initializeEmailTransporter, 
  testEmailConnection, 
  sendTestEmail, 
  processEmailQueue 
} from '../../../lib/notifications/smtp-sender';

// Récupérer l'utilisateur actuel depuis la session
async function getCurrentUser(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('user-session');
    
    if (!sessionCookie) {
      return null;
    }

    return JSON.parse(sessionCookie.value);
  } catch (error) {
    console.error('Erreur parsing session:', error);
    return null;
  }
}

// GET - Récupérer les paramètres de notification
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user || ![1, 5, 6, 7, 10].includes(user.role)) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'test-connection') {
      const success = await testEmailConnection();
      return NextResponse.json({ success });
    }
    
    if (action === 'queue-status') {
      const pending = getPendingNotifications();
      const all = getNotifications();
      return NextResponse.json({
        pending: pending.length,
        total: all.length,
        notifications: pending.slice(0, 10) // Dernières 10 notifications
      });
    }
    
    if (action === 'process-queue') {
      const results = await processEmailQueue();
      return NextResponse.json(results);
    }
    
    // Par défaut, retourner les paramètres
    const settings = getNotificationSettings();
    
    // Ne pas exposer le mot de passe SMTP dans la réponse
    const safeSettings = {
      ...settings,
      smtpPassword: settings.smtpPassword ? '***' : ''
    };
    
    return NextResponse.json(safeSettings);
  } catch (error) {
    console.error('Erreur GET notifications:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST - Sauvegarder les paramètres ou envoyer un email de test
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user || ![1, 5, 6, 7, 10].includes(user.role)) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { action, ...data } = body;
    
    if (action === 'test-email') {
      const { recipientEmail, recipientName } = data;
      
      if (!recipientEmail) {
        return NextResponse.json(
          { error: 'Email destinataire requis' },
          { status: 400 }
        );
      }
      
      const success = await sendTestEmail(recipientEmail, recipientName);
      return NextResponse.json({ success });
    }
    
    if (action === 'create-notification') {
      const { recipientEmail, recipientName, type, variables, priority } = data;
      
      if (!recipientEmail || !type || !variables) {
        return NextResponse.json(
          { error: 'Paramètres manquants pour créer la notification' },
          { status: 400 }
        );
      }
      
      const notificationId = createEmailNotification(
        recipientEmail,
        recipientName || 'Utilisateur',
        type,
        variables,
        priority || 'normal'
      );
      
      if (notificationId) {
        return NextResponse.json({ 
          success: true, 
          notificationId 
        });
      } else {
        return NextResponse.json(
          { error: 'Erreur création notification' },
          { status: 500 }
        );
      }
    }
    
    // Action par défaut : sauvegarder les paramètres
    const settings = {
      enabled: Boolean(data.enabled),
      smtpHost: String(data.smtpHost || 'localhost'),
      smtpPort: Number(data.smtpPort) || 587,
      smtpSecure: Boolean(data.smtpSecure),
      smtpUser: String(data.smtpUser || ''),
      smtpPassword: data.smtpPassword === '***' ? 
        getNotificationSettings().smtpPassword : // Garder l'ancien mot de passe
        String(data.smtpPassword || ''),
      fromEmail: String(data.fromEmail || 'noreply@company.com'),
      fromName: String(data.fromName || 'Système de Réquisitions'),
      maxRetries: Number(data.maxRetries) || 3,
      retryDelay: Number(data.retryDelay) || 5
    };
    
    const success = saveNotificationSettings(settings);
    
    if (success) {
      // Réinitialiser le transporteur avec les nouveaux paramètres
      if (settings.enabled) {
        initializeEmailTransporter();
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'Paramètres sauvegardés avec succès'
      });
    } else {
      return NextResponse.json(
        { error: 'Erreur sauvegarde paramètres' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erreur POST notifications:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
