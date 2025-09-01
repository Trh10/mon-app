// Types pour les notifications email
export interface EmailNotification {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  type: NotificationType;
  requisitionId?: string;
  userId?: string;
  priority: EmailPriority;
  status: EmailStatus;
  createdAt: string;
  sentAt?: string;
  error?: string;
  retryCount: number;
}

export type NotificationType =
  | 'requisition_created'
  | 'requisition_approved'
  | 'requisition_rejected'
  | 'requisition_needs_approval'
  | 'requisition_deleted'
  | 'user_created'
  | 'user_updated'
  | 'system_alert';

export type EmailPriority = 'low' | 'normal' | 'high' | 'urgent';

export type EmailStatus = 'pending' | 'sent' | 'failed' | 'retry';

export interface EmailTemplate {
  type: NotificationType;
  subject: string;
  template: string;
  variables: string[];
}

export interface NotificationSettings {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  maxRetries: number;
  retryDelay: number; // en minutes
}
