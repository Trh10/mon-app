"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark" | "auto";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  accentColor: string;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [accentColor, setAccentColorState] = useState("#8b5cf6");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  // Charger les préférences au démarrage
  useEffect(() => {
    setMounted(true);
    try {
      const savedSettings = localStorage.getItem("app-settings");
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.theme) setThemeState(settings.theme);
        if (settings.accentColor) setAccentColorState(settings.accentColor);
      }
    } catch (e) {
      console.error("Error loading theme settings:", e);
    }
  }, []);

  // Résoudre le thème (pour "auto")
  useEffect(() => {
    if (!mounted) return;

    const updateResolvedTheme = () => {
      if (theme === "auto") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setResolvedTheme(prefersDark ? "dark" : "light");
      } else {
        setResolvedTheme(theme);
      }
    };

    updateResolvedTheme();

    // Écouter les changements de préférence système
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "auto") updateResolvedTheme();
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, mounted]);

  // Appliquer le thème au document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const body = document.body;

    // Appliquer la classe dark/light
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      body.classList.add("dark-mode");
      body.classList.remove("light-mode");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      body.classList.remove("dark-mode");
      body.classList.add("light-mode");
    }

    // Appliquer les variables CSS
    root.style.setProperty("--theme-mode", resolvedTheme);
    root.style.setProperty("--accent-color", accentColor);
    
    // Couleurs de base selon le thème
    if (resolvedTheme === "dark") {
      root.style.setProperty("--bg-primary", "#0f172a");
      root.style.setProperty("--bg-secondary", "#1e293b");
      root.style.setProperty("--bg-tertiary", "#334155");
      root.style.setProperty("--bg-card", "#1e293b");
      root.style.setProperty("--bg-hover", "#334155");
      root.style.setProperty("--text-primary", "#f8fafc");
      root.style.setProperty("--text-secondary", "#94a3b8");
      root.style.setProperty("--text-muted", "#64748b");
      root.style.setProperty("--border-color", "#334155");
      root.style.setProperty("--shadow-color", "rgba(0, 0, 0, 0.3)");
    } else {
      root.style.setProperty("--bg-primary", "#ffffff");
      root.style.setProperty("--bg-secondary", "#f8fafc");
      root.style.setProperty("--bg-tertiary", "#f1f5f9");
      root.style.setProperty("--bg-card", "#ffffff");
      root.style.setProperty("--bg-hover", "#f1f5f9");
      root.style.setProperty("--text-primary", "#0f172a");
      root.style.setProperty("--text-secondary", "#475569");
      root.style.setProperty("--text-muted", "#94a3b8");
      root.style.setProperty("--border-color", "#e2e8f0");
      root.style.setProperty("--shadow-color", "rgba(0, 0, 0, 0.1)");
    }

    console.log("[Theme] Applied:", { theme, resolvedTheme, accentColor });
  }, [resolvedTheme, accentColor, mounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    // Sauvegarder dans localStorage
    try {
      const savedSettings = localStorage.getItem("app-settings");
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      settings.theme = newTheme;
      localStorage.setItem("app-settings", JSON.stringify(settings));
    } catch (e) {}
  }, []);

  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color);
    document.documentElement.style.setProperty("--accent-color", color);
    // Sauvegarder dans localStorage
    try {
      const savedSettings = localStorage.getItem("app-settings");
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      settings.accentColor = color;
      localStorage.setItem("app-settings", JSON.stringify(settings));
    } catch (e) {}
  }, []);

  // Éviter le flash de thème incorrect
  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, accentColor, setTheme, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
