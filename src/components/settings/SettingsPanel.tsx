"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Moon,
  Sun,
  Monitor,
  Palette,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Clock,
  Mail,
  FileSignature,
  Globe,
  Calendar,
  Bot,
  Sparkles,
  Zap,
  User,
  Camera,
  Download,
  Check,
  Save,
  RotateCcw,
  ChevronDown,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { useCodeAuth } from "../auth/CodeAuthContext";
import { useTheme, Theme } from "@/contexts/ThemeContext";

type SettingsSection = 
  | "appearance" 
  | "notifications" 
  | "security" 
  | "email" 
  | "language" 
  | "ai" 
  | "profile";

interface Settings {
  theme: "light" | "dark" | "auto";
  accentColor: string;
  fontSize: "small" | "normal" | "large";
  animationsEnabled: boolean;
  pushEnabled: boolean;
  soundEnabled: boolean;
  emailNotifications: boolean;
  doNotDisturbStart: string;
  doNotDisturbEnd: string;
  doNotDisturbEnabled: boolean;
  twoFactorEnabled: boolean;
  autoLockMinutes: number;
  showActivityHistory: boolean;
  signature: string;
  autoReplyEnabled: boolean;
  autoReplyMessage: string;
  language: string;
  dateFormat: string;
  timezone: string;
  aiEnabled: boolean;
  aiSuggestionLevel: "minimal" | "normal" | "detailed";
  aiLanguage: string;
  aiTone: "formal" | "casual" | "professional";
  displayName: string;
  jobTitle: string;
  avatarUrl: string;
}

const defaultSettings: Settings = {
  theme: "dark",
  accentColor: "#8b5cf6",
  fontSize: "normal",
  animationsEnabled: true,
  pushEnabled: true,
  soundEnabled: true,
  emailNotifications: true,
  doNotDisturbStart: "22:00",
  doNotDisturbEnd: "08:00",
  doNotDisturbEnabled: false,
  twoFactorEnabled: false,
  autoLockMinutes: 15,
  showActivityHistory: true,
  signature: "",
  autoReplyEnabled: false,
  autoReplyMessage: "",
  language: "fr",
  dateFormat: "DD/MM/YYYY",
  timezone: "Europe/Paris",
  aiEnabled: true,
  aiSuggestionLevel: "normal",
  aiLanguage: "fr",
  aiTone: "professional",
  displayName: "",
  jobTitle: "",
  avatarUrl: "",
};

const accentColors = [
  { name: "Violet", value: "#8b5cf6" },
  { name: "Bleu", value: "#3b82f6" },
  { name: "Vert", value: "#10b981" },
  { name: "Rose", value: "#ec4899" },
  { name: "Orange", value: "#f97316" },
  { name: "Rouge", value: "#ef4444" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Indigo", value: "#6366f1" },
];

const languages = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
];

