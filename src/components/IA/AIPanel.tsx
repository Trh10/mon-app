"use client";

import { useEffect, useRef, useState } from "react";

export type AIResultPayload = {
  source?: "email" | "text";
  subject?: string;
  summary: string;
  highlights?: string[];
  actions?: string[];
  language?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function AIPanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<AIResultPayload | null>(null);
  const [boot, setBoot] = useState(false); // spinner seulement pendant une ouverture en cours
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return { x: 560, y: 24 };
    try { const raw = localStorage.getItem("__ai_pane_pos"); if (raw) return JSON.parse(raw); } catch {}
    return { x: 560, y: 24 };
  });
  const [size, setSize] = useState<{ w: number; h: number }>(() => {
    if (typeof window === "undefined") return { w: 460, h: 520 };
    try {
      const w = parseInt(localStorage.getItem("__ai_pane_w") || "", 10);
      const h = parseInt(localStorage.getItem("__ai_pane_h") || "", 10);
      if (isFinite(w) && isFinite(h) && w >= 360 && h >= 360) return { w, h };
    } catch {}
    return { w: 460, h: 520 };
  });

  // Persistance position/taille
  useEffect(() => { try { localStorage.setItem("__ai_pane_pos", JSON.stringify(pos)); } catch {} }, [pos]);
  useEffect(() => { try { localStorage.setItem("__ai_pane_w", String(size.w)); localStorage.setItem("__ai_pane_h", String(size.h)); } catch {} }, [size]);

  // Raccourcis d'ouverture
  function openWith(payload: AIResultPayload) {
    try { console.debug("[AIPanel] openWith", payload); } catch {}
    setData(payload);
    setOpen(true);
    setBoot(false); // on désactive tout spinner si présent
    // Repositionne dans l’écran au cas où
    try {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPos((p) => ({
        x: clamp(p.x, 8, Math.max(8, vw - size.w - 8)),
        y: clamp(p.y, 8, Math.max(8, vh - size.h - 8)),
      }));
    } catch {}
  }

  // Listeners: BroadcastChannel + fonction globale + CustomEvent
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("ai-pane");
      (bc as any).onmessage = (ev: MessageEvent) => {
        const msg = (ev?.data || {}) as any;
        if (msg?.type === "ai:open" && msg?.data) {
          openWith(msg.data as AIResultPayload);
        }
      };
    } catch (e) {
      console.warn("[AIPanel] BroadcastChannel indisponible:", e);
    }

    // Expose une fonction globale fiable
    (window as any).__aiOpen = (payload: AIResultPayload) => openWith(payload);

    const onCustom = (ev: Event) => {
      const ce = ev as CustomEvent<AIResultPayload>;
      if (ce?.detail) openWith(ce.detail);
    };
    window.addEventListener("ai:open", onCustom as any);

    console.debug("[AIPanel] Monté et prêt.");
    return () => {
      try { bc?.close(); } catch {}
      try { delete (window as any).__aiOpen; } catch {}
      window.removeEventListener("ai:open", onCustom as any);
    };
  }, [size.w, size.h]);

  // Drag & resize
  const dragging = useRef(false);
  const start = useRef({ mx: 0, my: 0, x: 0, y: 0 });
  function onHeaderDown(e: React.MouseEvent) {
    dragging.current = true;
    start.current = { mx: e.clientX, my: e.clientY, x: pos.x, y: pos.y };
    window.addEventListener("mousemove", onMove as any);
    window.addEventListener("mouseup", onUp as any, { once: true });
  }
  function onMove(e: MouseEvent) {
    if (dragging.current) {
      const dx = e.clientX - start.current.mx;
      const dy = e.clientY - start.current.my;
      setPos({ x: Math.max(8, start.current.x + dx), y: Math.max(8, start.current.y + dy) });
    }
    if ((rstart as any).currentResizing) {
      const dx = e.clientX - rstart.current.mx;
      const dy = e.clientY - rstart.current.my;
      setSize({ w: Math.max(360, rstart.current.w + dx), h: Math.max(360, rstart.current.h + dy) });
    }
  }
  function onUp() {
    dragging.current = false;
    (rstart as any).currentResizing = false;
    window.removeEventListener("mousemove", onMove as any);
  }
  const rstart = useRef({ mx: 0, my: 0, w: 0, h: 0 }) as any;
  function onResizeDown(e: React.MouseEvent) {
    e.stopPropagation();
    rstart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
    (rstart as any).currentResizing = true;
    window.addEventListener("mousemove", onMove as any);
    window.addEventListener("mouseup", onUp as any, { once: true });
  }

  // Bouton de secours pour réinitialiser si jamais bloqué
  function hardReset() {
    setBoot(false);
    setOpen(false);
    setData(null);
    try { delete (window as any).__aiOpen; } catch {}
    setTimeout(() => {
      (window as any).__aiOpen = (payload: AIResultPayload) => openWith(payload);
      console.debug("[AIPanel] Réinitialisé.");
    }, 0);
  }

  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex: 10000 }}
      className="bg-white border shadow-2xl rounded-md flex flex-col"
    >
      <div onMouseDown={onHeaderDown} className="cursor-move bg-gray-900 text-white rounded-t-md px-3 py-2 flex items-center justify-between">
        <div className="font-semibold text-sm">IA · Résumé</div>
        <div className="flex items-center gap-2">
          <button onClick={hardReset} className="text-white/80 hover:text-white text-xs">Réinitialiser IA</button>
          <button onClick={() => setOpen(false)} className="text-white/90 hover:text-white text-sm">Fermer</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 relative">
        {boot && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
              <span>Chargement du système IA…</span>
            </div>
          </div>
        )}

        {!data ? (
          <div className="text-sm text-gray-500">
            Sélectionnez un email pour l’analyser ou uploadez un document.
          </div>
        ) : (
          <div className="space-y-3">
            {data.subject && <div className="font-semibold">{data.subject}</div>}
            <div className="text-sm leading-6 whitespace-pre-wrap">{data.summary}</div>

            {Array.isArray(data.highlights) && data.highlights.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Points clés</div>
                <ul className="list-disc pl-5 text-sm">
                  {data.highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            )}

            {Array.isArray(data.actions) && data.actions.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Actions</div>
                <ul className="list-disc pl-5 text-sm">
                  {data.actions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        onMouseDown={onResizeDown}
        title="Redimensionner"
        style={{ position: "absolute", right: 6, bottom: 6, width: 16, height: 16, cursor: "nwse-resize", opacity: 0.8 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 13h10M6 10h7M9 7h4" stroke="#9ca3af" strokeWidth="1.5" /></svg>
      </div>
    </div>
  );
}