"use client";
import { useMemo, useState, useEffect } from "react";
import { useUI } from "@store";
import type { Email } from "@/lib/email-types";
import { ExpandedEmailReader } from "@components/ExpandedEmailReader";
import { EmailActions } from "@components/EmailActions";
import { AlertTriangle, Paperclip, Mail, MailOpen, Archive, Trash2, Check, CheckSquare, Square, User, Calendar } from "lucide-react";
import { cn } from "@lib/cn";

export function LeftPane({ 
  items, 
  loading,
  onRefresh,
  checkedEmails,
  setCheckedEmails,
  userInfo
}: { 
  items: Email[]; 
  loading?: boolean;
  onRefresh?: () => void;
  checkedEmails?: Set<string>;
  setCheckedEmails?: (emails: Set<string>) => void;
  userInfo?: { userName: string; email: string; provider: string; timestamp: string; };
}) {
  const { selectedEmailId, setSelectedEmailId, density, focusInbox } = useUI();

  const [openMessageId, setOpenMessageId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<Email[]>(items);
  const [readEmails, setReadEmails] = useState<Set<string>>(new Set());
  const localCheckedEmails = checkedEmails || new Set<string>();
  const setLocalCheckedEmails = setCheckedEmails || (() => {});
  const [selectAllChecked, setSelectAllChecked] = useState(false);

  const currentUser = userInfo?.userName || "User";
  const currentEmail = userInfo?.email || "";

  useEffect(() => { setLocalItems(items); }, [items]);

  // Sélection initiale fiable (réagit aux changements de liste/dossier)
  useEffect(() => {
    if (localItems.length === 0) return;
    if (!selectedEmailId || !localItems.some(e => e.id === selectedEmailId)) {
      setSelectedEmailId?.(localItems[0].id);
    }
  }, [localItems, selectedEmailId, setSelectedEmailId]);

  // Gérer "Tout sélectionner"
  useEffect(() => {
    if (localItems.length > 0) {
      setSelectAllChecked(localCheckedEmails.size === localItems.length);
    } else {
      setSelectAllChecked(false);
    }
  }, [localItems.length, localCheckedEmails.size]);

  function handleSelectAll() {
    if (selectAllChecked) {
      setLocalCheckedEmails(new Set());
      setSelectAllChecked(false);
    } else {
      setLocalCheckedEmails(new Set(sortedItems.map(i => i.id)));
      setSelectAllChecked(true);
    }
  }

  function handleCheckEmail(emailId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const next = new Set(localCheckedEmails);
    if (next.has(emailId)) next.delete(emailId); else next.add(emailId);
    setLocalCheckedEmails(next);
  }

  async function markAsRead(emailId: string) {
    const email = localItems.find(e => e.id === emailId);
    const isUnread = email ? (email.unread || !email.read) && !readEmails.has(emailId) : false;
    if (!isUnread) return;

    setReadEmails(prev => new Set([...prev, emailId]));
    setLocalItems(prev => prev.map(it => it.id === emailId ? { ...it, read: true, unread: false } : it));
    try {
      await fetch("/api/email/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead", messageIds: [emailId], provider: (userInfo?.provider || "auto").toLowerCase(), userInfo: { userName: currentUser, email: currentEmail } })
      });
    } catch {}
  }

  function handleEmailClick(emailId: string) {
    setSelectedEmailId?.(emailId);
    markAsRead(emailId);
  }
  function handleEmailDoubleClick(emailId: string) {
    setSelectedEmailId?.(emailId);
    setOpenMessageId(emailId);
    markAsRead(emailId);
  }

  const styles = getDensityStyles(density);

  const sortedItems = useMemo(() => {
    function isUrgent(e: Email) {
      if (readEmails.has(e.id) || (!e.unread && e.read)) return false;
      const urgentKeywords = ["urgent","asap","immediately","emergency","critical","deadline","rapidement","immédiat"];
      const content = `${e.subject} ${e.snippet}`.toLowerCase();
      return urgentKeywords.some(k => content.includes(k)) || e.priority === "high";
    }
    function isUnread(e: Email) {
      if (readEmails.has(e.id)) return false;
      return e.unread || !e.read;
    }
    return [...localItems].sort((a, b) => {
      const aUrg = isUrgent(a), bUrg = isUrgent(b);
      const aUnr = isUnread(a), bUnr = isUnread(b);
      if (aUrg && aUnr && (!bUrg || !bUnr)) return -1;
      if (bUrg && bUnr && (!aUrg || !aUnr)) return 1;
      if (aUrg && !bUrg) return -1;
      if (!aUrg && bUrg) return 1;
      if (aUnr && !bUnr) return -1;
      if (!aUnr && bUnr) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [localItems, readEmails]);

  const unreadCount = sortedItems.filter(e => (e.unread || !e.read) && !readEmails.has(e.id)).length;

  if (loading) {
    return (
      <aside className="panel h-full overflow-auto">
        <div className="p-4 text-sm text-gray-600">
          <div className="animate-pulse">Chargement des emails...</div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className={cn("panel h-full overflow-auto", focusInbox ? "border-2 border-blue-200" : "")}>
        {/* Bandeau infos */}
        <div className="px-3 py-2 bg-gradient-to-r from-green-50 to-blue-50 border-b border-green-200">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-900">👤 {currentUser}</span>
              {currentEmail && <span className="text-green-700">📧 {currentEmail.split("@")[0]}@...</span>}
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <Calendar className="w-4 h-4" />
              <span>{new Date().toISOString().slice(0, 16).replace("T"," ")} UTC</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1 text-green-700">
            <div>📊 {sortedItems.length} emails</div>
            <div>Non lus: {unreadCount}</div>
          </div>
        </div>

        {/* Barre d'actions groupées */}
        {localCheckedEmails.size > 0 && (
          <div className="px-3 py-2 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-yellow-800">
                {localCheckedEmails.size} email(s) sélectionné(s)
              </div>
              <div className="flex gap-1">
                <button onClick={handleBulkMarkAsRead} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" title="Marquer comme lu">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={handleBulkArchive} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700" title="Archiver">
                  <Archive className="w-3 h-3" />
                </button>
                <button onClick={handleBulkDelete} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" title="Supprimer">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tout sélectionner */}
        <div className="px-3 py-2 bg-gray-100 border-b text-xs">
          <div className="flex items-center justify-between">
            <button onClick={handleSelectAll} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
              {selectAllChecked ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
              <span className="font-medium">{selectAllChecked ? "Tout désélectionner" : "Tout sélectionner"}</span>
            </button>
            <div className="text-gray-500">
              {localCheckedEmails.size}/{sortedItems.length} sélectionné(s)
            </div>
          </div>
        </div>

        {/* Liste */}
        <ul className={styles.spacingClass}>
          {sortedItems.map((m) => {
            const isUnread = (m.unread || !m.read) && !readEmails.has(m.id);
            const isChecked = localCheckedEmails.has(m.id);
            const hasAttach = m.hasAttachments || m.snippet?.toLowerCase().includes("attachment") || m.snippet?.toLowerCase().includes("pièce jointe");

            return (
              <li key={m.id}>
                <div className={cn(
                  "border-b border-[var(--border)] transition-all duration-150 relative",
                  isChecked ? "bg-yellow-50 border-l-4 border-l-yellow-400" : "",
                )}>
                  <div className="flex items-center justify-between px-3 py-1 bg-gray-50 border-b">
                    <button onClick={(e) => handleCheckEmail(m.id, e)} className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800">
                      {isChecked ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                      <span>Sélectionner</span>
                    </button>
                    <div className="text-xs text-gray-500">ID: {m.id}</div>
                    {isChecked && <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded-full">✓ Sélectionné</span>}
                  </div>

                  <button
                    onClick={() => handleEmailClick(m.id)}
                    onDoubleClick={() => handleEmailDoubleClick(m.id)}
                    className={cn("w-full text-left hover:bg-gray-50 transition-colors", styles.itemClass, isUnread ? "font-semibold" : "opacity-75")}
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn("font-medium truncate flex items-center gap-1", styles.titleClass)}>
                        {isUnread ? <Mail className="w-3 h-3 text-blue-600 flex-shrink-0" /> : <MailOpen className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                        {hasAttach && <Paperclip className="w-3 h-3 text-gray-500 flex-shrink-0" />}
                        <span className="truncate font-medium">{m.fromName || m.from}</span>
                      </div>
                      <div className={cn("text-[var(--muted)] flex items-center gap-1", styles.metaClass)}>
                        <span>{new Date(m.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className={cn("truncate", styles.titleClass, isUnread ? "font-bold" : "font-medium")}>{m.subject}</div>
                    <div className={cn("text-[var(--muted)] truncate", styles.metaClass)}>{m.snippet}</div>
                  </button>

                  <div className="px-3 py-2 bg-gray-50 border-t flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {isUnread && <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">NOUVEAU</span>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      {new Date(m.date).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      {openMessageId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] overflow-hidden">
            <ExpandedEmailReader 
              messageId={openMessageId}
              onBack={() => setOpenMessageId(null)}
              onRefresh={onRefresh}
              userInfo={userInfo}
            />
          </div>
        </div>
      )}
    </>
  );
}

function getDensityStyles(density: "compact" | "dense" | "ultra") {
  if (density === "compact") return { itemClass: "px-2 py-1.5", titleClass: "text-sm", metaClass: "text-xs", spacingClass: "space-y-1" };
  if (density === "dense") return { itemClass: "px-3 py-2", titleClass: "text-sm", metaClass: "text-xs", spacingClass: "space-y-1.5" };
  if (density === "ultra") return { itemClass: "px-4 py-3", titleClass: "text-base", metaClass: "text-sm", spacingClass: "space-y-2" };
  return { itemClass: "px-3 py-2", titleClass: "text-sm", metaClass: "text-xs", spacingClass: "space-y-1.5" };
}

async function handleBulkArchive() {}
async function handleBulkDelete() {}
async function handleBulkMarkAsRead() {}