const timezones = [
  { value: "Europe/Paris", label: "Paris (UTC+1)" },
  { value: "Europe/London", label: "Londres (UTC+0)" },
  { value: "America/New_York", label: "New York (UTC-5)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC-8)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
  { value: "Africa/Kinshasa", label: "Kinshasa (UTC+1)" },
  { value: "Africa/Lagos", label: "Lagos (UTC+1)" },
];

const dateFormats = [
  { value: "DD/MM/YYYY", label: "31/12/2025" },
  { value: "MM/DD/YYYY", label: "12/31/2025" },
  { value: "YYYY-MM-DD", label: "2025-12-31" },
  { value: "DD MMM YYYY", label: "31 Déc 2025" },
];

// Traductions
const translations: Record<string, Record<string, string>> = {
  fr: {
    settings: "Paramètres",
    appearance: "Apparence",
    notifications: "Notifications",
    security: "Sécurité",
    email: "Email",
    language: "Langue & Région",
    ai: "Intelligence Artificielle",
    profile: "Profil",
    theme: "Thème",
    light: "Clair",
    dark: "Sombre",
    auto: "Auto",
    accentColor: "Couleur d'accent",
    fontSize: "Taille de police",
    small: "Petite",
    normal: "Normale",
    large: "Grande",
    animations: "Animations",
    animationsDesc: "Activer les animations de l'interface",
    save: "Enregistrer",
    saved: "Enregistré !",
    reset: "Réinitialiser",
    pushNotifications: "Notifications push",
    pushDesc: "Recevoir des notifications en temps réel",
    sounds: "Sons",
    soundsDesc: "Activer les sons de notification",
    emailNotif: "Notifications par email",
    emailNotifDesc: "Recevoir des résumés par email",
    doNotDisturb: "Ne pas déranger",
    doNotDisturbDesc: "Désactiver les notifications pendant certaines heures",
    from: "De",
    to: "À",
    twoFactor: "Authentification à deux facteurs",
    twoFactorDesc: "Ajouter une couche de sécurité supplémentaire",
    autoLock: "Verrouillage automatique",
    autoLockDesc: "Se déconnecter après une période d'inactivité",
    minutes: "minutes",
    activityHistory: "Historique des activités",
    activityHistoryDesc: "Voir l'historique de vos connexions",
    signature: "Signature email",
    signatureDesc: "Ajouter une signature à vos emails",
    autoReply: "Réponse automatique",
    autoReplyDesc: "Envoyer une réponse automatique aux nouveaux emails",
    autoReplyMessage: "Message de réponse automatique",
    interfaceLanguage: "Langue de l'interface",
    dateFormat: "Format de date",
    timezone: "Fuseau horaire",
    aiAssistant: "Assistant IA",
    aiAssistantDesc: "Activer les suggestions de l'IA",
    suggestionLevel: "Niveau de suggestions",
    minimal: "Minimal",
    detailed: "Détaillé",
    aiLanguage: "Langue des suggestions",
    aiTone: "Ton des réponses",
    formal: "Formel",
    casual: "Décontracté",
    professional: "Professionnel",
    displayName: "Nom d'affichage",
    jobTitle: "Poste / Fonction",
    avatar: "Photo de profil",
    changeAvatar: "Changer la photo",
    exportData: "Exporter mes données",
    exportDataDesc: "Télécharger toutes vos données",
  },
  en: {
    settings: "Settings",
    appearance: "Appearance",
    notifications: "Notifications",
    security: "Security",
    email: "Email",
    language: "Language & Region",
    ai: "Artificial Intelligence",
    profile: "Profile",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    auto: "Auto",
    accentColor: "Accent Color",
    fontSize: "Font Size",
    small: "Small",
    normal: "Normal",
    large: "Large",
    animations: "Animations",
    animationsDesc: "Enable interface animations",
    save: "Save",
    saved: "Saved!",
    reset: "Reset",
    pushNotifications: "Push Notifications",
    pushDesc: "Receive real-time notifications",
    sounds: "Sounds",
    soundsDesc: "Enable notification sounds",
    emailNotif: "Email Notifications",
    emailNotifDesc: "Receive email summaries",
    doNotDisturb: "Do Not Disturb",
    doNotDisturbDesc: "Disable notifications during certain hours",
    from: "From",
    to: "To",
    twoFactor: "Two-Factor Authentication",
    twoFactorDesc: "Add an extra layer of security",
    autoLock: "Auto Lock",
    autoLockDesc: "Log out after a period of inactivity",
    minutes: "minutes",
    activityHistory: "Activity History",
    activityHistoryDesc: "View your login history",
    signature: "Email Signature",
    signatureDesc: "Add a signature to your emails",
    autoReply: "Auto Reply",
    autoReplyDesc: "Send automatic replies to new emails",
    autoReplyMessage: "Auto-reply message",
    interfaceLanguage: "Interface Language",
    dateFormat: "Date Format",
    timezone: "Timezone",
    aiAssistant: "AI Assistant",
    aiAssistantDesc: "Enable AI suggestions",
    suggestionLevel: "Suggestion Level",
    minimal: "Minimal",
    detailed: "Detailed",
    aiLanguage: "Suggestion Language",
    aiTone: "Response Tone",
    formal: "Formal",
    casual: "Casual",
    professional: "Professional",
    displayName: "Display Name",
    jobTitle: "Job Title",
    avatar: "Profile Picture",
    changeAvatar: "Change Photo",
    exportData: "Export My Data",
    exportDataDesc: "Download all your data",
  },
  es: {
    settings: "Configuración",
    appearance: "Apariencia",
    notifications: "Notificaciones",
    security: "Seguridad",
    email: "Correo",
    language: "Idioma y Región",
    ai: "Inteligencia Artificial",
    profile: "Perfil",
    theme: "Tema",
    light: "Claro",
    dark: "Oscuro",
    auto: "Auto",
    accentColor: "Color de acento",
    fontSize: "Tamaño de fuente",
    small: "Pequeño",
    normal: "Normal",
    large: "Grande",
    animations: "Animaciones",
    animationsDesc: "Activar animaciones de la interfaz",
    save: "Guardar",
    saved: "¡Guardado!",
    reset: "Restablecer",
  },
};

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userInfo?: { name?: string; role?: string; email?: string };
}

