"use client";

import { useState } from "react";
import { extractFromGmailMessage } from "../../lib/mail/extract";
import { openAIPaneWith } from "../../lib/ai/ui";

export default function GmailResumeButton({
  message,
  lang = "fr",
  className,
}: {
  message: any; // Gmail Message
  lang?: "fr" | "en";
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function summarize() {
    console.debug("[GmailResumeButton] message reçu:", message?.id || message);
    const { subject, bodyHtml, bodyText } = extractFromGmailMessage(message || {});
    console.debug("[GmailResumeButton] extrait:", { subject, hasHtml: !!bodyHtml, hasText: !!bodyText });

    if (!subject && !bodyHtml && !bodyText) {
      alert("Impossible d'extraire le contenu de ce mail.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, bodyHtml, bodyText, lang }),
      });
      const data = await res.json();
      console.debug("[GmailResumeButton] /api/ai/summarize ->", res.status, data);

      // Parsing robuste selon diverses formes
      const summary =
        data?.summary ??
        data?.text ??
        data?.content ??
        data?.result ??
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        "";

      const highlights = data?.highlights ?? data?.key_points ?? data?.bullets ?? [];
      const actions = data?.actions ?? data?.next_steps ?? [];

      if (!res.ok || !summary?.trim()) {
        alert(data?.error || "Résumé indisponible");
        return;
      }

      // Ouvre le panneau IA
      openAIPaneWith({
        source: "email",
        subject,
        summary,
        highlights,
        actions,
        language: data?.language || lang,
      });
      console.debug("[GmailResumeButton] Résumé OK → panneau IA ouvert");
    } catch (e) {
      console.error("[GmailResumeButton] Erreur réseau:", e);
      alert("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={summarize}
      disabled={loading}
      className={className || "px-2 py-1 rounded-md border hover:bg-gray-50 text-sm"}
      title="Résumer cet email avec l'IA"
    >
      {loading ? "Résumé…" : "Résumer"}
    </button>
  );
}