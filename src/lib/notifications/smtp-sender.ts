import nodemailer from 'nodemailer';
import { getNotificationSettings, markNotificationAsSent, markNotificationAsFailed, getPendingNotifications } from './email-service';
import { EmailNotification } from './email-types';

// Configuration du transporteur email
let transporter: nodemailer.Transporter | null = null;

// Initialiser le transporteur email
export function initializeEmailTransporter(): boolean {
  try {
    const settings = getNotificationSettings();
    
    if (!settings.enabled) {
      console.log('Notifications email désactivées');
      return false;
    }
    
    transporter = nodemailer.createTransporter({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: settings.smtpUser && settings.smtpPassword ? {
        user: settings.smtpUser,
        pass: settings.smtpPassword
      } : undefined,
      tls: {
        rejectUnauthorized: false
      }
    });
    
    console.log('Transporteur email initialisé');
    return true;
  } catch (error) {
    console.error('Erreur initialisation transporteur email:', error);
    return false;
  }
}

// Tester la connexion email
export async function testEmailConnection(): Promise<boolean> {
  try {
    if (!transporter) {
      if (!initializeEmailTransporter()) {
        return false;
      }
    }
    
    if (!transporter) return false;
    
    await transporter.verify();
    console.log('Connexion email testée avec succès');
    return true;
  } catch (error) {
    console.error('Erreur test connexion email:', error);
    return false;
  }
}

// Envoyer un email
export async function sendEmail(notification: EmailNotification): Promise<boolean> {
  try {
    if (!transporter) {
      if (!initializeEmailTransporter()) {
        throw new Error('Transporteur email non configuré');
      }
    }
    
    if (!transporter) {
      throw new Error('Impossible d\'initialiser le transporteur email');
    }
    
    const settings = getNotificationSettings();
    
    const mailOptions = {
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: `"${notification.recipientName}" <${notification.recipientEmail}>`,
      subject: notification.subject,
      text: notification.body,
      html: notification.body.replace(/\n/g, '<br>'),
      priority: notification.priority === 'high' ? 'high' : 'normal' as any
    };
    
    const result = await transporter.sendMail(mailOptions);
    
    if (result.messageId) {
      markNotificationAsSent(notification.id);
      console.log(`Email envoyé avec succès: ${notification.id} -> ${notification.recipientEmail}`);
      return true;
    } else {
      throw new Error('Aucun ID de message retourné');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error(`Erreur envoi email ${notification.id}:`, errorMessage);
    markNotificationAsFailed(notification.id, errorMessage);
    return false;
  }
}

// Traiter la queue des emails en attente
export async function processEmailQueue(): Promise<{ sent: number; failed: number }> {
  const results = { sent: 0, failed: 0 };
  
  try {
    const pendingNotifications = getPendingNotifications();
    
    if (pendingNotifications.length === 0) {
      return results;
    }
    
    console.log(`Traitement de ${pendingNotifications.length} notifications en attente`);
    
    const settings = getNotificationSettings();
    
    for (const notification of pendingNotifications) {
      // Délai entre les retry
      if (notification.status === 'retry' && notification.retryCount > 0) {
        const delayMs = settings.retryDelay * 1000 * notification.retryCount;
        const createdAt = new Date(notification.createdAt).getTime();
        const now = Date.now();
        
        if (now - createdAt < delayMs) {
          console.log(`Retry trop récent pour ${notification.id}, attente...`);
          continue;
        }
      }
      
      const success = await sendEmail(notification);
      
      if (success) {
        results.sent++;
      } else {
        results.failed++;
      }
      
      // Petit délai entre les envois pour éviter de surcharger le serveur SMTP
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Queue traitée: ${results.sent} envoyés, ${results.failed} échoués`);
  } catch (error) {
    console.error('Erreur traitement queue email:', error);
  }
  
  return results;
}

// Démarrer le processeur automatique de queue (toutes les 5 minutes)
let queueProcessor: NodeJS.Timeout | null = null;

export function startEmailQueueProcessor(): void {
  if (queueProcessor) {
    stopEmailQueueProcessor();
  }
  
  console.log('Démarrage du processeur de queue email (intervalle: 5 minutes)');
  
  queueProcessor = setInterval(async () => {
    try {
      await processEmailQueue();
    } catch (error) {
      console.error('Erreur dans le processeur automatique de queue:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

export function stopEmailQueueProcessor(): void {
  if (queueProcessor) {
    clearInterval(queueProcessor);
    queueProcessor = null;
    console.log('Processeur de queue email arrêté');
  }
}

// Envoyer un email de test
export async function sendTestEmail(
  recipientEmail: string, 
  recipientName: string = 'Utilisateur Test'
): Promise<boolean> {
  try {
    const settings = getNotificationSettings();
    
    if (!transporter) {
      if (!initializeEmailTransporter()) {
        throw new Error('Impossible d\'initialiser le transporteur email');
      }
    }
    
    if (!transporter) {
      throw new Error('Transporteur email non disponible');
    }
    
    const mailOptions = {
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: `"${recipientName}" <${recipientEmail}>`,
      subject: 'Test de configuration email - Système de Réquisitions',
      text: `Bonjour ${recipientName},\n\nCeci est un email de test pour vérifier la configuration du système de notifications.\n\nSi vous recevez cet email, la configuration est correcte.\n\nCordialement,\nSystème de gestion des réquisitions`,
      html: `
        <h2>Test de configuration email</h2>
        <p>Bonjour <strong>${recipientName}</strong>,</p>
        <p>Ceci est un email de test pour vérifier la configuration du système de notifications.</p>
        <p>Si vous recevez cet email, la configuration est correcte.</p>
        <p>Cordialement,<br>Système de gestion des réquisitions</p>
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    
    if (result.messageId) {
      console.log(`Email de test envoyé avec succès à ${recipientEmail}`);
      return true;
    } else {
      throw new Error('Aucun ID de message retourné');
    }
  } catch (error) {
    console.error('Erreur envoi email de test:', error);
    return false;
  }
}
