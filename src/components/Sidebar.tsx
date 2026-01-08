"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUI } from "@store";
import CollabPanel from "./Collab/CollabPanel";
import { getStableUserId } from "../lib/realtime/provider";
import PremiumTeamPanel, { TeamMember } from "./team/PremiumTeamPanel";
import TasksPanel from "./tasks/TasksPanel";
import MeetingsPanel from "./meetings/MeetingsPanel";
import { useCodeAuth } from "./auth/CodeAuthContext";
import { GlobalNotificationBadge } from "./notifications/NotificationBadge";
import { UserRole } from "../lib/permissions";
import { Inbox, Star, Send, FileText, CheckSquare, Users, MessageCircle, ClipboardList, User, Zap, Crown, ChevronRight, Mail, Receipt } from "lucide-react";

export function Sidebar({ onFolderChange, currentFolder, isConnected, userInfo, onRefresh }: { onFolderChange?: (folder: string) => void; currentFolder?: string; isConnected?: boolean; userInfo?: any; onRefresh?: () => void; }) {
  const ui = useUI();
  const { user, hasPermission } = useCodeAuth();
  const [showCollab, setShowCollab] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showMeetings, setShowMeetings] = useState(false);
  const [privateChatTarget, setPrivateChatTarget] = useState<TeamMember | null>(null);
  const [pendingCall, setPendingCall] = useState<{ member: TeamMember; type: "audio" | "video" } | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [assignTaskToMember, setAssignTaskToMember] = useState<TeamMember | null>(null);

  const handleStartPrivateChat = (member: TeamMember) => { setPrivateChatTarget(member); setShowTeam(false); setShowCollab(true); };
  const handleStartCall = (member: TeamMember, type: "audio" | "video") => { setPendingCall({ member, type }); setShowTeam(false); setShowCollab(true); };
  const handleAssignTask = (member: TeamMember) => { setAssignTaskToMember(member); setShowTeam(false); setShowTasks(true); };

  const folderNavEnabled = Boolean(isConnected);

  const mapRole = (lvl?: number, roleText?: string): "chef" | "manager" | "assistant" | "employe" => {
    const r = (roleText || "").toLowerCase();
    if (r.includes("directeur") || r.includes("dg") || r.includes("general")) return "chef";
    if (r.includes("admin")) return "manager";
    if (r.includes("financ")) return "manager";
    if (r.includes("assistant")) return "assistant";
    if (typeof lvl === "number") { if (lvl >= 10) return "chef"; if (lvl >= 7) return "manager"; if (lvl >= 5) return "assistant"; return "employe"; }
    return "employe";
  };

  return (
    <aside className="h-full bg-gray-50 dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-gray-900 dark:text-white overflow-hidden flex flex-col transition-colors duration-300">
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 pt-4">
        <div className="mb-4">
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500"><Mail className="w-3 h-3" /><span>Messagerie</span></div>
          <PremiumNavItem icon={<Inbox className="w-4 h-4" />} label="Boite de reception" badge={currentFolder?.toUpperCase() === "INBOX" ? "Focus" : undefined} badgeColor="bg-gradient-to-r from-blue-500 to-cyan-500" active={currentFolder?.toUpperCase() === "INBOX"} disabled={!folderNavEnabled} onClick={() => onFolderChange?.("INBOX")} onHover={setHoveredItem} id="inbox" hoveredItem={hoveredItem} />
          <PremiumNavItem icon={<Star className="w-4 h-4" />} label="Favoris" active={currentFolder?.toUpperCase() === "STARRED"} disabled={!folderNavEnabled} onClick={() => onFolderChange?.("STARRED")} onHover={setHoveredItem} id="starred" hoveredItem={hoveredItem} accentColor="from-amber-400 to-orange-500" />
          <PremiumNavItem icon={<Send className="w-4 h-4" />} label="Envoyes" active={currentFolder?.toUpperCase() === "SENT"} disabled={!folderNavEnabled} onClick={() => onFolderChange?.("SENT")} onHover={setHoveredItem} id="sent" hoveredItem={hoveredItem} accentColor="from-emerald-400 to-teal-500" />
          <PremiumNavItem icon={<FileText className="w-4 h-4" />} label="Brouillons" active={currentFolder?.toUpperCase() === "DRAFTS"} disabled={!folderNavEnabled} onClick={() => onFolderChange?.("DRAFTS")} onHover={setHoveredItem} id="drafts" hoveredItem={hoveredItem} accentColor="from-slate-400 to-slate-500" />
        </div>
        <div className="mb-4">
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><Zap className="w-3 h-3" /><span>Collaboration</span></div>
          <PremiumNavItem icon={<MessageCircle className="w-4 h-4" />} label="Chat" onClick={() => setShowCollab(true)} onHover={setHoveredItem} id="collab" hoveredItem={hoveredItem} accentColor="from-violet-400 to-purple-500" customBadge={<GlobalNotificationBadge />} glow />
          <PremiumNavItem icon={<CheckSquare className="w-4 h-4" />} label="Taches" onClick={() => setShowTasks(true)} onHover={setHoveredItem} id="tasks" hoveredItem={hoveredItem} accentColor="from-rose-400 to-pink-500" />
          <PremiumNavItem icon={<ClipboardList className="w-4 h-4" />} label="Reunions" onClick={() => setShowMeetings(true)} onHover={setHoveredItem} id="meetings" hoveredItem={hoveredItem} accentColor="from-cyan-400 to-blue-500" />
          <PremiumNavItem icon={<Users className="w-4 h-4" />} label="Equipe" onClick={() => setShowTeam(true)} onHover={setHoveredItem} id="team" hoveredItem={hoveredItem} accentColor="from-indigo-400 to-violet-500" />
        </div>
        <div className="mb-4">
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><Crown className="w-3 h-3" /><span>Requisitions</span></div>
          <Link href="/requisitions" className="block"><PremiumNavItem icon={<FileText className="w-4 h-4" />} label="Nouvelle demande" onHover={setHoveredItem} id="requisitions" hoveredItem={hoveredItem} accentColor="from-purple-400 to-indigo-500" isLink /></Link>
          <Link href="/requisitions/my-requests" className="block"><PremiumNavItem icon={<User className="w-4 h-4" />} label="Mes demandes" onHover={setHoveredItem} id="my-requests" hoveredItem={hoveredItem} accentColor="from-sky-400 to-blue-500" isLink /></Link>
          {user && [5, 6, 7, 8, 9, 10].includes(user.level || 0) && (<Link href="/requisitions/approvals" className="block"><PremiumNavItem icon={<CheckSquare className="w-4 h-4" />} label="Approbations" onHover={setHoveredItem} id="approvals" hoveredItem={hoveredItem} accentColor="from-amber-400 to-orange-500" isLink premium /></Link>)}
        </div>
        {/* Module Facturation - accès restreint DG, Finance, Administration */}
        {user && ['DG', 'FINANCE', 'ADMINISTRATION', 'ADMIN', 'DIRECTEUR GENERAL', 'DIRECTEUR'].some(r => (user.role || '').toUpperCase().includes(r)) && (
          <div className="mb-4">
            <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><Receipt className="w-3 h-3" /><span>Facturation</span></div>
            <Link href="/invoices" className="block"><PremiumNavItem icon={<Receipt className="w-4 h-4" />} label="Factures & Clients" onHover={setHoveredItem} id="invoices" hoveredItem={hoveredItem} accentColor="from-emerald-400 to-teal-500" isLink premium /></Link>
          </div>
        )}
      </nav>
      {showCollab && (<CollabPanel roomId={`company:${user?.companyId || user?.company || "default"}:main`} userId={user?.id || getStableUserId()} userName={user?.name || userInfo?.userName || "Moi"} role={mapRole(user?.level, user?.role)} onClose={() => { setShowCollab(false); setPrivateChatTarget(null); setPendingCall(null); }} initialPrivateChat={privateChatTarget} initialCall={pendingCall ? { type: pendingCall.type, target: { id: pendingCall.member.id, name: pendingCall.member.name } } : null} />)}
      {showTeam && (<PremiumTeamPanel onClose={() => setShowTeam(false)} onStartPrivateChat={handleStartPrivateChat} onStartCall={handleStartCall} onAssignTask={handleAssignTask} />)}
      {showTasks && (<TasksPanel currentUser={{ id: user?.id || userInfo?.userId || "user", name: user?.name || userInfo?.userName || "Utilisateur", role: (user?.role || userInfo?.role || "Employe") as UserRole }} onClose={() => { setShowTasks(false); setAssignTaskToMember(null); }} preselectedMember={assignTaskToMember ? { id: assignTaskToMember.id, name: assignTaskToMember.name } : undefined} />)}
      {showMeetings && (<MeetingsPanel onClose={() => setShowMeetings(false)} />)}
    </aside>
  );
}

