"use client";

import { useState } from "react";
import { auth } from "@lib/firebase";
import { createNeedRequest, submitNeedRequest } from "@lib/needs/firestore";

export default function NeedRequestForm({ onCreated }: { onCreated?: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [currency, setCurrency] = useState("XOF");
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSubmit, setAutoSubmit] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Vérifie la connexion pour éviter un addDoc bloqué par les règles
    if (!auth.currentUser) {
      setError("Veuillez vous connecter pour créer une demande.");
      return;
    }

    setLoading(true);
    try {
      const id = await createNeedRequest({ title, description, amount, currency, justification });
      // Petite pause pour laisser Firestore indexer (évite edge-cases)
      if (autoSubmit) {
        await submitNeedRequest(id);
      }
      onCreated?.(id);
      setTitle(""); setDescription(""); setAmount(undefined); setJustification("");
    } catch (err: any) {
      console.error("NeedRequestForm error:", err);
      setError(err?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleCreate} className="space-y-3">
      <div>
        <label className="text-sm font-medium">Objet du besoin</label>
        <input className="mt-1 w-full border rounded px-3 py-2" required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex: Laptop pour nouveau développeur" />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea className="mt-1 w-full border rounded px-3 py-2" required rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Détaille le besoin et l'urgence..." />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="text-sm font-medium">Montant</label>
          <input type="number" min={0} className="mt-1 w-full border rounded px-3 py-2" value={amount ?? ""} onChange={e=>setAmount(e.target.value ? Number(e.target.value) : undefined)} placeholder="ex: 350000" />
        </div>
        <div>
          <label className="text-sm font-medium">Devise</label>
          <select className="mt-1 w-full border rounded px-3 py-2" value={currency} onChange={e=>setCurrency(e.target.value)}>
            <option>XOF</option><option>EUR</option><option>USD</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Justification</label>
        <textarea className="mt-1 w-full border rounded px-3 py-2" rows={2} value={justification} onChange={e=>setJustification(e.target.value)} placeholder="Ex: Remplacement matériel HS, projet urgent..." />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={autoSubmit} onChange={e=>setAutoSubmit(e.target.checked)} />
          Soumettre automatiquement après la création
        </label>
        <button disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          {loading ? "Envoi..." : "Créer le besoin"}
        </button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </form>
  );
}