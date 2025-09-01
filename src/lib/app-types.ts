// Types de base pour l'application
export interface Email {
  id: string;
  subject: string;
  from: string;
  fromName?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  date: string;
  snippet: string;
  unread: boolean;
  hasAttachments: boolean;
  attachments?: Attachment[];
  body?: string;
  html?: string;
  priority?: "P1" | "P2" | "P3";
  labels?: string[];
  threadId?: string;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  data?: string; // base64
  contentId?: string;
}

export interface Task {
  id: string;
  emailId?: string;
  title: string;
  due: string;
  priority: "P1" | "P2" | "P3";
  assignee: string;
  done: boolean;
  project?: string;
  description?: string;
}

export interface UserInfo {
  userName: string;
  email: string;
  provider: string;
  companyRole?: 'directeur' | 'manager' | 'assistant' | 'employe';
  timestamp: string;
}

export interface EmailCredentials {
  email: string;
  provider: string;
  userName: string;
  password?: string;
  accessToken?: string;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  secure?: boolean;
}

// Types pour le workflow d'entreprise
export interface NeedRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  requestedBy: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
  status: "draft" | "submitted" | "manager_approved" | "admin_approved" | "finance_approved" | "rejected" | "completed";
  estimatedCost?: number;
  justification?: string;
  approvals: Array<{
    role: string;
    decision: "approved" | "rejected";
    comment: string;
    timestamp: string;
    by: string;
  }>;
  history: Array<{
    type: string;
    timestamp: string;
    by: string;
    data?: any;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'directeur' | 'manager' | 'assistant' | 'employe';
  title: string;
  department?: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    role: string;
  };
  timestamp: string;
  type: "message" | "system" | "task_assignment";
  metadata?: any;
}

export type CompanyRole = 'directeur' | 'manager' | 'assistant' | 'employe';

export interface RolePermissions {
  canSeeAll: boolean;
  canAssignTasks: boolean;
  canApproveNeeds: boolean;
  canManageFinance: boolean;
  canViewAudit: boolean;
  canManageTeam: boolean;
}
