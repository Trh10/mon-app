export type Role = "chef" | "manager" | "assistant" | "employe";

export type Action =
  | "send_chat"
  | "update_cursor"
  | "assign_role"
  | "view_audit"
  | "manage_project";

const roleMatrix: Record<Role, Action[]> = {
  chef: ["send_chat", "update_cursor", "assign_role", "view_audit", "manage_project"],
  manager: ["send_chat", "update_cursor", "assign_role", "view_audit"],
  assistant: ["send_chat", "update_cursor", "view_audit"],
  employe: ["send_chat", "update_cursor"],
};

export function can(role: Role, action: Action) {
  return roleMatrix[role]?.includes(action) ?? false;
}

export function actionFromEvent(event: string): Action | null {
  switch (event) {
    case "chat":
      return "send_chat";
    case "cursor":
      return "update_cursor";
    case "assign_role":
      return "assign_role";
    case "audit:view":
      return "view_audit";
    case "project:manage":
      return "manage_project";
    default:
      return null;
  }
}