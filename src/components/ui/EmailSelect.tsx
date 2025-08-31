"use client";

import { useCallback } from "react";

// Ce composant coche/décoche et notifie l'app.
// - Il ESSAIE d'appeler useUI().setSelectedEmailId si présent.
// - Il diffuse TOUJOURS un CustomEvent 'mail:selected' pour que le RightPane capte la sélection même si le store ne marche pas.

export function EmailSelectCheckbox({ id, selected, className = "" }: { id: string; selected?: boolean; className?: string }) {
  // On résout useUI dynamiquement pour ne pas casser si @store n'existe pas ou ne compile pas encore
  let selectedFromStore: boolean | undefined = undefined;
  let setSelectedEmailId: ((v: string | null) => void) | undefined = undefined;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@store");
    if (mod?.useUI) {
      const state = mod.useUI.getState?.();
      if (state) {
        selectedFromStore = state.selectedEmailId === id;
        setSelectedEmailId = mod.useUI.getState().setSelectedEmailId;
      }
    }
  } catch {
    // Pas de store? on ignore, on utilisera l'événement.
  }

  const checked = selected ?? selectedFromStore ?? false;

  const broadcast = (value: string | null) => {
    try {
      window.dispatchEvent(new CustomEvent("mail:selected", { detail: value }));
    } catch {}
  };

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      const next = checked ? null : id;
      // Store si dispo
      try {
        setSelectedEmailId?.(next);
      } catch {}
      // Toujours diffuser l'événement (fallback)
      broadcast(next);
    },
    [checked, id, setSelectedEmailId]
  );

  const onClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <input
      type="checkbox"
      aria-label="Sélectionner cet email"
      title="Sélectionner pour résumé"
      checked={checked}
      onChange={onChange}
      onClick={onClick}
      className={
        "h-4 w-4 rounded border border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-400 " +
        className
      }
    />
  );
}