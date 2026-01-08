"use client";

import { useEffect, useState } from "react";
import AIPanel from "./IA/AIPanel";
import { useChatNotifications } from "@/hooks/useChatNotifications";
// Suppression des boutons/tests flottants de collaboration

export default function AppMounts() {
  const [dev, setDev] = useState(false);
  
  // Hook pour les notifications de chat en temps réel
  useChatNotifications();
  
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