"use client";

import { useRef, useState } from "react";
import { gmailActions } from "@lib/gmail-actions";

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
    setSending(true);
    setStatus(null);
    try {
      let threadId: string | undefined;
      let headers: Record<string, string> | undefined;

      if (currentMessageId) {
        const d = await gmailActions.getMessage(currentMessageId);
        threadId = d.threadId;
        headers = {};
        if (d.headers?.inReplyTo) headers["In-Reply-To"] = d.headers.inReplyTo;
        if (d.headers?.references) headers["References"] = d.headers.references;
      }

      await gmailActions.send({
        to,
        subject,
        html,
        threadId,
        headers,
        attachments,
      });
      setStatus("Message envoyé.");
      setAttachments([]);
    } catch (e: any) {
      setStatus(e?.message || "Erreur d'envoi");
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