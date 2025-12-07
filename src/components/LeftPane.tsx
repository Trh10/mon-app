"use client";

import React, { useCallback, useState, useMemo, useEffect } from "react";
import type { Email } from "@lib/types";
import { useUI } from "@store";
import { ExpandedEmailReader } from "./ExpandedEmailReader";
import { 
  Mail, 
  MailOpen, 
  Archive, 
  Trash2, 
  Check, 
  CheckSquare, 
  Square, 
  User, 
  Calendar, 
  AlertTriangle, 
  Paperclip,
  RefreshCw,
  ChevronDown,
  Inbox,
  Star
} from "lucide-react";

interface LeftPaneProps {
  items: Email[];
  loading: boolean;
  onRefresh: () => void;
  checkedEmails: Set<string>;
  setCheckedEmails: React.Dispatch<React.SetStateAction<Set<string>>>;
  userInfo?: { email: string; name?: string } | null;
  onLoadMore?: () => void;
}

export function LeftPane({
  items,
  loading,
  onRefresh,
  checkedEmails,
  setCheckedEmails,
  userInfo,
  onLoadMore,
}: LeftPaneProps) {
  const { selectedEmailId, setSelectedEmailId, density } = useUI();
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Toggle email selection
  const toggleCheck = useCallback((emailId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  }, [setCheckedEmails]);

  // Select all emails
  const selectAll = useCallback(() => {
    if (checkedEmails.size === items.length) {
      setCheckedEmails(new Set());
    } else {
      setCheckedEmails(new Set(items.map((e) => e.id)));
    }
  }, [checkedEmails.size, items, setCheckedEmails]);

  // Handle email click (single click to select)
  const handleEmailClick = useCallback((email: Email) => {
    setSelectedEmailId?.(email.id);
  }, [setSelectedEmailId]);

  // Handle email double click (open expanded reader)
  const handleEmailDoubleClick = useCallback((email: Email) => {
    setExpandedEmailId(email.id);
  }, []);

  // Sort emails: unread first, then by date, urgent emails at top
  const sortedEmails = useMemo(() => {
    return [...items].sort((a, b) => {
      // Urgent emails first
      const aUrgent = a.subject?.toLowerCase().includes("urgent") || 
                      a.subject?.toLowerCase().includes("important") ||
                      a.subject?.toLowerCase().includes("asap");
      const bUrgent = b.subject?.toLowerCase().includes("urgent") || 
                      b.subject?.toLowerCase().includes("important") ||
                      b.subject?.toLowerCase().includes("asap");
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      
      // Unread before read
      if (a.unread && !b.unread) return -1;
      if (!a.unread && b.unread) return 1;
      
      // Then by date (newest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [items]);

  // Show bulk actions when emails are checked
  useEffect(() => {
    setShowBulkActions(checkedEmails.size > 0);
  }, [checkedEmails.size]);

  // Bulk actions handlers
  const handleBulkArchive = useCallback(() => {
    console.log("Archive emails:", Array.from(checkedEmails));
    setCheckedEmails(new Set());
  }, [checkedEmails, setCheckedEmails]);

  const handleBulkDelete = useCallback(() => {
    console.log("Delete emails:", Array.from(checkedEmails));
    setCheckedEmails(new Set());
  }, [checkedEmails, setCheckedEmails]);

  const handleBulkMarkRead = useCallback(() => {
    console.log("Mark read:", Array.from(checkedEmails));
    setCheckedEmails(new Set());
  }, [checkedEmails, setCheckedEmails]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  // Check if email is urgent
  const isUrgent = (email: Email) => {
    const subject = email.subject?.toLowerCase() || "";
    return subject.includes("urgent") || subject.includes("important") || subject.includes("asap");
  };

  // Density-based padding
  const getPadding = () => {
    switch (density) {
      case "ultra": return "py-2 px-3";
      case "dense": return "py-3 px-3";
      case "compact": return "py-3 px-4";
      default: return "py-3 px-4";
    }
  };

  return (
    <div className="relative h-full flex flex-col bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden transition-colors duration-300">
      {/* Glow effects - only visible in dark mode */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none dark:opacity-100 opacity-0" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none dark:opacity-100 opacity-0" />
      
      {/* Header */}
      <div className="relative z-10 flex-shrink-0 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 backdrop-blur-sm transition-colors duration-300">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg shadow-lg shadow-purple-500/20">
              <Inbox className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">Boîte de réception</h2>
              <p className="text-xs text-gray-500 dark:text-white/50 transition-colors">
                {items.length} message{items.length !== 1 ? "s" : ""}
                {items.filter(e => e.unread).length > 0 && (
                  <span className="ml-2 text-purple-600 dark:text-purple-300">
                    • {items.filter(e => e.unread).length} non lu{items.filter(e => e.unread).length !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 transition-all duration-200 disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-white/70 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100 dark:border-white/5 transition-colors">
          <button
            onClick={selectAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 transition-all duration-200 text-sm text-gray-700 dark:text-white/70"
          >
            {checkedEmails.size === items.length && items.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>Tout sélectionner</span>
          </button>
          
          {showBulkActions && (
            <div className="flex items-center gap-2 ml-2 animate-in fade-in slide-in-from-left-2 duration-200">
              <span className="text-xs text-purple-600 dark:text-purple-300 font-medium">
                {checkedEmails.size} sélectionné{checkedEmails.size !== 1 ? "s" : ""}
              </span>
              <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />
              <button
                onClick={handleBulkMarkRead}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white transition-all"
                title="Marquer comme lu"
              >
                <MailOpen className="w-4 h-4" />
              </button>
              <button
                onClick={handleBulkArchive}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white transition-all"
                title="Archiver"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                onClick={handleBulkDelete}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/20 text-gray-500 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 transition-all"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Email List */}
      <div className="relative z-10 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-r-blue-500/50 rounded-full animate-spin animation-delay-150" />
            </div>
            <p className="text-gray-500 dark:text-white/50 text-sm">Chargement des emails...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
              <Inbox className="w-12 h-12 text-gray-400 dark:text-white/30" />
            </div>
            <div>
              <p className="text-gray-700 dark:text-white/70 font-medium">Aucun email</p>
              <p className="text-white/40 text-sm mt-1">Votre boîte de réception est vide</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {sortedEmails.map((email) => {
              const isSelected = selectedEmailId === email.id;
              const isChecked = checkedEmails.has(email.id);
              const urgent = isUrgent(email);
              
              return (
                <div
                  key={email.id}
                  onClick={() => handleEmailClick(email)}
                  onDoubleClick={() => handleEmailDoubleClick(email)}
                  className={`
                    group relative cursor-pointer transition-all duration-200
                    ${getPadding()}
                    ${isSelected 
                      ? "bg-purple-50 dark:bg-gradient-to-r dark:from-purple-500/20 dark:to-blue-500/10 border-l-2 border-l-purple-500" 
                      : "hover:bg-gray-50 dark:hover:bg-white/5 border-l-2 border-l-transparent"
                    }
                    ${email.unread ? "bg-blue-50/50 dark:bg-white/[0.02]" : ""}
                  `}
                >
                  {/* Urgent indicator */}
                  {urgent && (
                    <div className="absolute top-2 right-2">
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium rounded-full border border-red-200 dark:border-red-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        Urgent
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={(e) => toggleCheck(email.id, e)}
                      className={`
                        mt-1 p-1 rounded transition-all duration-200
                        ${isChecked 
                          ? "text-purple-500 dark:text-purple-400" 
                          : "text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50"
                        }
                      `}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    
                    {/* Avatar */}
                    <div className={`
                      flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                      ${email.unread 
                        ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white" 
                        : "bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-white/50"
                      }
                    `}>
                      <User className="w-5 h-5" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`
                          text-sm truncate
                          ${email.unread ? "font-semibold text-gray-900 dark:text-white" : "text-gray-600 dark:text-white/70"}
                        `}>
                          {email.from}
                        </span>
                        <span className="flex-shrink-0 text-xs text-gray-400 dark:text-white/40 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(email.date)}
                        </span>
                      </div>
                      
                      <h4 className={`
                        text-sm truncate mb-1
                        ${email.unread ? "font-medium text-gray-800 dark:text-white/90" : "text-gray-500 dark:text-white/60"}
                      `}>
                        {email.subject || "(Sans objet)"}
                      </h4>
                      
                      <p className="text-xs text-gray-400 dark:text-white/40 line-clamp-2">
                        {email.body?.slice(0, 150) || ""}
                      </p>
                      
                      {/* Indicators */}
                      <div className="flex items-center gap-2 mt-2">
                        {email.unread && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 text-xs font-medium rounded-full">
                            <Mail className="w-3 h-3" />
                            Nouveau
                          </span>
                        )}
                        {email.hasAttachments && email.attachments && email.attachments.length > 0 && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                            <Paperclip className="w-3 h-3" />
                            {email.attachments.length}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Unread dot */}
                    {email.unread && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-purple-500 rounded-full" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Load more button */}
        {onLoadMore && items.length > 0 && (
          <div className="p-4 border-t border-white/5">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/70 hover:text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Charger plus d&apos;emails
                </>
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Expanded Email Reader Modal */}
      {expandedEmailId && (
        <ExpandedEmailReader
          messageId={expandedEmailId}
          onBack={() => setExpandedEmailId(null)}
          userInfo={userInfo}
        />
      )}
    </div>
  );
}

export default LeftPane;
