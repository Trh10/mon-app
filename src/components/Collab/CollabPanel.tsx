"use client";

import React from "react";
import LiveCursors from "./LiveCursors";
import FloatingChat from "./FloatingChat";
import { getStableUserId } from "../../lib/realtime/provider";

type Role = "chef" | "manager" | "assistant" | "employe";

export default function CollabPanel({
  roomId = "demo-room",
  userName = "Moi",
  role = "chef" as Role, // chef par défaut pour voir l'assignation privée
  onClose,
}: {
  roomId?: string;
  userName?: string;
  role?: Role;
  onClose?: () => void;
}) {
  const userId = getStableUserId();

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-white border-l border-gray-300 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="font-semibold">Collaboration (temps réel)</div>
        <button onClick={onClose} className="px-2 py-1 rounded-md hover:bg-gray-100" title="Fermer">✕</button>
      </div>

      <div className="p-3 space-y-3 overflow-auto">
        <div className="text-xs text-gray-500">
          Bouge ta souris dans la zone pour partager ton curseur.
          Le chat flottant est déplaçable et redimensionnable. En DM (Privé), les chefs peuvent assigner des tâches.
        </div>
        <LiveCursors roomId={roomId} userId={userId} userName={userName} role={role} />
      </div>

      <FloatingChat roomId={roomId} userId={userId} userName={userName} role={role} />
    </div>
  );
}