export default function SettingsPanel({ isOpen, onClose, userInfo }: SettingsPanelProps) {
  const { user } = useCodeAuth();
  const { theme: globalTheme, accentColor: globalAccentColor, setTheme: setGlobalTheme, setAccentColor: setGlobalAccentColor } = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance");
  const [settings, setSettings] = useState<Settings>({ ...defaultSettings, theme: globalTheme, accentColor: globalAccentColor });
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Synchroniser avec le contexte global au démarrage
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      theme: globalTheme,
      accentColor: globalAccentColor
    }));
  }, [globalTheme, globalAccentColor]);

  // Fonction de traduction
  const t = useCallback((key: string): string => {
    const lang = settings.language || "fr";
    return translations[lang]?.[key] || translations["fr"]?.[key] || key;
  }, [settings.language]);

  // Appliquer les paramètres (police, animations, etc.) - Le thème est géré par ThemeContext
  const applySettings = useCallback((s: Settings) => {
    const root = document.documentElement;
    const body = document.body;
    
    // IMPORTANT: Utiliser le contexte global pour le thème et la couleur d'accent
    // au lieu d'appliquer directement - cela permet de synchroniser toute l'app
    setGlobalTheme(s.theme as Theme);
    setGlobalAccentColor(s.accentColor);
    
    // Appliquer la taille de police
    const fontSizes: Record<string, string> = { small: "14px", normal: "16px", large: "18px" };
    root.style.fontSize = fontSizes[s.fontSize] || "16px";
    
    // Appliquer les animations
    if (!s.animationsEnabled) {
      root.style.setProperty("--animation-duration", "0s");
      body.classList.add("no-animations");
    } else {
      root.style.setProperty("--animation-duration", "0.3s");
      body.classList.remove("no-animations");
    }

    // Stocker la langue
    root.setAttribute("lang", s.language);
    localStorage.setItem("app-language", s.language);
    
    console.log("[Settings] Applied via ThemeContext:", { theme: s.theme, accent: s.accentColor, fontSize: s.fontSize, lang: s.language });
  }, [setGlobalTheme, setGlobalAccentColor]);

  // Charger les paramètres au démarrage
  useEffect(() => {
    if (!isOpen) return;
    
    try {
      const saved = localStorage.getItem("app-settings");
      if (saved) {
        const parsedSettings = { ...defaultSettings, ...JSON.parse(saved) };
        setSettings(parsedSettings);
        applySettings(parsedSettings);
      }
      if (user) {
        setSettings(prev => ({
          ...prev,
          displayName: prev.displayName || user.name || "",
          jobTitle: prev.jobTitle || user.role || "",
        }));
      }
    } catch (e) {
      console.error("Erreur chargement paramètres:", e);
    }
  }, [isOpen, user, applySettings]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setHasChanges(true);
    
    // Appliquer immédiatement certains paramètres visuels
    if (["theme", "accentColor", "fontSize", "animationsEnabled", "language"].includes(key)) {
      applySettings(newSettings);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem("app-settings", JSON.stringify(settings));
      applySettings(settings);
      
      setHasChanges(false);
      setNotification({ type: "success", message: t("saved") });
      setTimeout(() => setNotification(null), 2000);
    } catch (e) {
      console.error("Erreur sauvegarde:", e);
      setNotification({ type: "error", message: "Erreur lors de la sauvegarde" });
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    if (confirm("Réinitialiser tous les paramètres par défaut ?")) {
      setSettings(defaultSettings);
      applySettings(defaultSettings);
      localStorage.setItem("app-settings", JSON.stringify(defaultSettings));
      setHasChanges(false);
      setNotification({ type: "success", message: "Paramètres réinitialisés !" });
      setTimeout(() => setNotification(null), 2000);
    }
  };

  const exportData = () => {
    const data = {
      settings,
      exportDate: new Date().toISOString(),
      user: user ? { name: user.name, role: user.role } : null,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `settings-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotification({ type: "success", message: "Données exportées !" });
    setTimeout(() => setNotification(null), 2000);
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleXFEVZTL47y7yYdHNXLV5ZBl");
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  const sections = [
    { id: "appearance" as const, label: t("appearance"), icon: Palette },
    { id: "notifications" as const, label: t("notifications"), icon: Bell },
    { id: "security" as const, label: t("security"), icon: Shield },
    { id: "email" as const, label: t("email"), icon: Mail },
    { id: "language" as const, label: t("language"), icon: Globe },
    { id: "ai" as const, label: t("ai"), icon: Bot },
    { id: "profile" as const, label: t("profile"), icon: User },
  ];

  if (!isOpen) return null;

  // Composant Toggle Premium
  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
        enabled 
          ? "shadow-lg" 
          : "bg-slate-600"
      }`}
      style={enabled ? { 
        background: `linear-gradient(135deg, ${settings.accentColor}, ${settings.accentColor}99)`,
        boxShadow: `0 0 20px ${settings.accentColor}40`
      } : {}}
    >
      <span 
        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
          enabled ? "left-8" : "left-1"
        }`}
      />
    </button>
  );

  // Composant Card Premium
  const SettingCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/10 p-5 ${className}`}>
      {children}
    </div>
  );

  // Composant Select Premium
  const Select = ({ value, onChange, options, className = "" }: { 
    value: string; 
    onChange: (v: string) => void; 
    options: { value: string; label: string; flag?: string }[];
    className?: string;
  }) => (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3 text-white cursor-pointer focus:outline-none focus:ring-2 transition-all"
        style={{ outlineColor: settings.accentColor }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.flag ? `${opt.flag} ` : ""}{opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-900/20 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex border border-white/10"
        style={{ boxShadow: `0 0 100px ${settings.accentColor}20, 0 25px 50px -12px rgba(0, 0, 0, 0.5)` }}
      >
        
        {/* Sidebar Premium */}
        <div className="w-72 bg-gradient-to-b from-slate-800/50 to-slate-900/50 backdrop-blur-sm border-r border-white/10 flex flex-col">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${settings.accentColor}, ${settings.accentColor}80)` }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              {t("settings")}
            </h2>
          </div>
          
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full px-4 py-3.5 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                  activeSection === section.id
                    ? "text-white shadow-lg"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
                style={activeSection === section.id ? {
                  background: `linear-gradient(135deg, ${settings.accentColor}30, ${settings.accentColor}10)`,
                  borderLeft: `3px solid ${settings.accentColor}`
                } : {}}
              >
                <section.icon className="w-5 h-5" style={activeSection === section.id ? { color: settings.accentColor } : {}} />
                <span className="font-medium">{section.label}</span>
              </button>
            ))}
          </nav>
          
          <div className="p-4 border-t border-white/10 space-y-2">
            <button
              onClick={resetSettings}
              className="w-full px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              {t("reset")}
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-8 py-5 border-b border-white/10 flex items-center justify-between bg-slate-900/50">
            <h3 className="text-xl font-semibold text-white flex items-center gap-3">
              {sections.find(s => s.id === activeSection)?.icon && 
                React.createElement(sections.find(s => s.id === activeSection)!.icon, {
                  className: "w-6 h-6",
                  style: { color: settings.accentColor }
                })
              }
              {sections.find(s => s.id === activeSection)?.label}
            </h3>
            <div className="flex items-center gap-4">
              {notification && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium animate-pulse ${
                  notification.type === "success" 
                    ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}>
                  {notification.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {notification.message}
                </div>
              )}
              {hasChanges && (
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl flex items-center gap-2 text-white font-medium disabled:opacity-50 transition-all hover:scale-105 hover:shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${settings.accentColor}, ${settings.accentColor}80)` }}
                >
                  <Save className="w-4 h-4" />
                  {saving ? "..." : t("save")}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            
            {/* APPARENCE */}
            {activeSection === "appearance" && (
              <>
                <SettingCard>
                  <h4 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Sun className="w-5 h-5" style={{ color: settings.accentColor }} />
                    {t("theme")}
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { key: "light" as const, icon: Sun, label: t("light") },
                      { key: "dark" as const, icon: Moon, label: t("dark") },
                      { key: "auto" as const, icon: Monitor, label: t("auto") },
                    ].map((theme) => (
                      <button
                        key={theme.key}
                        onClick={() => updateSetting("theme", theme.key)}
                        className={`relative p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3 ${
                          settings.theme === theme.key
                            ? "border-transparent shadow-xl scale-105"
                            : "border-white/10 hover:border-white/20 hover:bg-white/5"
                        }`}
                        style={settings.theme === theme.key ? {
                          background: `linear-gradient(135deg, ${settings.accentColor}30, ${settings.accentColor}10)`,
                          borderColor: settings.accentColor
                        } : {}}
                      >
                        <theme.icon 
                          className="w-8 h-8" 
                          style={{ color: settings.theme === theme.key ? settings.accentColor : "#9ca3af" }}
                        />
                        <span className={`font-medium ${settings.theme === theme.key ? "text-white" : "text-gray-400"}`}>
                          {theme.label}
                        </span>
                        {settings.theme === theme.key && (
                          <div 
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: settings.accentColor }}
                          >
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </SettingCard>

                <SettingCard>
                  <h4 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Palette className="w-5 h-5" style={{ color: settings.accentColor }} />
                    {t("accentColor")}
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {accentColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => updateSetting("accentColor", color.value)}
                        className={`w-12 h-12 rounded-xl transition-all duration-300 flex items-center justify-center ${
                          settings.accentColor === color.value 
                            ? "ring-4 ring-white/30 scale-110 shadow-lg" 
                            : "hover:scale-105"
                        }`}
                        style={{ 
                          background: color.value,
                          boxShadow: settings.accentColor === color.value ? `0 0 20px ${color.value}50` : "none"
                        }}
                        title={color.name}
                      >
                        {settings.accentColor === color.value && (
                          <Check className="w-6 h-6 text-white drop-shadow-lg" />
                        )}
                      </button>
                    ))}
                  </div>
                </SettingCard>

                <SettingCard>
                  <h4 className="text-lg font-semibold text-white mb-6">{t("fontSize")}</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { key: "small" as const, label: t("small"), size: "text-sm" },
                      { key: "normal" as const, label: t("normal"), size: "text-base" },
                      { key: "large" as const, label: t("large"), size: "text-lg" },
                    ].map((size) => (
                      <button
                        key={size.key}
                        onClick={() => updateSetting("fontSize", size.key)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          settings.fontSize === size.key
                            ? "border-transparent"
                            : "border-white/10 hover:border-white/20"
                        }`}
                        style={settings.fontSize === size.key ? {
                          background: `linear-gradient(135deg, ${settings.accentColor}30, ${settings.accentColor}10)`,
                          borderColor: settings.accentColor
                        } : {}}
                      >
                        <span className={`${size.size} ${settings.fontSize === size.key ? "text-white" : "text-gray-400"}`}>
                          {size.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </SettingCard>

                <SettingCard>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: `${settings.accentColor}20` }}
                      >
                        <Zap className="w-6 h-6" style={{ color: settings.accentColor }} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{t("animations")}</h4>
                        <p className="text-sm text-gray-400">{t("animationsDesc")}</p>
                      </div>
                    </div>
                    <Toggle enabled={settings.animationsEnabled} onChange={(v) => updateSetting("animationsEnabled", v)} />
                  </div>
                </SettingCard>
              </>
            )}

            {/* NOTIFICATIONS */}
            {activeSection === "notifications" && (
              <>
                <SettingCard>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${settings.accentColor}20` }}>
                        <Bell className="w-6 h-6" style={{ color: settings.accentColor }} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{t("pushNotifications")}</h4>
                        <p className="text-sm text-gray-400">{t("pushDesc")}</p>
                      </div>
                    </div>
                    <Toggle enabled={settings.pushEnabled} onChange={(v) => updateSetting("pushEnabled", v)} />
                  </div>
                </SettingCard>

                <SettingCard>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${settings.accentColor}20` }}>
                        {settings.soundEnabled ? <Volume2 className="w-6 h-6" style={{ color: settings.accentColor }} /> : <VolumeX className="w-6 h-6 text-gray-500" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{t("sounds")}</h4>
                        <p className="text-sm text-gray-400">{t("soundsDesc")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={playNotificationSound} className="text-sm px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 transition-all">
                        Tester
                      </button>
                      <Toggle enabled={settings.soundEnabled} onChange={(v) => updateSetting("soundEnabled", v)} />
                    </div>
                  </div>
                </SettingCard>

                <SettingCard>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${settings.accentColor}20` }}>
                        <Mail className="w-6 h-6" style={{ color: settings.accentColor }} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{t("emailNotif")}</h4>
                        <p className="text-sm text-gray-400">{t("emailNotifDesc")}</p>
                      </div>
                    </div>
                    <Toggle enabled={settings.emailNotifications} onChange={(v) => updateSetting("emailNotifications", v)} />
                  </div>
                </SettingCard>

                <SettingCard>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: settings.doNotDisturbEnabled ? `${settings.accentColor}20` : "rgba(255,255,255,0.1)" }}>
                        <BellOff className="w-6 h-6" style={{ color: settings.doNotDisturbEnabled ? settings.accentColor : "#9ca3af" }} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{t("doNotDisturb")}</h4>
                        <p className="text-sm text-gray-400">{t("doNotDisturbDesc")}</p>
                      </div>
                    </div>
                    <Toggle enabled={settings.doNotDisturbEnabled} onChange={(v) => updateSetting("doNotDisturbEnabled", v)} />
                  </div>
                  {settings.doNotDisturbEnabled && (
                    <div className="flex items-center gap-4 mt-4 pl-16">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">{t("from")}</span>
                        <input type="time" value={settings.doNotDisturbStart} onChange={(e) => updateSetting("doNotDisturbStart", e.target.value)} className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">{t("to")}</span>
                        <input type="time" value={settings.doNotDisturbEnd} onChange={(e) => updateSetting("doNotDisturbEnd", e.target.value)} className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white" />
                      </div>
                    </div>
                  )}
                </SettingCard>
              </>
            )}

            {/* SÉCURITÉ */}
            {activeSection === "security" && (
              <>
                <SettingCard>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${settings.accentColor}20` }}>
                        <Lock className="w-6 h-6" style={{ color: settings.accentColor }} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{t("twoFactor")}</h4>
                        <p className="text-sm text-gray-400">{t("twoFactorDesc")}</p>
                      </div>
                    </div>
                    <Toggle enabled={settings.twoFactorEnabled} onChange={(v) => updateSetting("twoFactorEnabled", v)} />
                  </div>
                </SettingCard>

                <SettingCard>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${settings.accentColor}20` }}>
                        <Clock className="w-6 h-6" style={{ color: settings.accentColor }} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{t("autoLock")}</h4>
                        <p className="text-sm text-gray-400">{t("autoLockDesc")}</p>
                      </div>
                    </div>
                    <Select
                      value={settings.autoLockMinutes.toString()}
                      onChange={(v) => updateSetting("autoLockMinutes", parseInt(v))}
                      options={[
                        { value: "5", label: `5 ${t("minutes")}` },
                        { value: "15", label: `15 ${t("minutes")}` },
                        { value: "30", label: `30 ${t("minutes")}` },
                        { value: "60", label: `60 ${t("minutes")}` },
                      ]}
                      className="w-40"
                    />
                  </div>
                </SettingCard>

                <SettingCard>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${settings.accentColor}20` }}>
                        {settings.showActivityHistory ? <Eye className="w-6 h-6" style={{ color: settings.accentColor }} /> : <EyeOff className="w-6 h-6 text-gray-500" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{t("activityHistory")}</h4>
                        <p className="text-sm text-gray-400">{t("activityHistoryDesc")}</p>
                      </div>
                    </div>
                    <Toggle enabled={settings.showActivityHistory} onChange={(v) => updateSetting("showActivityHistory", v)} />
                  </div>
                </SettingCard>
              </>
            )}

            {/* EMAIL */}
            {activeSection === "email" && (
              <>
                <SettingCard>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileSignature className="w-5 h-5" style={{ color: settings.accentColor }} />
                    {t("signature")}
                  </h4>
                  <p className="text-sm text-gray-400 mb-3">{t("signatureDesc")}</p>
                  <textarea
                    value={settings.signature}
                    onChange={(e) => updateSetting("signature", e.target.value)}
                    rows={4}
                    placeholder="Cordialement,&#10;Votre nom&#10;Votre entreprise"
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 resize-none"
                    style={{ outlineColor: settings.accentColor }}
                  />
                </SettingCard>

                <SettingCard>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: settings.autoReplyEnabled ? `${settings.accentColor}20` : "rgba(255,255,255,0.1)" }}>
                        <Mail className="w-6 h-6" style={{ color: settings.autoReplyEnabled ? settings.accentColor : "#9ca3af" }} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{t("autoReply")}</h4>
                        <p className="text-sm text-gray-400">{t("autoReplyDesc")}</p>
                      </div>
                    </div>
                    <Toggle enabled={settings.autoReplyEnabled} onChange={(v) => updateSetting("autoReplyEnabled", v)} />
                  </div>
                  {settings.autoReplyEnabled && (
                    <div className="mt-4">
                      <label className="block text-sm text-gray-400 mb-2">{t("autoReplyMessage")}</label>
                      <textarea
                        value={settings.autoReplyMessage}
                        onChange={(e) => updateSetting("autoReplyMessage", e.target.value)}
                        rows={3}
                        placeholder="Je suis actuellement absent. Je vous répondrai dès mon retour."
                        className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 resize-none"
                      />
                    </div>
                  )}
                </SettingCard>
              </>
            )}

            {/* LANGUE & RÉGION */}
            {activeSection === "language" && (
              <>
                <SettingCard>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5" style={{ color: settings.accentColor }} />
                    {t("interfaceLanguage")}
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => updateSetting("language", lang.code)}
                        className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          settings.language === lang.code
                            ? "border-transparent"
                            : "border-white/10 hover:border-white/20 hover:bg-white/5"
                        }`}
                        style={settings.language === lang.code ? {
                          background: `linear-gradient(135deg, ${settings.accentColor}30, ${settings.accentColor}10)`,
                          borderColor: settings.accentColor
                        } : {}}
                      >
                        <span className="text-2xl">{lang.flag}</span>
                        <span className={settings.language === lang.code ? "text-white font-medium" : "text-gray-400"}>
                          {lang.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </SettingCard>

                <SettingCard>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" style={{ color: settings.accentColor }} />
                    {t("dateFormat")}
                  </h4>
                  <Select value={settings.dateFormat} onChange={(v) => updateSetting("dateFormat", v)} options={dateFormats} />
                </SettingCard>

                <SettingCard>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" style={{ color: settings.accentColor }} />
                    {t("timezone")}
                  </h4>
                  <Select value={settings.timezone} onChange={(v) => updateSetting("timezone", v)} options={timezones} />
                </SettingCard>
              </>
            )}

            {/* INTELLIGENCE ARTIFICIELLE */}
            {activeSection === "ai" && (
              <>
                <SettingCard>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: settings.aiEnabled ? `${settings.accentColor}20` : "rgba(255,255,255,0.1)" }}>
                        <Bot className="w-6 h-6" style={{ color: settings.aiEnabled ? settings.accentColor : "#9ca3af" }} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{t("aiAssistant")}</h4>
                        <p className="text-sm text-gray-400">{t("aiAssistantDesc")}</p>
                      </div>
                    </div>
                    <Toggle enabled={settings.aiEnabled} onChange={(v) => updateSetting("aiEnabled", v)} />
                  </div>
                </SettingCard>

                <SettingCard className={!settings.aiEnabled ? "opacity-50 pointer-events-none" : ""}>
                  <h4 className="text-lg font-semibold text-white mb-4">{t("suggestionLevel")}</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { key: "minimal" as const, label: t("minimal"), desc: "Léger" },
                      { key: "normal" as const, label: t("normal"), desc: "Équilibré" },
                      { key: "detailed" as const, label: t("detailed"), desc: "Complet" },
                    ].map((level) => (
                      <button
                        key={level.key}
                        onClick={() => updateSetting("aiSuggestionLevel", level.key)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          settings.aiSuggestionLevel === level.key ? "border-transparent" : "border-white/10 hover:border-white/20"
                        }`}
                        style={settings.aiSuggestionLevel === level.key ? {
                          background: `linear-gradient(135deg, ${settings.accentColor}30, ${settings.accentColor}10)`,
                          borderColor: settings.accentColor
                        } : {}}
                      >
                        <span className={`block font-medium ${settings.aiSuggestionLevel === level.key ? "text-white" : "text-gray-400"}`}>{level.label}</span>
                        <span className="text-xs text-gray-500 mt-1 block">{level.desc}</span>
                      </button>
                    ))}
                  </div>
                </SettingCard>

                <SettingCard className={!settings.aiEnabled ? "opacity-50 pointer-events-none" : ""}>
                  <h4 className="text-lg font-semibold text-white mb-4">{t("aiLanguage")}</h4>
                  <Select value={settings.aiLanguage} onChange={(v) => updateSetting("aiLanguage", v)} options={languages.map(l => ({ value: l.code, label: l.name, flag: l.flag }))} />
                </SettingCard>

                <SettingCard className={!settings.aiEnabled ? "opacity-50 pointer-events-none" : ""}>
                  <h4 className="text-lg font-semibold text-white mb-4">{t("aiTone")}</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { key: "formal" as const, label: t("formal"), emoji: "👔" },
                      { key: "casual" as const, label: t("casual"), emoji: "😊" },
                      { key: "professional" as const, label: t("professional"), emoji: "💼" },
                    ].map((tone) => (
                      <button
                        key={tone.key}
                        onClick={() => updateSetting("aiTone", tone.key)}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                          settings.aiTone === tone.key ? "border-transparent" : "border-white/10 hover:border-white/20"
                        }`}
                        style={settings.aiTone === tone.key ? {
                          background: `linear-gradient(135deg, ${settings.accentColor}30, ${settings.accentColor}10)`,
                          borderColor: settings.accentColor
                        } : {}}
                      >
                        <span className="text-2xl">{tone.emoji}</span>
                        <span className={settings.aiTone === tone.key ? "text-white font-medium" : "text-gray-400"}>{tone.label}</span>
                      </button>
                    ))}
                  </div>
                </SettingCard>
              </>
            )}

            {/* PROFIL */}
            {activeSection === "profile" && (
              <>
                <SettingCard>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div 
                        className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${settings.accentColor}, ${settings.accentColor}80)` }}
                      >
                        {settings.displayName ? settings.displayName.slice(0, 2).toUpperCase() : "U"}
                      </div>
                      <button 
                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-all"
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.onchange = (e: any) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => updateSetting("avatarUrl", ev.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          };
                          input.click();
                        }}
                      >
                        <Camera className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white text-lg">{t("avatar")}</h4>
                      <p className="text-sm text-gray-400 mb-3">JPG, PNG ou GIF. Max 2MB</p>
                      <button className="text-sm px-4 py-2 rounded-lg transition-all text-white" style={{ background: `linear-gradient(135deg, ${settings.accentColor}, ${settings.accentColor}80)` }}>
                        {t("changeAvatar")}
                      </button>
                    </div>
                  </div>
                </SettingCard>

                <SettingCard>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">{t("displayName")}</label>
                      <input
                        type="text"
                        value={settings.displayName}
                        onChange={(e) => updateSetting("displayName", e.target.value)}
                        className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2"
                        placeholder="Votre nom"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">{t("jobTitle")}</label>
                      <input
                        type="text"
                        value={settings.jobTitle}
                        onChange={(e) => updateSetting("jobTitle", e.target.value)}
                        className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2"
                        placeholder="Votre poste"
                      />
                    </div>
                  </div>
                </SettingCard>

                <SettingCard>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${settings.accentColor}20` }}>
                        <Download className="w-6 h-6" style={{ color: settings.accentColor }} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{t("exportData")}</h4>
                        <p className="text-sm text-gray-400">{t("exportDataDesc")}</p>
                      </div>
                    </div>
                    <button
                      onClick={exportData}
                      className="px-4 py-2 rounded-xl text-white font-medium transition-all hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${settings.accentColor}, ${settings.accentColor}80)` }}
                    >
                      Exporter
                    </button>
                  </div>
                </SettingCard>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
