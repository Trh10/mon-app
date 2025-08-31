"use client";

import type { NeedRequest, NeedRole } from "@/lib/needs/types";
import { approveRequest, rejectRequest, executeRequest } from "@/lib/needs/firestore";
import { useState } from "react";
import { Check, X, Play } from "lucide-react";

export default function NeedRequestCard({ req, role }: { req: NeedRequest; role: NeedRole }) {
  const [loading, setLoading] = useState<"approve" | "reject" | "execute" | null>(null);
  const canApprove =
    (role === "manager" && req.status === "submitted") ||
    (role === "admin" && req.status === "manager_approved") ||
    (role === "finance" && (req.status === "admin_approved" || req.status === "finance_approved"));
  const canExecute = role === "finance" && req.status === "finance_approved";

  async function onApprove() {
    try {
      setLoading("approve");
      await approveRequest(req.id, role, "");
    } finally {
      setLoading(null);
    }
  }
  async function onReject() {
    const comment = prompt("Motif de refus (optionnel):") || "";
    try {
      setLoading("reject");
      await rejectRequest(req.id, role, comment);
    } finally {
      setLoading(null);
    }
  }
  async function onExecute() {
    const ref = prompt("Référence paiement (optionnel):") || "";
    try {
      setLoading("execute");
      await executeRequest(req.id, { paymentRef: ref });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="border rounded p-3 bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{req.title}</div>
          <div className="text-sm text-gray-600">{req.description}</div>
          <div className="text-xs text-gray-500 mt-1">
            {req.amount ? `${req.amount} ${req.currency || ""}` : "Montant: n/d"} • Statut: {req.status}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Demandeur: {req.createdBy?.name || req.createdBy?.email}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        {canApprove && (
          <>
            <button
              onClick={onApprove}
              disabled={loading !== null}
              className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
            >
              <Check className="w-4 h-4" /> {role === "finance" && req.status === "admin_approved" ? "Valider finance" : "Approuver"}
            </button>
            <button
              onClick={onReject}
              disabled={loading !== null}
              className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Refuser
            </button>
          </>
        )}
        {canExecute && (
          <button
            onClick={onExecute}
            disabled={loading !== null}
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
          >
            <Play className="w-4 h-4" /> Exécuter
          </button>
        )}
      </div>
    </div>
  );
}