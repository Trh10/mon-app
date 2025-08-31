"use client";

import { useRef, useState } from "react";
import { gmailActions } from "@lib/gmail-actions";
"use client";

import GmailResumeButton from "./Mail/GmailResumeButton";
// … tes autres imports

export default function GmailButtonsWiring({ message, ...props }: { message: any }) {
  // … ton code existant (boutons Archiver, Marquer lu, etc.)

  return (
    <div className="flex items-center gap-2">
      {/* … tes autres boutons */}

      {/* Bouton Résumer (place-le où tu veux dans la barre d’actions) */}
      <GmailResumeButton message={message} lang="fr" />
    </div>
  );
}
type Att = { filename: string; contentType: string; dataBase64: string };

function fileToBase64(file: File): Promise<Att> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => {
      const dataUrl = String(fr.result || "");
      const base64 = dataUrl.split(",")[1] || "";
      resolve({ filename: file.name, contentType: file.type || "application/octet-stream", dataBase64: base64 });
    };
    fr.readAsDataURL(file);
  });
}

export function useGmailComposer(currentMessageId: string | null) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("<p></p>");
  const [attachments, setAttachments] = useState<Att[]>([]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function startReply() {
    if (!currentMessageId) return;
    setStatus(null);
    const d = await gmailActions.getMessage(currentMessageId);
    setSubject(d.headers?.subject ? `Re: ${d.headers.subject}` : "");
    setTo(d.headers?.from || "");
    setHtml(`<p></p><hr/><blockquote>${d.bodyHtml || ""}</blockquote>`);
  }

  async function startForward() {
    if (!currentMessageId) return;
    setStatus(null);
    const d = await gmailActions.getMessage(currentMessageId);
    setSubject(d.headers?.subject ? `Fwd: ${d.headers.subject}` : "");
    setHtml(`<p></p><hr/><blockquote>${d.bodyHtml || ""}</blockquote>`);
    // laisse "to" vide: l'utilisateur choisit le destinataire
  }

  function openFilePicker() {
    fileRef.current?.click();
  }

  async function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !files.length) return;
    const list = await Promise.all(Array.from(files).map(fileToBase64));
    setAttachments((prev) => [...prev, ...list]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function send() {
    if (!currentMessageId) return;
    setSending(true);
    setStatus(null);
    try {
      const d = await gmailActions.getMessage(currentMessageId);
      const headers: Record<string, string> = {};
      if (d.headers?.inReplyTo) headers["In-Reply-To"] = d.headers.inReplyTo;
      if (d.headers?.references) headers["References"] = d.headers.references;

      await gmailActions.send({
        to,
        subject,
        html,
        threadId: d.threadId, // garde le fil pour une réponse
        headers,
        attachments,
      });
      setStatus("Message envoyé.");
      setAttachments([]);
    } catch (e: any) {
      setStatus(e?.message || "Erreur d'envoi");
      // Si 401/403 → reconnecter avec le scope gmail.send
    } finally {
      setSending(false);
    }
  }

  return {
    fileRef,
    to, setTo,
    subject, setSubject,
    html, setHtml,
    attachments,
    sending,
    status,
    startReply,
    startForward,
    openFilePicker,
    onFilesPicked,
    send,
  };
}