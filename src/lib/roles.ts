import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { auth } from "@lib/firebase";
import type { NeedRole } from "@lib/needs/types";

export async function getCurrentUserRole(): Promise<NeedRole> {
  const u = auth.currentUser;
  if (!u) return "employee";
  const db = getFirestore();
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);
  const role = (snap.exists() ? snap.data()?.role : undefined) as NeedRole | undefined;
  return role || "employee";
}

export async function ensureUserRole(defaultRole: NeedRole = "employee") {
  const u = auth.currentUser;
  if (!u) return;
  const db = getFirestore();
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      role: defaultRole,
      email: u.email || "",
      name: u.displayName || (u.email ? u.email.split("@")[0] : "User"),
      createdAt: new Date().toISOString(),
    });
  }
}