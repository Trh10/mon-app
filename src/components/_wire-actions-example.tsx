"use client";
import { useRef, useState } from "react";
import { gmailActions } from "@lib/gmail-actions";

export function WireActionsExample({
  currentMessageId,
  replyToEmail
}: {
  currentMessageId: string; // id Gmail du mail ouvert
  replyToEmail: string;     // l'adresse à qui répondre (extrait du From)
}) {
  const [to, setTo] = useState(replyToEmail);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("<p></p>");
  const [attachments, setAttachments] = useState<{ filename: string; contentType: string; dataBase64: string }[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function onReply() {
    const detail = await gmailActions.getMessage(currentMessageId);
    setSubject(detail.headers?.subject ? `Re: ${detail.headers.subject}` : "");
    setTo(detail.headers?.from || to);
    setHtml(`<p></p><hr/><blockquote>${detail.bodyHtml || ""}</blockquote>`);
  }

  async function onForward() {
    const detail = await gmailActions.getMessage(currentMessageId);
    setSubject(detail.headers?.subject ? `Fwd: ${detail.headers.subject}` : "");
    // à toi de mettre l'email destinataire
  }

  async function onSend() {
    setSending(true);
    try {
      const detail = await gmailActions.getMessage(currentMessageId);
      const headers: Record<string, string> = {};
      if (detail.headers?.inReplyTo) headers["In-Reply-To"] = detail.headers.inReplyTo;
      if (detail.headers?.references) headers["References"] = detail.headers.references;

      await gmailActions.send({
        to,
        subject,
        html,
        threadId: detail.threadId, // réponse dans le même fil
        headers,
        attachments
      });
      alert("Message envoyé");
      setAttachments([]);
    } catch (e: any) {
      alert(e?.message || "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  }

  async function onAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !files.length) return;
    const next: typeof attachments = [];
    for (const f of Array.from(files)) {
      const buf = await f.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      next.push({ filename: f.name, contentType: f.type || "application/octet-stream", dataBase64: b64 });
    }
    setAttachments((prev) => [...prev, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <div className="hidden">
        <input type="file" multiple ref={fileRef} onChange={onAttach} />
      </div>
      {/* Exemple de mapping: branche ces fonctions sur TES boutons existants */}
      {/* <button onClick={onReply}>Répondre</button>
      <button onClick={onForward}>Transférer</button>
      <button onClick={() => fileRef.current?.click()}>Joindre</button>
      <button onClick={onSend} disabled={sending}>{sending ? "Envoi..." : "Envoyer"}</button> */}
    </div>
  );
}