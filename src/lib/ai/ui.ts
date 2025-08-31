// Bus UI pour ouvrir la zone IA, avec fallbacks robustes + logs
export type AIResultPayload = {
  source?: "email" | "text";
  subject?: string;
  summary: string;
  highlights?: string[];
  actions?: string[];
  language?: string;
};

function canUseBC() {
  return typeof window !== "undefined" && typeof (window as any).BroadcastChannel !== "undefined";
}

export function openAIPaneWith(data: AIResultPayload) {
  try {
    console.debug("[AI:UI] openAIPaneWith payload:", data);
  } catch {}
  // 1) BroadcastChannel si dispo
  if (canUseBC()) {
    try {
      const bc = new BroadcastChannel("ai-pane");
      bc.postMessage({ type: "ai:open", data });
      bc.close();
      return;
    } catch (e) {
      console.warn("[AI:UI] BroadcastChannel failed:", e);
    }
  }
  // 2) Fallback: fonction globale
  try {
    (window as any).__aiOpen?.(data);
    return;
  } catch (e) {
    console.warn("[AI:UI] window.__aiOpen fallback failed:", e);
  }
  // 3) Fallback: CustomEvent
  try {
    const ev = new CustomEvent("ai:open", { detail: data });
    window.dispatchEvent(ev);
  } catch (e) {
    console.error("[AI:UI] CustomEvent fallback failed:", e);
  }
}