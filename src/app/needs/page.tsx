"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { getCurrentUserRole } from "@/lib/roles";
import type { NeedRequest, NeedRole } from "@/lib/needs/types";
import { subscribeMyRequests, subscribeQueueForRole } from "@/lib/needs/firestore";
import NeedRequestForm from "@/components/needs/NeedRequestForm";
import NeedRequestCard from "@/components/needs/NeedRequestCard";

export default function NeedsPage() {
  const [role, setRole] = useState<NeedRole>("employee");
  const [mine, setMine] = useState<NeedRequest[]>([]);
  const [queue, setQueue] = useState<NeedRequest[]>([]);

  useEffect(() => {
    let unsubMine: any, unsubQueue: any;
    async function init() {
      const r = await getCurrentUserRole();
      setRole(r);
      const uid = auth.currentUser?.uid || "";
      if (uid) {
        unsubMine = subscribeMyRequests(uid, setMine);
      }
      unsubQueue = subscribeQueueForRole(r, setQueue);
    }
    init();
    return () => {
      unsubMine?.();
      unsubQueue?.();
    };
  }, []);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Etat de besoins</h1>
        <div className="text-sm text-gray-600">Rôle: <span className="font-medium">{role}</span></div>
      </div>

      {/* Création (Employé) */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded p-4 bg-white">
          <h2 className="font-medium mb-3">Nouvelle demande</h2>
          <NeedRequestForm />
        </div>

        <div className="border rounded p-4 bg-white">
          <h2 className="font-medium mb-3">Ma file</h2>
          <div className="space-y-3">
            {mine.length === 0 && <div className="text-sm text-gray-500">Aucune demande pour l’instant.</div>}
            {mine.map((r) => (<NeedRequestCard key={r.id} req={r} role={role} />))}
          </div>
        </div>
      </div>

      {/* File de validation selon rôle */}
      <div className="border rounded p-4 bg-white">
        <h2 className="font-medium mb-3">
          {role === "manager" ? "A valider (Manager)"
            : role === "admin" ? "A valider (Administration)"
            : role === "finance" ? "A valider/Exécuter (Finance)"
            : "Demandes en attente (info)"}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {queue.length === 0 && <div className="text-sm text-gray-500">Rien à traiter.</div>}
          {queue.map((r) => (<NeedRequestCard key={r.id} req={r} role={role} />))}
        </div>
      </div>
    </div>
  );
}