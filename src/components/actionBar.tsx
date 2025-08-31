"use client";

import { useState } from "react";
import type { Email } from "@lib/types";

type Props = {
  onMessagesLoaded?: (items: Email[]) => void; // optionnel: callback si tu veux récupérer les mails chargés
  className?: string;
};

export function ActionBar({ onMessagesLoaded, className }: Props) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  async function checkConnection() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/google/me", { cache: "no-store" });
      if (res.ok) {
        setConnected(true);
        setMessage("Connecté à Gmail");
      } else {
        setConnected(false);
        const t = await res.text().catch(() => "");
        setMessage(`Pas connecté (${res.status})${t ? `: ${t}` : ""}`);
      }
    } catch (e: any) {
      setConnected(false);
      setMessage(e?.message || "Erreur de connexion");
    } finally {
      setBusy(false);
    }
  }

  function connect() {
    // Redirige vers le flow OAuth
    window.location.href = "/api/google/auth";
  }

  async function disconnect() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConnected(false);
      setCount(null);
      setMessage("Déconnecté de Gmail");
    } catch (e: any) {
      setMessage(e?.message || "Erreur de déconnexion");
    } finally {
      setBusy(false);
    }
  }

  async function loadMessages() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/google/list", { cache: "no-store" });
      if (res.status === 401) {
        setConnected(false);
        setMessage("Pas connecté. Clique sur “Se connecter à Gmail”.");
        return;
      }
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${t ? `: ${t}` : ""}`);
      }
      const items = (await res.json()) as Email[];
      setConnected(true);
      setCount(items.length);
      setMessage(`Messages chargés: ${items.length}`);
      onMessagesLoaded?.(items);
      // À ce stade, tu peux stocker items où tu veux (store, state parent, etc.)
    } catch (e: any) {
      setMessage(e?.message || "Erreur de chargement");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={connect}
          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
          disabled={busy}
          title="Démarre l'authentification Gmail"
        >
          Se connecter à Gmail
        </button>

        <button
          type="button"
          onClick={checkConnection}
          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
          disabled={busy}
          title="Vérifie l'état de connexion"
        >
          Vérifier la connexion
        </button>

        <button
          type="button"
          onClick={loadMessages}
          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
          disabled={busy}
          title="Charge les 20 derniers messages"
        >
          Charger les messages
        </button>

        <button
          type="button"
          onClick={disconnect}
          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 text-red-600 border-red-300"
          disabled={busy}
          title="Supprime le cookie et déconnecte Gmail"
        >
          Déconnexion
        </button>

        {connected !== null && (
          <span
            className={`ml-2 text-sm ${connected ? "text-green-600" : "text-[var(--muted)]"}`}
            title="État de connexion détecté côté serveur"
          >
            {connected ? "Connecté" : "Non connecté"}
          </span>
        )}

        {typeof count === "number" && (
          <span className="ml-2 text-sm text-[var(--muted)]">({count} messages)</span>
        )}
      </div>

      {message && (
        <div className="mt-2 text-xs text-[var(--muted)]">
          {message}
        </div>
      )}
    </div>
  );
}