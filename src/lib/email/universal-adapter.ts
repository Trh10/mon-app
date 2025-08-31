/* Adaptateur statique pour unifier l'appel au "universal client"
   Il essaie plusieurs modules existants et prend la première fonction valide.
   Avantage: pas d'import dynamique -> plus de "Critical dependency".
*/

type UniversalConnectFn = (payload: any) => Promise<any>;

// On importe les modules entiers pour éviter des erreurs de "named export" manquant
import * as enhanced from "./enhanced-universal-client";
import * as complete from "./universal-complete-client";
import * as smart from "./universal-smart-client";
// Optionnel si tu as ce module
import * as base from "./universal-client";
// Optionnel: si tu veux un fallback IMAP brut si aucun universal n’est dispo
// import * as imap from "./imap-client";

export async function universalConnectAdapter(payload: any): Promise<any> {
  const candidates: any[] = [enhanced, complete, smart, base];

  for (const m of candidates) {
    if (!m) continue;
    const fn: UniversalConnectFn | undefined =
      (m as any).universalConnect ||
      (m as any).connectUniversal ||
      (m as any).default;

    if (typeof fn === "function") {
      return await fn(payload);
    }
  }

  // Si tu veux un vrai fallback IMAP ici, active et adapte:
  // if (imap && typeof (imap as any).connect === "function") {
  //   return await (imap as any).connect(payload);
  // }

  throw new Error("UNIVERSAL_CLIENT_NOT_FOUND");
}