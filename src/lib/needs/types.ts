export type NeedRole = "employee" | "manager" | "admin" | "finance";

export type NeedStatus =
  | "draft"
  | "submitted"
  | "manager_approved"
  | "admin_approved"
  | "finance_approved"
  | "rejected"
  | "fulfilled";

export interface UserRef {
  uid: string;
  email?: string;
  name?: string;
}

export interface ApprovalRecord {
  role: NeedRole;
  decision: "approved" | "rejected";
  comment?: string;
  at: any; // Firestore Timestamp
  by: UserRef;
}

export interface NeedRequest {
  id: string;
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  justification?: string;

  createdBy: UserRef;
  createdAt: any; // Firestore Timestamp
  status: NeedStatus;

  approvals: ApprovalRecord[];
  watchers?: string[];
  history?: Array<{
    type: string;
    at: any;
    by: UserRef;
    data?: any;
  }>;

  attachments?: Array<{
    filename: string;
    url?: string;
    size?: number;
    contentType?: string;
  }>;
}