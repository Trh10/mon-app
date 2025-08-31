import type { Role } from "../auth/roles";

export type Member = {
  id: string;
  name: string;
  role: Role;
  title: string;
  email: string;
  avatar?: string;
};

const members: Member[] = [
  { id: "u-alice", name: "Alice", role: "manager", title: "Cheffe de projet", email: "alice@company.com" },
  { id: "u-bob", name: "Bob", role: "assistant", title: "Assistant Ops", email: "bob@company.com" },
  { id: "u-chris", name: "Chris", role: "employe", title: "Sales", email: "chris@company.com" },
  { id: "u-dina", name: "Dina", role: "chef", title: "Direction", email: "dina@company.com" },
];

export function listMembers(): Member[] {
  return members.slice();
}

export function getMember(id: string) {
  return members.find((m) => m.id === id) || null;
}