function PremiumNavItem({ icon, label, active, disabled, onClick, onHover, id, hoveredItem, badge, badgeColor, customBadge, accentColor = "from-purple-400 to-pink-500", isLink, glow, premium }: { icon: React.ReactNode; label: string; active?: boolean; disabled?: boolean; onClick?: () => void; onHover?: (id: string | null) => void; id: string; hoveredItem: string | null; badge?: string; badgeColor?: string; customBadge?: React.ReactNode; accentColor?: string; isLink?: boolean; glow?: boolean; premium?: boolean; }) {
  const isHovered = hoveredItem === id;
  const isActive = active || false;
  return (
    <button onClick={disabled ? undefined : onClick} onMouseEnter={() => onHover?.(id)} onMouseLeave={() => onHover?.(null)} disabled={disabled} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden group ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"} ${isActive ? `bg-gradient-to-r ${accentColor} shadow-lg` : isHovered ? "bg-gray-200 dark:bg-white/10" : "hover:bg-gray-100 dark:hover:bg-white/5"} ${glow && !isActive ? "hover:shadow-lg hover:shadow-purple-500/20" : ""}`}>
      {isHovered && !isActive && (<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />)}
      {isActive && (<div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full shadow-lg shadow-white/50" />)}
      <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${isActive ? "bg-white/20 text-white" : isHovered ? `bg-gradient-to-br ${accentColor} text-white shadow-lg` : "bg-gray-200 dark:bg-white/5 text-gray-600 dark:text-slate-400"}`}>
        {icon}
        {customBadge}
      </div>
      <span className={`flex-1 text-left text-sm font-medium transition-colors duration-300 ${isActive ? "text-white" : isHovered ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-slate-300"}`}>{label}</span>
      {premium && (<div className="px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-orange-500 text-[9px] font-bold text-white uppercase shadow-lg shadow-amber-500/30">Pro</div>)}
      {badge && (<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${badgeColor || "bg-gradient-to-r from-blue-500 to-cyan-500"} shadow-lg`}>{badge}</span>)}
      {isLink && (<ChevronRight className={`w-4 h-4 transition-all duration-300 ${isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"} ${isActive ? "text-white" : "text-gray-400 dark:text-slate-400"}`} />)}
    </button>
  );
}

export default Sidebar;
