"use client";
import React, { useState } from "react";

export default function SuggestedReplies({ subject, from, content }: { subject?: string; from?: string; content: string }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<{ text: string; tone: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/ai/suggest-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, from, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur");
      setItems(data.suggestions || []);
    } catch (e: any) {
      setError(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 8, marginTop: 8 }}>
      <button onClick={load} disabled={loading} style={{ padding: "6px 10px" }}>
        {loading ? "Chargement…" : "💬 Réponses suggérées"}
      </button>
      {error && <div style={{ color: "#b91c1c", marginTop: 8 }}>{error}</div>}
      {items.length > 0 && (
        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
          {items.map((s, i) => (
            <li key={i}>
              <span style={{ color: "#6b7280" }}>[{s.tone}]</span> {s.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}