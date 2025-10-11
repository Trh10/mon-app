// Lightweight optional Firestore accessor used throughout the API.
// In environments without Firebase configured, this returns null.
// Callers should branch on null and use local fallbacks.

export type FirestoreLike = {
  collection: (name: string) => any;
};

const FIREBASE_ENABLED = process.env.FIREBASE_ENABLED === "true";

export function getFirestoreIfAvailable(): FirestoreLike | null {
  if (!FIREBASE_ENABLED) return null;
  try {
    // If you later wire up firebase-admin, replace this with the real instance.
    return null;
  } catch {
    return null;
  }
}
