import { create } from "zustand";

type Density = "compact" | "dense" | "ultra";

type UIState = {
  selectedEmailId?: string | null;
  setSelectedEmailId?: (id: string | null) => void;

  focusInbox?: boolean;
  toggleFocus?: () => void;

  density: Density;
  setDensity?: (d: Density) => void;
};

function loadDensity(): Density {
  if (typeof localStorage === "undefined") return "dense";
  const v = localStorage.getItem("ui_density");
  if (v === "compact" || v === "dense" || v === "ultra") return v;
  return "dense";
}

export const useUI = create<UIState>((set, get) => ({
  selectedEmailId: null,
  setSelectedEmailId: (id) => set({ selectedEmailId: id }),

  focusInbox: false,
  toggleFocus: () => set({ focusInbox: !get().focusInbox }),

  density: loadDensity(),
  setDensity: (d) => {
    try { localStorage.setItem("ui_density", d); } catch {}
    set({ density: d });
  }
}));