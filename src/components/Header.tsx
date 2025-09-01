"use client";

import { useMemo, useState } from "react";
import { useUI } from "@store";
import { ChevronDown, Folder, RefreshCw, LogOut, Layout } from "lucide-react";
import EmailAccountSelector from "./HeaderEmailSelector";
import EmailLoginModal from "./EmailLoginModal";

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
  const { density, setDensity } = useUI();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Source dynamique selon provider
  const sourceLabel = useMemo(() => {
    const p = String(userInfo?.provider || emailCredentials?.provider || "").toLowerCase();
    if (!p) return "Déconnecté";
    if (p.includes("gmail")) return "Connecté à Gmail";
    if (p.includes("imap")) return "Connecté IMAP";
    if (p.includes("outlook")) return "Connecté à Outlook";
    if (p.includes("yahoo")) return "Connecté à Yahoo";
    if (p.includes("exchange")) return "Connecté à Exchange";
    if (p.includes("auto")) return "Auto-détection";
    return "Connecté";
  }, [userInfo?.provider, emailCredentials?.provider]);

  const handleAccountSuccess = (newAccount: any) => {
    // Appeler le callback parent pour mettre à jour l'état
    if (onAccountChange) {
      onAccountChange(newAccount);
    }
  };

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
        <div className="text-lg font-semibold flex-1">ICONES BOX</div>

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

        {/* Dossier */}
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

        {/* Boutons d'action */}
        <button onClick={onRefresh} className="px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Rafraîchir
        </button>
        
        {/* Sélecteur de comptes email */}
        <div className="flex items-center gap-2">
          <EmailAccountSelector 
            onAccountChange={(account) => {
              console.log('Changement de compte:', account);
              if (onAccountChange) {
                onAccountChange(account);
              }
            }}
            onConnectNew={() => setShowLoginModal(true)}
          />
        </div>
      </div>

      {/* Modal de connexion email */}
      <EmailLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleAccountSuccess}
      />
    </div>
  );
}

export default Header;
