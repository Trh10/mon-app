"use client";

import { useEffect, useState } from "react";
import AIPanel from "./IA/AIPanel";

export default function AppMounts() {
  const [dev, setDev] = useState(false);
  useEffect(() => { setDev(process.env.NODE_ENV !== "production"); }, []);

  return (
    <>
      <AIPanel />
      {dev && (
        <button
          onClick={() => (window as any).__aiOpen?.({ summary: "Test IA (dev)", highlights: ["Point A","Point B"], actions:["Appeler"] })}
          style={{ position: "fixed", right: 12, bottom: 12, zIndex: 10000 }}
          className="px-2 py-1 text-xs border rounded bg-white shadow"
          title="Tester l’ouverture du panneau IA"
        >
          Test IA
        </button>
      )}
    </>
  );
}