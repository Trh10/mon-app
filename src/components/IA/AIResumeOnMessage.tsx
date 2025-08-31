"use client";

import { useEffect, useRef } from "react";
import { extractFromGmailMessage } from "../../lib/mail/extract";
import { openAIPaneWith } from "../../lib/ai/ui";

export default function AIResumeOnMessage({
  message,
  lang = "fr",
  auto = true,
}: {
  message: any; // Objet Gmail Message (JSON)
  lang?: "fr" | "en";
  auto?: boolean; // true = résume automatiquement à chaque changement d'email
}) {
  const lastId = useRef<string | null>(null);
  const running = useRef(false);

  useEffect(() => {
    if (!auto || !message) return;
    const id = message?.id || null;
    if (!id || id === lastId.current) return;

    lastId.current = id;

    const { subject, bodyHtml, bodyText } = extractFromGmailMessage(message);
    if (!subject && !bodyHtml && !bodyText) {
      console.debug("[AIResumeOnMessage] Rien à résumer (pas de contenu)");
      return;
    }

    if (running.current) return;
    running.current = true;

    (async () => {
      try {
        console.debug("[AIResumeOnMessage] Résumé en cours pour:", id, { hasHtml: !!bodyHtml, hasText: !!bodyText });
        const res = await fetch("/api/ai/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, bodyHtml, bodyText, lang }),
        });
        const data = await res.json();
        console.debug("[AIResumeOnMessage] /api/ai/summarize ->", res.status, data);

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
          console.debug("[AIResumeOnMessage] Résumé indisponible pour", id);
          return;
        }

        openAIPaneWith({
          source: "email",
          subject,
          summary,
          highlights,
          actions,
          language: data?.language || lang,
        });
        console.debug("[AIResumeOnMessage] Panneau IA ouvert pour", id);
      } catch (e) {
        console.error("[AIResumeOnMessage] Erreur:", e);
      } finally {
        running.current = false;
      }
    })();
  }, [message?.id, auto, lang]);

  return null;
}