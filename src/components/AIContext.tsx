"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type SummaryData = {
  summary: string;
  urgency: string;
  highlights?: string[];
  actions?: string[];
  language?: string;
  loading?: boolean;
  error?: string;
};

type AIContextType = {
  summaryData: SummaryData | null;
  setSummaryData: (data: SummaryData | null) => void;
  selectedEmailForAI: any;
  setSelectedEmailForAI: (email: any) => void;
  isLoadingAI: boolean;
  setIsLoadingAI: (loading: boolean) => void;
  summarizeEmail: (email: any, content: string) => Promise<void>;
  isReady: boolean;
};

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [selectedEmailForAI, setSelectedEmailForAI] = useState<any>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Attendre que le composant soit monté côté client
  useEffect(() => {
    console.log("🔍 AIProvider: Monté côté client");
    setIsReady(true);
  }, []);

  const summarizeEmail = async (email: any, content: string) => {
    if (!isReady) {
      console.warn("⚠️ AIProvider pas encore prêt");
      return;
    }

    try {
      setIsLoadingAI(true);
      setSelectedEmailForAI(email);
      setSummaryData(null);

      console.log("🧠 Test résumé simple...");

      await new Promise(resolve => setTimeout(resolve, 2000));

      setSummaryData({
        summary: "Ceci est un résumé de test. L'email parle de " + (email.subject || "sujet non défini"),
        urgency: "medium",
        highlights: ["Point important 1", "Point important 2"],
        actions: ["Action à faire 1", "Action à faire 2"],
        language: "fr",
        loading: false
      });

      console.log("✅ Test résumé terminé");

    } catch (error: any) {
      console.error("❌ Erreur test résumé:", error);
      setSummaryData({
        summary: "Erreur lors du test de résumé",
        urgency: "unknown",
        error: error.message,
        loading: false
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  const value = {
    summaryData,
    setSummaryData,
    selectedEmailForAI,
    setSelectedEmailForAI,
    isLoadingAI,
    setIsLoadingAI,
    summarizeEmail,
    isReady
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  
  // Si on est côté serveur ou que le context n'existe pas encore
  if (!context) {
    // Retourner des valeurs par défaut au lieu de lancer une erreur
    console.warn("⚠️ useAI: Context non disponible (probablement côté serveur)");
    
    return {
      summaryData: null,
      setSummaryData: () => {},
      selectedEmailForAI: null,
      setSelectedEmailForAI: () => {},
      isLoadingAI: false,
      setIsLoadingAI: () => {},
      summarizeEmail: async () => {
        console.warn("⚠️ summarizeEmail appelé avant que le Provider soit prêt");
      },
      isReady: false
    };
  }
  
  return context;
}