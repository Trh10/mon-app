"use client";

import React, { useEffect, useMemo, useState } from "react";
import ChatPanelEnhanced from "./ChatPanelEnhanced";
import CallManager from "../calls/CallManager";
import CollaborativeWhiteboard from "../whiteboard/CollaborativeWhiteboard";
import RealtimeTaskManager from "../tasks/RealtimeTaskManager";
import { getRealtimeClient } from "../../lib/realtime/provider";

type Role = "chef" | "manager" | "assistant" | "employe";
type TeamMember = { id: string; name: string; role: Role; status?: string };

export default function CollabPanel({
  roomId,
  userId,
  userName,
  role,
  onClose,
}: {
  roomId: string;
  userId: string;
  userName: string;
  role: Role;
  onClose?: () => void;
}) {
  const rt = getRealtimeClient();

  // Synchroniser l'identité utilisateur
  useEffect(() => {
    rt.setUser({ id: userId, name: userName, role });
  }, [rt, userId, userName, role]);

  const [connectedUsers, setConnectedUsers] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "whiteboard" | "tasks" | "calls">("chat");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isInCall, setIsInCall] = useState(false);

  // Suivre la présence
  useEffect(() => {
    const unsubscribe1 = rt.subscribe(roomId, "presence", (data) => {
      console.log('👥 Presence event:', data);
      if (Array.isArray(data?.members)) {
        setConnectedUsers(data.members.filter((u: any) => u?.id && u?.name));
      }
    });

    const unsubscribe2 = rt.subscribe(roomId, "presence:join", (data) => {
      console.log('✅ User joined:', data);
      if (Array.isArray(data?.members)) {
        setConnectedUsers(data.members.filter((u: any) => u?.id && u?.name));
      }
    });

    const unsubscribe3 = rt.subscribe(roomId, "presence:leave", (data) => {
      console.log('❌ User left:', data);
      if (Array.isArray(data?.members)) {
        setConnectedUsers(data.members.filter((u: any) => u?.id && u?.name));
      }
    });

    const unsubscribe4 = rt.subscribe(roomId, "presence:state", (data) => {
      console.log('📊 Presence state:', data);
      if (Array.isArray(data?.members)) {
        setConnectedUsers(data.members.filter((u: any) => u?.id && u?.name));
      }
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
    };
  }, [rt, roomId]);

  const roleColor = (r: string) => {
    switch (r) {
      case 'chef': return 'from-red-500 to-rose-600';
      case 'manager': return 'from-blue-500 to-indigo-600';
      case 'assistant': return 'from-green-500 to-emerald-600';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-[480px] flex flex-col bg-white shadow-2xl"
    >
      {/* Header simplifié et moderne */}
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-xl">�</span>
          </div>
          <div>
            <div className="font-semibold text-lg">Collaboration</div>
            <div className="text-xs text-white/80">{connectedUsers.length} en ligne</div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            ✕
          </button>
        )}
      </div>

      {/* Membres connectés - horizontal scroll simple */}
      {connectedUsers.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-b">
          <div className="flex gap-3 overflow-x-auto pb-1" style={{scrollbarWidth:'thin'}}>
            {connectedUsers.map(u => (
              <button
                key={u.id}
                onClick={() => {
                  // Ne pas ouvrir un DM avec soi-même
                  if (String(u.id) === String(userId)) return;
                  setSelectedMember(u);
                  setActiveTab('chat');
                }}
                className="flex flex-col items-center gap-1 min-w-[64px] group"
                title={`${u.name} (${u.role})`}
              >
                <div className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${roleColor(u.role)} text-white flex items-center justify-center text-sm font-bold shadow-md group-hover:scale-110 transition-transform`}>
                  {u.name.slice(0,2).toUpperCase()}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white"></span>
                </div>
                <span className="text-[10px] text-gray-600 truncate max-w-[64px]">{u.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs simplifiés */}
      <div className="px-4 py-3 bg-white border-b">
        <div className="flex gap-2">
          {[
            { id: "chat", label: "Chat", emoji: "💬" },
            { id: "whiteboard", label: "Tableau", emoji: "🎨" },
            { id: "tasks", label: "Tâches", emoji: "✓" },
            { id: "calls", label: "Appels", emoji: "📞" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="mr-1.5">{tab.emoji}</span>
              {tab.label}
              {tab.id === "calls" && isInCall && (
                <span className="ml-2 w-2 h-2 bg-green-400 rounded-full inline-block animate-pulse"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        {activeTab === "chat" && (
          <div className="h-full">
            <ChatPanelEnhanced
              roomId={roomId}
              userId={userId}
              user={userName}
              role={role}
              height={600}
              initialDmTarget={selectedMember ? { id: selectedMember.id, name: selectedMember.name } : undefined}
              onContextUpdate={(ctx) => {
                // Si on revient sur le Général, on efface le membre sélectionné
                if (ctx.mode === "room") {
                  setSelectedMember(null);
                }
              }}
            />
          </div>
        )}

        {activeTab === "whiteboard" && (
          <div className="p-4 h-full flex items-center justify-center">
            <CollaborativeWhiteboard
              roomId={roomId}
              userId={userId}
              userName={userName}
              width={420}
              height={500}
            />
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="h-full">
            <RealtimeTaskManager
              roomId={roomId}
              userId={userId}
              userName={userName}
              userRole={role}
              compact={false}
            />
          </div>
        )}

        {activeTab === "calls" && (
          <div className="p-6">
            <CallManager
              roomId={roomId}
              userId={userId}
              userName={userName}
              onCallStateChange={setIsInCall}
            />
          </div>
        )}
      </div>
    </div>
  );
}