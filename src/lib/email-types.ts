// Email and attachment types
export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
}

export interface Email {
  id: string;
  subject: string;
  from: string;
  fromName: string;
  date: string;
  snippet: string;
  unread: boolean;
  hasAttachments: boolean;
  body?: string;
  attachments?: Attachment[];
  priority?: 'high' | 'normal' | 'low';
  read?: boolean;
  threadId?: string;
}

// User and authentication types  
export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface EmailCredentials {
  email: string;
  password?: string;
  provider: 'gmail' | 'outlook' | 'yahoo' | 'custom';
  accessToken?: string;
  refreshToken?: string;
  imapHost?: string;
  smtpHost?: string;
  imapPort?: number;
  smtpPort?: number;
  imapTls?: boolean;
  smtpTls?: boolean;
}