"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useUI } from "@store";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  Menu, 
  X, 
  RefreshCw, 
  LogOut, 
  Layout, 
  Lock, 
  Mail,
  Settings,
  ChevronRight,
  Inbox,
  Star,
  Send,
  FileText,
  Monitor,
  Smartphone,
  Maximize,
  Focus,
  Keyboard,
  Sun,
  Moon,
  Eye,
  EyeOff,
  PanelRight,
  PanelBottom,
  Type,
  Sparkles,
  Briefcase,
  MailX
} from "lucide-react";
import { APP_NAME } from "@/config/branding";
import EmailLoginModal from "./EmailLoginModal";
import ChangeCodeModal from "./auth/ChangeCodeModal";
import { useCodeAuth } from "./auth/CodeAuthContext";
import { NotificationToggle } from "./notifications/NotificationToggle";
import OnlineUsersBadge from "./presence/OnlineUsersBadge";
import SettingsPanel from "@/components/settings/SettingsPanel";
import { FocusModeToggle, ImmersiveModeToggle, KeyboardShortcutsPanel } from "@/components/ui/FocusMode";

type Props = {
  source: string;
  onSourceChange: (s: string) => void;
  currentFolder: string;
  onFolderChange: (f: string) => void;
  emailCredentials?: any;
  onDisconnect: () => void;
  onRefresh: () => void;
  userInfo?: { email?: string; provider?: string };
  onAccountChange?: (account: any) => void;
};

