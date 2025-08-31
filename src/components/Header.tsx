"use client";

import { useMemo } from "react";
import { useUI } from "@store";
import { ChevronDown, Folder, RefreshCw, LogOut, Focus, Layout } from "lucide-react";

type Props = {
  source: string;
  onSourceChange: (s: string) => void;
  currentFolder: string;
  onFolderChange: (f: string) => void;
  onFocusMode: () => void;
  emailCredentials?: any;
  onDisconnect: () => void;
  onRefresh: () => void;
  userInfo?: { email?: string; provider?: string };
};

export function Header({
  source,
  onSourceChange,
  currentFolder,
  onFolderChange,
  onFocusMode,
  emailCredentials,
  onDisconnect,
  onRefresh,
  userInfo,
}: Props) {
  const { density, setDensity } = useUI();

  // Source dynamique selon provider
  const sourceLabel = useMemo(() => {
    const p = String(userInfo?.provider || emailCredentials?.provider || "").toLowerCase();
    if (!p) return "Emails réels";
    if (p.includes("gmail")) return "Gmail";
    if (p.includes("imap")) return "Email IMAP";
    if (p.includes("outlook")) return "Outlook";
    if (p.includes("yahoo")) return "Yahoo";
    if (p.includes("exchange")) return "Exchange";
    if (p.includes("auto")) return "Auto";
    return "Emails réels";
  }, [userInfo?.provider, emailCredentials?.provider]);

  const densityLabel = useMemo(() => {
    if (density === "ultra") return "Ultra";
    if (density === "dense") return "Dense";
    return "Compact";
  }, [density]);

  function handleDensityChange(next: "compact" | "dense" | "ultra") {
    setDensity?.(next);
  }

  return (
    <div className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
      <div className="max-w-[1400px] mx-auto flex items-center gap-2">
        <div className="text-lg font-semibold flex-1">Pépite Mail IA</div>

        {/* Source dynamique */}
        <div className="flex items-center gap-2">
          <span className="text-blue-100">Source:</span>
          <div className="relative group">
            <button className="px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 flex items-center gap-2">
              <span>{sourceLabel}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute right-0 mt-1 hidden group-hover:block bg-white text-gray-800 rounded-lg shadow-lg overflow-hidden min-w-[180px] z-20">
              {[
                { key: "email", label: "Emails réels" },
                { key: "mock", label: "Test (mock)" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => onSourceChange(opt.key)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Densité */}
        <div className="flex items-center gap-2">
          <span className="text-blue-100">Densité:</span>
          <div className="relative group">
            <button className="px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 flex items-center gap-2">
              <Layout className="w-4 h-4" />
              <span>{densityLabel}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute right-0 mt-1 hidden group-hover:block bg-white text-gray-800 rounded-lg shadow-lg overflow-hidden min-w-[160px] z-20">
              <button onClick={() => handleDensityChange("compact")} className="w-full text-left px-3 py-2 hover:bg-gray-50">Compact</button>
              <button onClick={() => handleDensityChange("dense")} className="w-full text-left px-3 py-2 hover:bg-gray-50">Dense</button>
              <button onClick={() => handleDensityChange("ultra")} className="w-full text-left px-3 py-2 hover:bg-gray-50">Ultra</button>
            </div>
          </div>
        </div>

        {/* Dossier courant */}
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-blue-100" />
          <div className="relative group">
            <button className="px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 flex items-center gap-2">
              <span>Boîte de réception</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute right-0 mt-1 hidden group-hover:block bg-white text-gray-800 rounded-lg shadow-lg overflow-hidden min-w-[180px] z-20">
              {["INBOX", "STARRED", "SENT", "DRAFTS"].map((f) => (
                <button
                  key={f}
                  onClick={() => onFolderChange(f)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Boutons actions */}
        <button onClick={onFocusMode} className="px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 flex items-center gap-2">
          <Focus className="w-4 h-4" /> Focus
        </button>
        <button onClick={onRefresh} className="px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Rafraîchir
        </button>
        <button onClick={onDisconnect} className="px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 flex items-center gap-2">
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>
    </div>
  );
}

export default Header;