// Service de notifications email
import fs from 'fs';
import path from 'path';
import { EmailNotification, NotificationType, EmailPriority, EmailTemplate, NotificationSettings } from './email-types';

const NOTIFICATIONS_FILE = path.join(process.cwd(), 'data', 'email-notifications.json');
const SETTINGS_FILE = path.join(process.cwd(), 'data', 'notification-settings.json');

// Templates d'emails par défaut
const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    type: 'requisition_created',
    subject: 'Nouvelle réquisition créée - {{title}}',
    template: `
Bonjour {{requesterName}},

Votre réquisition a été créée avec succès.

Détails :
- Référence : {{id}}
- Objet : {{title}}
- Montant : {{budget}}€
- Statut : {{status}}

Cette réquisition suit maintenant le processus d'approbation selon les règles de l'entreprise.

Vous recevrez une notification dès qu'une action sera prise sur votre demande.

Cordialement,
Système de gestion des réquisitions
    `,
    variables: ['requesterName', 'id', 'title', 'budget', 'status']
  },
  {
    type: 'requisition_needs_approval',
    subject: 'Réquisition en attente d\'approbation - {{title}}',
    template: `
Bonjour {{approverName}},

Une réquisition nécessite votre approbation.

Détails :
- Référence : {{id}}
- Objet : {{title}}
- Demandeur : {{requesterName}}
- Montant : {{budget}}€
- Justification : {{justification}}

Merci de vous connecter au système pour examiner et traiter cette demande.

Lien : {{approvalLink}}

Cordialement,
Système de gestion des réquisitions
    `,
    variables: ['approverName', 'id', 'title', 'requesterName', 'budget', 'justification', 'approvalLink']
  },
  {
    type: 'requisition_approved',
    subject: 'Réquisition approuvée - {{title}}',
    template: `
Bonjour {{requesterName}},

Bonne nouvelle ! Votre réquisition a été approuvée.

Détails :
- Référence : {{id}}
- Objet : {{title}}
- Montant approuvé : {{budget}}€
- Approuvé par : {{approverName}}
- Date d'approbation : {{approvedAt}}

{{#comment}}
Commentaire de l'approbateur : {{comment}}
{{/comment}}

Vous pouvez maintenant procéder à la mise en œuvre de votre demande selon les modalités approuvées.

Cordialement,
Système de gestion des réquisitions
    `,
    variables: ['requesterName', 'id', 'title', 'budget', 'approverName', 'approvedAt', 'comment']
  },
  {
    type: 'requisition_rejected',
    subject: 'Réquisition rejetée - {{title}}',
    template: `
Bonjour {{requesterName}},

Votre réquisition a été rejetée.

Détails :
- Référence : {{id}}
- Objet : {{title}}
- Montant : {{budget}}€
- Rejetée par : {{rejectorName}}
- Date de rejet : {{rejectedAt}}

{{#reason}}
Motif du rejet : {{reason}}
{{/reason}}

Si vous souhaitez faire appel de cette décision ou soumettre une nouvelle demande modifiée, veuillez vous rapprocher du service approprié.

Cordialement,
Système de gestion des réquisitions
    `,
    variables: ['requesterName', 'id', 'title', 'budget', 'rejectorName', 'rejectedAt', 'reason']
  }
];

// Configuration par défaut
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  smtpHost: 'localhost',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
  fromEmail: 'noreply@company.com',
  fromName: 'Système de Réquisitions',
  maxRetries: 3,
  retryDelay: 5
};

// Assurer que le répertoire data existe
function ensureDataDirectory() {
  const dataDir = path.dirname(NOTIFICATIONS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Charger les notifications
export function getNotifications(): EmailNotification[] {
  try {
    ensureDataDirectory();
    
    if (!fs.existsSync(NOTIFICATIONS_FILE)) {
      return [];
    }
    
    const data = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erreur lecture notifications:', error);
    return [];
  }
}

// Sauvegarder les notifications
function saveNotifications(notifications: EmailNotification[]): boolean {
  try {
    ensureDataDirectory();
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
    return true;
  } catch (error) {
    console.error('Erreur sauvegarde notifications:', error);
    return false;
  }
}

// Charger les paramètres
export function getNotificationSettings(): NotificationSettings {
  try {
    ensureDataDirectory();
    
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
      return DEFAULT_SETTINGS;
    }
    
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (error) {
    console.error('Erreur lecture paramètres notifications:', error);
    return DEFAULT_SETTINGS;
  }
}

// Sauvegarder les paramètres
export function saveNotificationSettings(settings: NotificationSettings): boolean {
  try {
    ensureDataDirectory();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Erreur sauvegarde paramètres notifications:', error);
    return false;
  }
}

// Générer un ID unique
function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// Remplacer les variables dans un template
function replaceTemplateVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value || ''));
  });
  
  // Gérer les sections conditionnelles simples
  result = result.replace(/{{#(\w+)}}([\s\S]*?){{\/\1}}/g, (match, key, content) => {
    return variables[key] ? content : '';
  });
  
  return result;
}

// Créer une notification email
export function createEmailNotification(
  recipientEmail: string,
  recipientName: string,
  type: NotificationType,
  variables: Record<string, any>,
  priority: EmailPriority = 'normal'
): string | null {
  try {
    const template = DEFAULT_TEMPLATES.find(t => t.type === type);
    if (!template) {
      console.error(`Template non trouvé pour le type: ${type}`);
      return null;
    }
    
    const subject = replaceTemplateVariables(template.subject, variables);
    const body = replaceTemplateVariables(template.template, variables);
    
    const notification: EmailNotification = {
      id: generateNotificationId(),
      recipientEmail,
      recipientName,
      subject,
      body,
      type,
      requisitionId: variables.id || variables.requisitionId,
      userId: variables.userId,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0
    };
    
    const notifications = getNotifications();
    notifications.push(notification);
    
    if (saveNotifications(notifications)) {
      return notification.id;
    }
    
    return null;
  } catch (error) {
    console.error('Erreur création notification email:', error);
    return null;
  }
}

// Marquer une notification comme envoyée
export function markNotificationAsSent(notificationId: string): boolean {
  try {
    const notifications = getNotifications();
    const index = notifications.findIndex(n => n.id === notificationId);
    
    if (index === -1) return false;
    
    notifications[index].status = 'sent';
    notifications[index].sentAt = new Date().toISOString();
    
    return saveNotifications(notifications);
  } catch (error) {
    console.error('Erreur marquage notification envoyée:', error);
    return false;
  }
}

// Marquer une notification comme échouée
export function markNotificationAsFailed(notificationId: string, error: string): boolean {
  try {
    const notifications = getNotifications();
    const index = notifications.findIndex(n => n.id === notificationId);
    
    if (index === -1) return false;
    
    notifications[index].status = 'failed';
    notifications[index].error = error;
    notifications[index].retryCount += 1;
    
    const settings = getNotificationSettings();
    if (notifications[index].retryCount < settings.maxRetries) {
      notifications[index].status = 'retry';
    }
    
    return saveNotifications(notifications);
  } catch (error) {
    console.error('Erreur marquage notification échouée:', error);
    return false;
  }
}

// Récupérer les notifications en attente
export function getPendingNotifications(): EmailNotification[] {
  try {
    const notifications = getNotifications();
    return notifications.filter(n => n.status === 'pending' || n.status === 'retry');
  } catch (error) {
    console.error('Erreur récupération notifications en attente:', error);
    return [];
  }
}