export function Header({
  source,
  onSourceChange,
  currentFolder,
  onFolderChange,
  emailCredentials,
  onDisconnect,
  onRefresh,
  userInfo,
  onAccountChange
}: Props) {
  const { density, setDensity, focusMode, toggleFocusMode, immersiveMode, toggleImmersiveMode, managementMode, toggleManagementMode } = useUI();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useCodeAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChangeCodeModal, setShowChangeCodeModal] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [textSize, setTextSize] = useState<"small" | "normal" | "large">("normal");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setActiveSubmenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAccountSuccess = (newAccount: any) => {
    if (onAccountChange) onAccountChange(newAccount);
  };

  const densityLabel = useMemo(() => {
    if (density === "ultra") return "Ultra";
    if (density === "dense") return "Dense";
    return "Compact";
  }, [density]);

  const folderLabel = useMemo(() => {
    const labels: Record<string, string> = {
      INBOX: "Boite de reception",
      STARRED: "Favoris",
      SENT: "Envoyes",
      DRAFTS: "Brouillons"
    };
    return labels[currentFolder] || currentFolder;
  }, [currentFolder]);

  function handleDensityChange(next: "compact" | "dense" | "ultra") {
    setDensity?.(next);
    setActiveSubmenu(null);
  }

  function handleFolderChange(folder: string) {
    onFolderChange(folder);
    setActiveSubmenu(null);
    setMenuOpen(false);
  }

  const companyName = (user?.company || "").trim();

  return (
    <header className="w-full bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 text-gray-900 dark:text-white shadow-lg dark:shadow-xl transition-colors duration-300">
      <div className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2">
          
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink-0">
            {/* Logo ICONES BOX */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-lg ring-2 ring-cyan-400/30 flex-shrink-0">
              <img 
                src="/icone-logo.jpg" 
                alt="ICONES BOX Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white transition-colors truncate max-w-[120px] sm:max-w-none">{companyName || 'ICONES BOX'}</h1>
              {user && <p className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-300 transition-colors truncate">{user.name} - {user.role}</p>}
            </div>
          </div>

          <button 
            onClick={() => { setMenuOpen(true); setActiveSubmenu("folders"); }}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-full transition-all text-gray-700 dark:text-white"
          >
            <Inbox className="w-4 h-4" />
            <span className="font-medium">{folderLabel}</span>
          </button>

          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
            <OnlineUsersBadge className="hidden sm:flex" />
            <NotificationToggle />
            
            {/* Mode Focus */}
            <FocusModeToggle className="hidden lg:flex" />
            
            {/* Mode Immersif */}
            <ImmersiveModeToggle className="hidden md:block" />
            
            <button 
              onClick={onRefresh} 
              className="p-2 sm:p-2.5 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-xl transition-all hover:rotate-180 duration-500 text-gray-700 dark:text-white"
              title="Rafraichir"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 sm:p-2.5 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-xl transition-all text-gray-700 dark:text-white"
              >
                {menuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-[calc(100vw-24px)] sm:w-72 max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700 transition-colors max-h-[80vh] overflow-y-auto">
                  
                  <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white sticky top-0">
                    <p className="font-semibold truncate">{user?.name || "Utilisateur"}</p>
                    <p className="text-xs text-purple-200 truncate">{user?.role || "Invite"}</p>
                  </div>

                  <div className="py-2">
                    
                    <div className="relative">
                      <button 
                        onClick={() => setActiveSubmenu(activeSubmenu === "folders" ? null : "folders")}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Inbox className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          <span>Dossiers</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${activeSubmenu === "folders" ? "rotate-90" : ""}`} />
                      </button>
                      {activeSubmenu === "folders" && (
                        <div className="bg-gray-50 dark:bg-slate-700/50 py-1 transition-colors">
                          {[
                            { key: "INBOX", label: "Boite de reception", icon: Inbox },
                            { key: "STARRED", label: "Favoris", icon: Star },
                            { key: "SENT", label: "Envoyes", icon: Send },
                            { key: "DRAFTS", label: "Brouillons", icon: FileText },
                          ].map((f) => (
                            <button
                              key={f.key}
                              onClick={() => handleFolderChange(f.key)}
                              className={`w-full px-8 py-2 flex items-center gap-3 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors ${currentFolder === f.key ? "text-purple-600 dark:text-purple-400 font-medium" : ""}`}
                            >
                              <f.icon className="w-4 h-4" />
                              <span>{f.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button 
                        onClick={() => setActiveSubmenu(activeSubmenu === "display" ? null : "display")}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Layout className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          <span>Affichage</span>
                          <span className="text-xs text-gray-400">{densityLabel}</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${activeSubmenu === "display" ? "rotate-90" : ""}`} />
                      </button>
                      {activeSubmenu === "display" && (
                        <div className="bg-gray-50 dark:bg-slate-700/50 py-2 transition-colors">
                          
                          {/* Section Densité */}
                          <div className="px-4 py-1">
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Densité</p>
                            <div className="flex gap-1 bg-gray-200 dark:bg-slate-600 rounded-lg p-1">
                              {[
                                { key: "compact", label: "Compact", icon: Smartphone },
                                { key: "dense", label: "Dense", icon: Monitor },
                                { key: "ultra", label: "Ultra", icon: Maximize },
                              ].map((d) => (
                                <button
                                  key={d.key}
                                  onClick={() => handleDensityChange(d.key as any)}
                                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                                    density === d.key 
                                      ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm" 
                                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                  }`}
                                >
                                  {d.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-gray-200 dark:border-slate-600 my-2" />

                          {/* Section Thème */}
                          <div className="px-4 py-1">
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Thème</p>
                            <div className="flex gap-1 bg-gray-200 dark:bg-slate-600 rounded-lg p-1">
                              <button
                                onClick={() => setTheme("light")}
                                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                                  theme === "light" 
                                    ? "bg-white dark:bg-slate-800 text-yellow-600 shadow-sm" 
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                }`}
                              >
                                <Sun className="w-3.5 h-3.5" />
                                Clair
                              </button>
                              <button
                                onClick={() => setTheme("dark")}
                                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                                  theme === "dark" 
                                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                }`}
                              >
                                <Moon className="w-3.5 h-3.5" />
                                Sombre
                              </button>
                            </div>
                          </div>

                          <div className="border-t border-gray-200 dark:border-slate-600 my-2" />

                          {/* Section Modes */}
                          <div className="px-4 py-1">
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Modes</p>
                            
                            {/* Mode Focus */}
                            <button
                              onClick={() => { toggleFocusMode(); setMenuOpen(false); }}
                              className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Focus className={`w-4 h-4 ${focusMode ? "text-purple-500" : "text-gray-500 dark:text-gray-400"}`} />
                                <span className="text-sm">Mode Focus</span>
                              </div>
                              <div className={`w-9 h-5 rounded-full transition-colors ${focusMode ? "bg-purple-500" : "bg-gray-300 dark:bg-slate-500"}`}>
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${focusMode ? "translate-x-4 ml-0.5" : "translate-x-0.5"}`} />
                              </div>
                            </button>

                            {/* Mode Gestion (masque les emails) */}
                            <button
                              onClick={() => { toggleManagementMode(); setMenuOpen(false); }}
                              className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Briefcase className={`w-4 h-4 ${managementMode ? "text-amber-500" : "text-gray-500 dark:text-gray-400"}`} />
                                <div className="flex flex-col items-start">
                                  <span className="text-sm">Mode Gestion</span>
                                  <span className="text-[10px] text-gray-400">Masque les emails</span>
                                </div>
                              </div>
                              <div className={`w-9 h-5 rounded-full transition-colors ${managementMode ? "bg-amber-500" : "bg-gray-300 dark:bg-slate-500"}`}>
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${managementMode ? "translate-x-4 ml-0.5" : "translate-x-0.5"}`} />
                              </div>
                            </button>

                            {/* Mode Plein écran */}
                            <button
                              onClick={() => { toggleImmersiveMode(); setMenuOpen(false); }}
                              className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Maximize className={`w-4 h-4 ${immersiveMode ? "text-indigo-500" : "text-gray-500 dark:text-gray-400"}`} />
                                <span className="text-sm">Plein écran</span>
                              </div>
                              <div className={`w-9 h-5 rounded-full transition-colors ${immersiveMode ? "bg-indigo-500" : "bg-gray-300 dark:bg-slate-500"}`}>
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${immersiveMode ? "translate-x-4 ml-0.5" : "translate-x-0.5"}`} />
                              </div>
                            </button>

                            {/* Aperçu emails */}
                            <button
                              onClick={() => setShowPreview(!showPreview)}
                              className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {showPreview ? (
                                  <Eye className="w-4 h-4 text-green-500" />
                                ) : (
                                  <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                )}
                                <span className="text-sm">Aperçu emails</span>
                              </div>
                              <div className={`w-9 h-5 rounded-full transition-colors ${showPreview ? "bg-green-500" : "bg-gray-300 dark:bg-slate-500"}`}>
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${showPreview ? "translate-x-4 ml-0.5" : "translate-x-0.5"}`} />
                              </div>
                            </button>
                          </div>

                          <div className="border-t border-gray-200 dark:border-slate-600 my-2" />

                          {/* Raccourcis clavier */}
                          <button
                            onClick={() => { window.dispatchEvent(new CustomEvent('shortcuts:show')); setMenuOpen(false); }}
                            className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            <Keyboard className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm">Raccourcis clavier</span>
                            <span className="ml-auto text-xs text-gray-400 bg-gray-200 dark:bg-slate-600 px-1.5 py-0.5 rounded">?</span>
                          </button>

                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => { setShowLoginModal(true); setMenuOpen(false); }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <span>Gerer les comptes email</span>
                    </button>

                    <div className="border-t border-gray-100 dark:border-slate-600 my-2" />

                    {user && (
                      <button 
                        onClick={() => { setShowChangeCodeModal(true); setMenuOpen(false); }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <span>Changer mon code PIN</span>
                      </button>
                    )}

                    <button 
                      onClick={() => { setShowSettingsPanel(true); setMenuOpen(false); }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <span>Parametres</span>
                    </button>

                    <div className="border-t border-gray-100 dark:border-slate-600 my-2" />

                    {user && (
                      <button 
                        onClick={() => { logout(); setMenuOpen(false); }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Deconnexion</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <EmailLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleAccountSuccess}
      />

      {user && (
        <ChangeCodeModal
          isOpen={showChangeCodeModal}
          onClose={() => setShowChangeCodeModal(false)}
          currentUser={{
            id: user.id,
            name: user.name,
            role: user.role
          }}
        />
      )}

      <SettingsPanel
        isOpen={showSettingsPanel}
        onClose={() => setShowSettingsPanel(false)}
        userInfo={user ? { name: user.name, role: user.role, email: userInfo?.email } : undefined}
      />
    </header>
  );
}

export default Header;
