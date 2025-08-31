"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader, Send, X } from "lucide-react";
import { getAuthHeader, getStoredEmailCredentials } from "@/lib/email/credentials";

type UserInfo = {
  userName: string;
  email: string;
  provider?: string;
  timestamp?: string;
};

type Props = {
  mode: "reply" | "replyAll" | "forward" | "new" | null;
  replyToEmailId?: string | null;
  onClose: () => void;
  onSend: () => void;
  userInfo?: UserInfo;
};

type OriginalMessage = {
  id: string;
  headers?: {
    subject?: string;
    from?: string;
    to?: string;
    "message-id"?: string;
    "references"?: string;
    "in-reply-to"?: string;
  };
  bodyText?: string;
  bodyHtml?: string;
};

function extractEmailAddress(s: string): string | null {
  if (!s) return null;
  const m1 = s.match(/<([^>]+)>/);
  if (m1 && m1[1]) return m1[1].trim();
  const m2 = s.match(/[^\s<>@]+@[^\s<>@]+/);
  return m2 ? m2[0] : null;
}

function computeReferences(existingRefs?: string, messageId?: string) {
  const refs: string[] = [];
  if (existingRefs) refs.push(existingRefs.trim());
  if (messageId) refs.push(messageId.trim());
  const joined = refs.join(" ").trim();
  return joined || undefined;
}

function ComposeEmailModal({ mode, replyToEmailId, onClose, onSend, userInfo }: Props) {
  const [sending, setSending] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState<OriginalMessage | null>(null);

  const fromEmail = useMemo(() => {
    if (userInfo?.email) return userInfo.email;
    const creds = getStoredEmailCredentials();
    return creds?.email || "";
  }, [userInfo?.email]);

  const provider = useMemo(() => {
    if (userInfo?.provider) return String(userInfo.provider).toLowerCase();
    const creds = getStoredEmailCredentials();
    return String(creds?.provider || "auto").toLowerCase();
  }, [userInfo?.provider]);

  useEffect(() => {
    let ignore = false;
    async function loadOriginal() {
      if (!replyToEmailId || mode === "new") return;
      try {
        const url1 = `/api/email/message?id=${encodeURIComponent(replyToEmailId)}`;
        const res1 = await fetch(url1);
        let data: any = null;

        if (res1.ok) {
          data = await res1.json();
        } else {
          const url2 = `/api/google/message?id=${encodeURIComponent(replyToEmailId)}`;
          const res2 = await fetch(url2);
          if (res2.ok) data = await res2.json();
        }

        if (!ignore && data) {
          setOriginal(data);
          const origSub = data?.headers?.subject || "";
          const origFrom = data?.headers?.from || "";
          const origTo = data?.headers?.to || "";
          if (mode === "reply" || mode === "replyAll") {
            setSubject(origSub.toLowerCase().startsWith("re:") ? origSub : `Re: ${origSub || "[Sans objet]"}`);
            const replyAddr = extractEmailAddress(origFrom) || extractEmailAddress(origTo) || "";
            setTo(replyAddr);
          } else if (mode === "forward") {
            setSubject(
              origSub.toLowerCase().startsWith("fw:") || origSub.toLowerCase().startsWith("fwd:")
                ? origSub
                : `Fwd: ${origSub || "[Sans objet]"}`
            );
          }
        }
      } catch (e) {
        console.warn("ComposeEmailModal: loadOriginal failed", e);
      }
    }
    loadOriginal();
    return () => {
      ignore = true;
    };
  }, [replyToEmailId, mode]);

  async function handleSend() {
    if (sending) return;
    const cleanFrom = (fromEmail || "").trim();
    const cleanTo = (to || "").trim();
    const cleanSubject = (subject || "").trim();
    const cleanContent = (content || "").trim();

    if (!cleanFrom) {
      alert("Adresse d’expéditeur introuvable (from). Vérifie la connexion ou le userInfo.");
      return;
    }
    if (!cleanTo || !cleanSubject || !cleanContent) return;

    setSending(true);
    try {
      const messageId = original?.headers?.["message-id"];
      const existingRefs = original?.headers?.["references"];
      const inReplyTo = (mode === "reply" || mode === "replyAll") && messageId ? messageId : undefined;
      const references = computeReferences(existingRefs, messageId);

      const payload = {
        from: cleanFrom,
        to: cleanTo,
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: cleanSubject,
        content: cleanContent,
        provider,
        replyToMessageId: replyToEmailId || undefined,
        inReplyTo,
        references
      };

      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        console.error("Send failed:", res.status, data);
        alert(`Envoi impossible (${res.status}) : ${data?.error || data?.message || "Erreur inconnue"}`);
        return;
      }

      onSend();
    } catch (e: any) {
      console.error("Send error:", e);
      alert(`Erreur d’envoi: ${e?.message || e}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b flex items-center justify-between bg-white">
        <div className="font-semibold">Composer un email {mode ? `(${mode})` : ""}</div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded" title="Fermer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <div className="text-xs text-gray-500">De: <span className="text-gray-800 font-medium">{fromEmail || "—"}</span></div>

        <div className="flex items-center gap-2">
          <label className="w-16 text-sm text-gray-600">À</label>
          <input value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm" placeholder="destinataire@domaine.com" />
        </div>

        <div className="flex items-center gap-2">
          <label className="w-16 text-sm text-gray-600">Cc</label>
          <input value={cc} onChange={(e) => setCc(e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm" placeholder="copie@domaine.com (optionnel)" />
        </div>

        <div className="flex items-center gap-2">
          <label className="w-16 text-sm text-gray-600">Bcc</label>
          <input value={bcc} onChange={(e) => setBcc(e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm" placeholder="copie cachée (optionnel)" />
        </div>

        <div className="flex items-center gap-2">
          <label className="w-16 text-sm text-gray-600">Objet</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm" placeholder="Sujet" />
        </div>

        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[220px] border rounded p-2 text-sm"
            placeholder="Écrire votre message…"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded border hover:bg-gray-50 text-sm">Annuler</button>
          <button
            onClick={handleSend}
            disabled={sending || !to.trim() || !subject.trim() || !content.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{sending ? "Envoi..." : "Envoyer"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Exports: supporte import par défaut et import nommé
export { ComposeEmailModal };
export default ComposeEmailModal;