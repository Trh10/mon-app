// Types pour le système d'audit et traçabilité
export interface AuditLog {
  id: string;
  requisitionId: string;
  userId: string;
  userName: string;
  userLevel: number;
  action: AuditAction;
  timestamp: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditAction = 
  | 'created'
  | 'updated' 
  | 'deleted'
  | 'approved'
  | 'rejected'
  | 'submitted_for_review'
  | 'workflow_advanced'
  | 'comment_added'
  | 'pdf_generated'
  | 'viewed';

export interface AuditDetails {
  previousStatus?: string;
  newStatus?: string;
  changedFields?: string[];
  comment?: string;
  approvalLevel?: number;
  reason?: string;
  budget?: number;
  category?: string;
  priority?: string;
  title?: string;
  description?: string;
  justification?: string;
  [key: string]: any; // Permettre des champs supplémentaires
}
