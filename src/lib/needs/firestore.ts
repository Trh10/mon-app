import {
  getFirestore, serverTimestamp, collection, addDoc, doc, updateDoc,
  onSnapshot, query, where, orderBy, arrayUnion
} from "firebase/firestore";
import { auth } from "@lib/firebase";
import type { NeedRequest, NeedRole } from "@lib/needs/types";

function nowISO() { return new Date().toISOString(); }

function me() {
  const u = auth.currentUser;
  return {
    uid: u?.uid || "anon",
    email: u?.email || "",
    name: u?.displayName || (u?.email ? u.email.split("@")[0] : "User"),
  };
}

export async function createNeedRequest(input: {
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  justification?: string;
  attachments?: NeedRequest["attachments"];
}): Promise<string> {
  const db = getFirestore();
  const ref = await addDoc(collection(db, "needRequests"), {
    title: input.title,
    description: input.description,
    amount: input.amount ?? null,
    currency: input.currency ?? "XOF",
    justification: input.justification ?? "",
    attachments: input.attachments ?? [],
    createdBy: me(),
    createdAt: serverTimestamp(),   // top-level OK
    lastEventAt: serverTimestamp(), // top-level OK
    status: "draft",
    approvals: [],
    history: [
      {
        type: "created",
        at: nowISO(),                // Pas de serverTimestamp() dans un array
        by: me(),
        data: { title: input.title, amount: input.amount ?? null, currency: input.currency ?? "XOF" },
      },
    ],
  } as Omit<NeedRequest, "id">);
  return ref.id;
}

export async function submitNeedRequest(id: string) {
  const db = getFirestore();
  const ref = doc(db, "needRequests", id);
  // Pas de lecture préalable: on laisse les règles sécurité valider la transition
  await updateDoc(ref, {
    status: "submitted",
    lastEventAt: serverTimestamp(),
    history: arrayUnion({ type: "submitted", at: nowISO(), by: me() }),
  });
}

export async function approveRequest(id: string, role: NeedRole, comment?: string) {
  const db = getFirestore();
  const ref = doc(db, "needRequests", id);

  // Calcul du prochain statut côté client (les règles valideront de toute façon)
  const nextByRole: Record<NeedRole, string> = {
    employee: "submitted",      // non utilisé ici
    manager: "manager_approved",
    admin: "admin_approved",
    finance: "finance_approved",
  };
  const to = nextByRole[role] || "submitted";

  await updateDoc(ref, {
    status: to,
    lastEventAt: serverTimestamp(),
    approvals: arrayUnion({
      role,
      decision: "approved",
      comment: comment || "",
      at: nowISO(),
      by: me(),
    }),
    history: arrayUnion({ type: `approved_${role}`, at: nowISO(), by: me(), data: { comment: comment || "" } }),
  });
}

export async function rejectRequest(id: string, role: NeedRole, comment?: string) {
  const db = getFirestore();
  const ref = doc(db, "needRequests", id);
  await updateDoc(ref, {
    status: "rejected",
    lastEventAt: serverTimestamp(),
    approvals: arrayUnion({
      role,
      decision: "rejected",
      comment: comment || "",
      at: nowISO(),
      by: me(),
    }),
    history: arrayUnion({ type: `rejected_${role}`, at: nowISO(), by: me(), data: { comment: comment || "" } }),
  });
}

export async function executeRequest(id: string, details?: { paymentRef?: string; note?: string }) {
  const db = getFirestore();
  const ref = doc(db, "needRequests", id);
  await updateDoc(ref, {
    status: "fulfilled",
    lastEventAt: serverTimestamp(),
    history: arrayUnion({ type: "executed", at: nowISO(), by: me(), data: details || {} }),
  });
}

// Abonnements temps réel (UI)
export function subscribeMyRequests(uid: string, cb: (docs: NeedRequest[]) => void) {
  const db = getFirestore();
  const q = query(
    collection(db, "needRequests"),
    where("createdBy.uid", "==", uid),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
  }, (err) => {
    console.error("subscribeMyRequests error:", err);
    cb([]);
  });
}

export function subscribeQueueForRole(role: NeedRole, cb: (docs: NeedRequest[]) => void) {
  const db = getFirestore();
  let qRef: any;
  if (role === "manager") {
    qRef = query(collection(db, "needRequests"), where("status", "==", "submitted"), orderBy("createdAt", "desc"));
  } else if (role === "admin") {
    qRef = query(collection(db, "needRequests"), where("status", "==", "manager_approved"), orderBy("createdAt", "desc"));
  } else if (role === "finance") {
    qRef = query(collection(db, "needRequests"), where("status", "in", ["admin_approved", "finance_approved"]), orderBy("createdAt", "desc"));
  } else {
    qRef = query(collection(db, "needRequests"), where("status", "==", "submitted"), orderBy("createdAt", "desc"));
  }
  return onSnapshot(qRef, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
  }, (err) => {
    console.error("subscribeQueueForRole error:", err);
    cb([]);
  });
}