"use client";

import React, { useState } from "react";

type Message = {
  id: string;
  content: string;
  subject?: string;
  from?: string;
};

export default function SummarizeDebug({ message }: { message: Message }) {
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setErr(null);
    setRaw(null);
    try {
      console.log("▶️ SummarizeDebug: envoi", {
        id: message?.id,
        hasContent: !!message?.content,
        contentLen: message?.content?.length || 0,
      });
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          content: message.content,
          subject: message.subject ?? "",
          from: message.from ?? "",
        }),
      });
      const data = await res.json();
      console.log("✅ SummarizeDebug: réponse", data);
      setRaw(data);

      // Lancer mark-read sans bloquer l’UI
      fetch("/api/google/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: message.id }),
      }).catch((e) => console.warn("mark-read ignoré:", e));
    } catch (e: any) {
      console.error("❌ SummarizeDebug erreur:", e);
      setErr(e?.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <strong>Test Résumé (Debug)</strong>
        <button
          onClick={run}
          disabled={loading || !message?.content}
          style={{
            padding: "8px 12px",
            background: loading ? "#9ca3af" : "#111827",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          title={!message?.content ? "Pas de contenu" : "Générer un résumé"}
        >
          {loading ? "Analyse…" : "🧠 Résumer (Debug)"}
        </button>
      </div>

      {err && (
        <div style={{ marginTop: 12, color: "#b91c1c", background: "#fee2e2", padding: 8, borderRadius: 6 }}>
          {err}
        </div>
      )}

      {raw && (
        <pre
          style={{
            marginTop: 12,
            background: "#0b1220",
            color: "#e5e7eb",
            padding: 12,
            borderRadius: 6,
            maxHeight: 320,
            overflow: "auto",
          }}
        >
{JSON.stringify(raw, null, 2)}
        </pre>
      )}
    </div>
  );
}