"use client";

import { useState, useRef } from "react";
import { gmailActions } from "@lib/gmail-actions";
import { useGmailComposer } from "@hooks/useGmailComposer";
import { FullReader } from "./FullReader";

export function ActionsHarness() {
  const [log, setLog] = useState<string>("Prêt.");
  const [openId, setOpenId] = useState<string | null>(null);

  // Composer pour test rapide
  const {
    fileRef, to, setTo, subject, setSubject, html, setHtml,
    attachments, sending, status,
    startReply, startForward, openFilePicker, onFilesPicked, send,
  } = useGmailComposer(openId); // onReply utilisera le message ouvert

  async function check() {
    try {
      const me = await gmailActions.me();
      setLog(`Connecté: ${me?.emailAddress || "ok"}`);
    } catch (e: any) {
      setLog(e?.message || "Erreur me");
    }
  }

  async function openLatest() {
    try {
      const list = await gmailActions.list();
      if (!Array.isArray(list) || list.length === 0) {
        setLog("Pas de messages.");
        return;
      }
      const firstId = list[0].id as string;
      setOpenId(firstId);
      setLog(`Ouvert: ${firstId}`);
    } catch (e: any) {
      setLog(e?.message || "Erreur list");
    }
  }

  async function quickSendToSelf() {
    try {
      const me = await gmailActions.me();
      const toAddr = me?.emailAddress || me?.email || "";
      if (!toAddr) throw new Error("Email 'me' introuvable");
      await gmailActions.send({
        to: toAddr,
        subject: "Test envoi (pepite)",
        html: "<p>Message de test.</p>",
      });
      setLog("Test envoyé (regarde ta boîte).");
    } catch (e: any) {
      setLog(e?.message || "Erreur d'envoi");
    }
  }

  return (
    <div className="p-2 border rounded bg-white">
      <div className="flex flex-wrap gap-2">
        <button className="px-3 py-1.5 border rounded" onClick={check}>Vérifier</button>
        <button className="px-3 py-1.5 border rounded" onClick={openLatest}>Ouvrir dernier mail (plein écran)</button>
        <button className="px-3 py-1.5 border rounded" onClick={quickSendToSelf} disabled={sending}>
          Envoyer mail test à moi
        </button>

        {/* Actions sur le message ouvert */}
        <button className="px-3 py-1.5 border rounded" onClick={startReply} disabled={!openId}>Préparer réponse</button>
        <button className="px-3 py-1.5 border rounded" onClick={startForward} disabled={!openId}>Préparer transfert</button>
        <button className="px-3 py-1.5 border rounded" onClick={openFilePicker}>Joindre</button>
        <button className="px-3 py-1.5 border rounded bg-black text-white" onClick={send} disabled={sending}>
          {sending ? "Envoi…" : "Envoyer"}
        </button>
      </div>

      {/* Inputs cachés (tu peux ignorer si tu as déjà tes propres champs) */}
      <input ref={fileRef} type="file" multiple onChange={onFilesPicked} className="hidden" />
      <div className="mt-2 text-xs text-[var(--muted)]">
        {status ? `Status: ${status} — ` : ""}{log}
        {attachments.length ? ` — ${attachments.length} PJ prête(s)` : ""}
      </div>

      {openId && <FullReader messageId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}