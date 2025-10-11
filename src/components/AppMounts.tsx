"use client";

import { useEffect, useState } from "react";
import AIPanel from "./IA/AIPanel";
// Suppression des boutons/tests flottants de collaboration

export default function AppMounts() {
  const [dev, setDev] = useState(false);
  // (Fonctionnalités de collaboration flottantes retirées)
  
  useEffect(() => { 
    setDev(process.env.NODE_ENV !== "production"); 
  }, []);

  // (Monitoring chat retiré)

  return (
    <>
      <AIPanel />
      
  {/* (UI de collaboration flottante retirée) */}
    </>
  );
}