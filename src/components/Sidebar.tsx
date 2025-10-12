"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUI } from "@store";
import CollabPanel from "./Collab/CollabPanel";
import { getStableUserId } from "../lib/realtime/provider";
import TeamPanel from "./team/TeamPanel";
import TasksPanel from "./tasks/TasksPanel";
import MeetingsPanel from "./meetings/MeetingsPanel";
import { useCodeAuth } from "./auth/CodeAuthContext";
import { GlobalNotificationBadge } from "./notifications/NotificationBadge";
import { UserRole } from "../lib/permissions";
import { Inbox, Star, Send, FileText, CheckSquare, Users, Link2, LogOut, ClipboardList, Settings, User } from "lucide-react";

export function Sidebar({ 
  onFolderChange, 
  currentFolder,
  isConnected,
  userInfo,
  onRefresh
}: { 
  onFolderChange?: (folder: string) => void;
  currentFolder?: string;
  isConnected?: boolean;
  userInfo?: any;
  onRefresh?: () => void;
}) {
  const ui = useUI();
  const { user, hasPermission } = useCodeAuth();
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [showCollab, setShowCollab] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showMeetings, setShowMeetings] = useState(false);

  // Détection gmail pour la section "Comptes" uniquement
  useEffect(() => {
    (async () => {
      try { const res = await fetch("/api/google/me"); setGmailConnected(res.ok); }
      catch { setGmailConnected(false); }
    })();
  }, []);

  async function disconnect() {
    try { await fetch("/api/google/disconnect", { method: "POST" }); setGmailConnected(false); alert("Déconnecté de Gmail."); location.reload(); }
    catch {}
  }

  const folderNavEnabled = Boolean(isConnected); // IMAP ou Gmail

  // Mapper rôle applicatif -> rôle collab temps réel
  const mapRole = (lvl?: number, roleText?: string): "chef" | "manager" | "assistant" | "employe" => {
    // Debug
    console.log('🔍 mapRole - level:', lvl, 'roleText:', roleText);
    
    const r = (roleText || "").toLowerCase();
    
    // Priorité au texte du rôle si disponible
    if (r.includes("directeur") || r.includes("dg") || r.includes("général")) return "chef";
    if (r.includes("admin")) return "manager";
    if (r.includes("financ")) return "manager"; // Financier = manager dans le système collab
    if (r.includes("assistant")) return "assistant";
    
    // Fallback sur le level
    if (typeof lvl === "number") {
      if (lvl >= 10) return "chef"; // DG
      if (lvl >= 7) return "manager"; // Admin, Financier
      if (lvl >= 5) return "assistant";
      return "employe";
    }
    
    return "employe";
  };

  return (
    <aside className="panel h-full p-2">
      <nav className="text-sm">
        <FolderButton
          active={currentFolder?.toUpperCase() === "INBOX"}
          disabled={!folderNavEnabled}
          title={!folderNavEnabled ? "Connectez un compte email d'abord" : "Boîte de réception"}
          onClick={() => onFolderChange?.("INBOX")}
        >
          <Inbox className="w-4 h-4" />
          <span>Boîte de réception</span>
          {currentFolder?.toUpperCase() === "INBOX" && (
            <span className="ml-auto text-xs bg-blue-600 text-white px-1 rounded">Focus</span>
          )}
        </FolderButton>

        <FolderItem icon={<Star className="w-4 h-4" />} label="Favoris" folderId="STARRED" currentFolder={currentFolder} onFolderChange={onFolderChange} enabled={folderNavEnabled} />
        <FolderItem icon={<Send className="w-4 h-4" />} label="Envoyés" folderId="SENT" currentFolder={currentFolder} onFolderChange={onFolderChange} enabled={folderNavEnabled} />
        <FolderItem icon={<FileText className="w-4 h-4" />} label="Brouillons" folderId="DRAFTS" currentFolder={currentFolder} onFolderChange={onFolderChange} enabled={folderNavEnabled} />
        
        <div className="h-3" />

        {/* Collaboration (temps réel) */}
        <button className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-100 relative" onClick={() => setShowCollab(true)} title="Ouvrir la collaboration en temps réel">
          <Link2 size={16} />
          <span className="flex-1 text-left">Collaboration (temps réel)</span>
          <GlobalNotificationBadge />
        </button>

        <button className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-100" onClick={() => setShowTasks(true)} title="Ajouter/voir des tâches">
          <CheckSquare className="w-4 h-4" /> Tâches
        </button>

        <button className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-100" onClick={() => setShowMeetings(true)} title="Compte rendu de réunion">
          <ClipboardList className="w-4 h-4" /> Réunions
        </button>

        <button className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-100" onClick={() => setShowTeam(true)} title="Voir l'équipe">
          <Users className="w-4 h-4" /> Équipe
        </button>

        {/* Lien vers l'état de besoins */}
        <Link href="/requisitions" className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-100 mt-1" title="Réquisitions">
          <FileText size={16} />
          <span className="text-sm">Réquisitions</span>
        </Link>

        {/* Mes demandes - Pour tous les utilisateurs */}
        <Link href="/requisitions/my-requests" className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-100 mt-1" title="Mes demandes">
          <User size={16} />
          <span className="text-sm">Mes demandes</span>
        </Link>

        {/* Interface d'approbation - Uniquement pour Finance, Administration, DG */}
        {user && [6, 7, 10].includes(user.level || 0) && (
          <Link href="/requisitions/approvals" className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-100 mt-1" title="Approbations">
            <CheckSquare size={16} />
            <span className="text-sm">Approbations</span>
          </Link>
        )}

        <div className="h-3" />
        <div className="px-2 text-xs uppercase text-[var(--muted)] mb-1">Comptes</div>
        
        {gmailConnected === false && (
          <a href="/api/google/auth" className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-100 text-blue-600">
            <Link2 className="w-4 h-4" /> Connecter Gmail
          </a>
        )}
        
        {gmailConnected === true && (
          <>
            <div className="w-full flex items-center gap-2 px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Gmail connecté
            </div>
            <button onClick={disconnect} className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-100">
              <LogOut className="w-4 h-4" /> Se déconnecter
            </button>
          </>
        )}
      </nav>

  {showCollab && (
        <CollabPanel 
          roomId={`company:${user?.companyId || user?.company || "default"}:main`} 
      // Utiliser l'ID réel si disponible pour garantir la symétrie des DMs
      userId={user?.id || getStableUserId()}
      userName={user?.name || userInfo?.userName || "Moi"} 
      role={mapRole(user?.level, user?.role)} 
          onClose={() => setShowCollab(false)} 
        />
      )}
      
      {showTeam && (
        <TeamPanel 
          onClose={() => setShowTeam(false)} 
        />
      )}

      {showTasks && (
        <TasksPanel 
          currentUser={{ 
            id: user?.id || userInfo?.userId || "user", 
            name: user?.name || userInfo?.userName || "Utilisateur", 
            role: (user?.role || userInfo?.role || "Employé") as UserRole 
          }}
          onClose={() => setShowTasks(false)} 
        />
      )}

      {showMeetings && (
        <MeetingsPanel onClose={() => setShowMeetings(false)} />
      )}
    </aside>
  );
}

function FolderButton({ active, disabled, title, onClick, children }: { active?: boolean; disabled?: boolean; title?: string; onClick?: () => void; children: React.ReactNode; }) {
  return (
    <button
      className={`w-full flex items-center gap-2 px-2 py-2 rounded-md transition-colors ${active ? "bg-gray-900 text-white" : disabled ? "text-gray-400 cursor-not-allowed" : "hover:bg-gray-100"}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

function FolderItem({ icon, label, folderId, currentFolder, onFolderChange, enabled }: { 
  icon: React.ReactNode; label: string; folderId: string; currentFolder?: string;
  onFolderChange?: (folder: string) => void; enabled?: boolean;
}) {
  const isActive = (currentFolder || "").toUpperCase() === folderId;
  const disabled = !enabled;
  return (
    <button 
      className={`w-full flex items-center gap-2 px-2 py-2 rounded-md transition-colors ${isActive ? "bg-gray-900 text-white" : disabled ? "text-gray-400 cursor-not-allowed" : "hover:bg-gray-100"}`}
      onClick={() => !disabled && onFolderChange?.(folderId)}
      disabled={disabled}
      title={disabled ? "Connectez un compte email d'abord" : label}
    >
      {icon} {label}
    </button>
  );
}

export default Sidebar;