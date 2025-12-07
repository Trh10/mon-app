"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle, Send, Users, X, Smile, Lock, Image, FileText, Mic, Play, Pause,
  User, Phone, Video, PhoneOff, MicOff, VideoOff, Minimize2, ChevronUp
} from "lucide-react";
import { getRealtimeClient } from "@/lib/realtime/provider";

type Role = "chef" | "manager" | "assistant" | "employe";

interface TeamMember {
  odoo_id: string | number;
  name: string;
  role: Role;
  typing?: boolean;
}

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userRole: Role;
  timestamp: number;
  isMe?: boolean;
  isPrivate?: boolean;
  toUserId?: string;
  toUserName?: string;
  attachmentUrl?: string;
  attachmentType?: "image" | "file";
  isVoice?: boolean;
  voiceDuration?: number;
  audioUrl?: string;
}

interface CallState {
  active: boolean;
  type: "audio" | "video";
  user: TeamMember | null;
  duration: number;
  isMuted: boolean;
  isVideoOff: boolean;
}

const EMOJI_CATEGORIES = {
  smileys: {
    label: "Smileys",
    icon: "\u{1F60A}",
    emojis: ["\u{1F600}","\u{1F603}","\u{1F604}","\u{1F601}","\u{1F606}","\u{1F605}","\u{1F602}","\u{1F923}","\u{1F60A}","\u{1F607}","\u{1F609}","\u{1F60D}","\u{1F618}","\u{1F617}","\u{1F619}","\u{1F61A}","\u{1F642}","\u{1F917}","\u{1F929}","\u{1F914}","\u{1F928}","\u{1F610}","\u{1F611}","\u{1F636}","\u{1F60F}","\u{1F612}","\u{1F644}","\u{1F62C}","\u{1F925}","\u{1F60C}","\u{1F614}","\u{1F62A}","\u{1F924}","\u{1F634}","\u{1F637}","\u{1F912}","\u{1F915}","\u{1F922}","\u{1F92E}","\u{1F927}"]
  },
  gestures: {
    label: "Gestes",
    icon: "\u{1F44D}",
    emojis: ["\u{1F44D}","\u{1F44E}","\u{1F44A}","\u{270A}","\u{1F91B}","\u{1F91C}","\u{1F44F}","\u{1F64C}","\u{1F450}","\u{1F64F}","\u{1F91D}","\u{1F485}","\u{1F4AA}","\u{1F9B5}","\u{1F9B6}","\u{1F442}","\u{1F443}","\u{1F9E0}","\u{1F9B7}","\u{1F9B4}","\u{1F440}","\u{1F441}","\u{1F445}","\u{1F444}","\u{1F476}","\u{1F9D2}","\u{1F466}","\u{1F467}","\u{1F9D1}","\u{1F468}"]
  },
  hearts: {
    label: "Coeurs",
    icon: "\u{2764}",
    emojis: ["\u{2764}","\u{1F9E1}","\u{1F49B}","\u{1F49A}","\u{1F499}","\u{1F49C}","\u{1F5A4}","\u{1F90D}","\u{1F90E}","\u{1F498}","\u{1F49D}","\u{1F496}","\u{1F497}","\u{1F493}","\u{1F49E}","\u{1F495}","\u{1F48C}","\u{1F4AF}","\u{1F4A2}","\u{1F4A5}"]
  },
  animals: {
    label: "Animaux",
    icon: "\u{1F436}",
    emojis: ["\u{1F436}","\u{1F431}","\u{1F42D}","\u{1F439}","\u{1F430}","\u{1F98A}","\u{1F43B}","\u{1F43C}","\u{1F428}","\u{1F42F}","\u{1F981}","\u{1F42E}","\u{1F437}","\u{1F438}","\u{1F435}","\u{1F648}","\u{1F649}","\u{1F64A}","\u{1F412}","\u{1F414}","\u{1F427}","\u{1F426}","\u{1F424}","\u{1F423}","\u{1F425}","\u{1F986}","\u{1F985}","\u{1F989}","\u{1F987}","\u{1F43A}"]
  },
  food: {
    label: "Nourriture",
    icon: "\u{1F354}",
    emojis: ["\u{1F34E}","\u{1F34A}","\u{1F34B}","\u{1F34C}","\u{1F349}","\u{1F347}","\u{1F353}","\u{1F348}","\u{1F352}","\u{1F351}","\u{1F34D}","\u{1F965}","\u{1F951}","\u{1F346}","\u{1F954}","\u{1F955}","\u{1F33D}","\u{1F336}","\u{1F952}","\u{1F966}","\u{1F354}","\u{1F35F}","\u{1F355}","\u{1F32D}","\u{1F96A}","\u{1F32E}","\u{1F32F}","\u{1F959}","\u{1F9C6}","\u{1F95A}"]
  },
  activities: {
    label: "Activites",
    icon: "\u{26BD}",
    emojis: ["\u{26BD}","\u{1F3C0}","\u{1F3C8}","\u{26BE}","\u{1F94E}","\u{1F3BE}","\u{1F3D0}","\u{1F3C9}","\u{1F3B1}","\u{1F3D3}","\u{1F3F8}","\u{1F3D2}","\u{1F3D1}","\u{1F94D}","\u{1F3CF}","\u{1F945}","\u{26F3}","\u{1F3BF}","\u{1F6F7}","\u{1F3C2}"]
  },
  travel: {
    label: "Voyage",
    icon: "\u{2708}",
    emojis: ["\u{1F697}","\u{1F695}","\u{1F699}","\u{1F68C}","\u{1F68E}","\u{1F3CE}","\u{1F693}","\u{1F691}","\u{1F692}","\u{1F6F5}","\u{1F6B2}","\u{1F6F4}","\u{1F6F9}","\u{1F6E4}","\u{2708}","\u{1F6EB}","\u{1F6EC}","\u{1F680}","\u{1F6F8}","\u{1F681}"]
  },
  objects: {
    label: "Objets",
    icon: "\u{1F4BB}",
    emojis: ["\u{1F4BB}","\u{1F5A5}","\u{1F5A8}","\u{1F4F1}","\u{1F4F2}","\u{260E}","\u{1F4DE}","\u{1F4DF}","\u{1F4E0}","\u{1F50B}","\u{1F50C}","\u{1F4A1}","\u{1F526}","\u{1F56F}","\u{1F5D1}","\u{1F4E6}","\u{1F4B0}","\u{1F4B3}","\u{1F48E}","\u{2696}"]
  }
};

function VoiceMessagePlayer({ duration, audioUrl }: { duration: number; audioUrl?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 bg-[#00a884]/20 p-2 rounded-lg min-w-[180px]">
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} />
      )}
      <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white">
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="h-1 bg-gray-600 rounded-full overflow-hidden">
          <div className="h-full bg-[#00a884] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-xs text-gray-400 mt-1">{formatDuration(isPlaying ? currentTime : duration)}</div>
      </div>
    </div>
  );
}

// Interface pour les membres venant du TeamPanel
interface InitialPrivateChatMember {
  id: string;
  name: string;
  role?: string;
  level?: number;
}

interface CollabPanelProps {
  roomId: string;
  userId: string;
  userName: string;
  role: Role;
  onClose?: () => void;
  initialPrivateChat?: InitialPrivateChatMember | null;
  initialCall?: { member: InitialPrivateChatMember; type: "audio" | "video" } | null;
}

export default function CollabPanel({ roomId, userId, userName, role, onClose, initialPrivateChat, initialCall }: CollabPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [privateChat, setPrivateChat] = useState<TeamMember | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState("smileys");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callState, setCallState] = useState<CallState>({ active: false, type: "audio", user: null, duration: 0, isMuted: false, isVideoOff: false });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Convertir le role texte en role collab
  const mapLevelToRole = (level?: number, roleText?: string): Role => {
    const r = (roleText || "").toLowerCase();
    if (r.includes("directeur") || r.includes("dg")) return "chef";
    if (r.includes("admin") || r.includes("financ")) return "manager";
    if (r.includes("assistant")) return "assistant";
    if (typeof level === "number") {
      if (level >= 10) return "chef";
      if (level >= 7) return "manager";
      if (level >= 5) return "assistant";
    }
    return "employe";
  };

  // Effet pour gérer initialPrivateChat (venant du Team Panel)
  useEffect(() => {
    if (initialPrivateChat) {
      const mappedMember: TeamMember = {
        odoo_id: initialPrivateChat.id,
        name: initialPrivateChat.name,
        role: mapLevelToRole(initialPrivateChat.level, initialPrivateChat.role)
      };
      setPrivateChat(mappedMember);
    }
  }, [initialPrivateChat]);

  // Effet pour gérer initialCall (venant du Team Panel)
  useEffect(() => {
    if (initialCall) {
      const mappedMember: TeamMember = {
        odoo_id: initialCall.member.id,
        name: initialCall.member.name,
        role: mapLevelToRole(initialCall.member.level, initialCall.member.role)
      };
      setPrivateChat(mappedMember);
      setCallState({
        active: true,
        type: initialCall.type,
        user: mappedMember,
        duration: 0,
        isMuted: false,
        isVideoOff: initialCall.type === "audio"
      });
    }
  }, [initialCall]);

  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    const client = getRealtimeClient();
    client.connect(roomId, userId, userName, role);
    const unsubMessage = client.on("chat", (data: Message) => {
      setMessages((prev) => [...prev, { ...data, isMe: data.userId === userId }]);
      if (data.userId !== userId && isMinimized) setUnreadCount((c) => c + 1);
    });
    const unsubPresence = client.on("presence", (data: { users: TeamMember[] }) => {
      setTeamMembers(data.users.filter((u) => String(u.odoo_id) !== String(userId)));
    });
    const unsubTyping = client.on("typing", (data: { odoo_id: string; typing: boolean }) => {
      setTeamMembers((prev) => prev.map((m) => String(m.odoo_id) === String(data.odoo_id) ? { ...m, typing: data.typing } : m));
    });
    return () => { unsubMessage(); unsubPresence(); unsubTyping(); client.disconnect(); };
  }, [roomId, userId, userName, role, isMinimized]);

  useEffect(() => {
    if (callState.active) {
      callTimerRef.current = setInterval(() => { setCallState((prev) => ({ ...prev, duration: prev.duration + 1 })); }, 1000);
    } else {
      if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [callState.active]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const client = getRealtimeClient();
    const msg: Message = { id: `msg-${Date.now()}`, text: newMessage, userId, userName, userRole: role, timestamp: Date.now(), isMe: true, isPrivate: !!privateChat, toUserId: privateChat?.odoo_id?.toString(), toUserName: privateChat?.name };
    client.emit("chat", msg);
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
    setShowEmojiPicker(false);
  };

  const addEmoji = (emoji: string) => { setNewMessage((prev) => prev + emoji); inputRef.current?.focus(); };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);
      const timer = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
      mediaRecorderRef.current.onstop = () => clearInterval(timer);
    } catch (err) { console.error("Erreur micro:", err); alert("Impossible d'acceder au microphone"); }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    setTimeout(() => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(audioBlob);
      const client = getRealtimeClient();
      const msg: Message = { id: `msg-${Date.now()}`, text: "", userId, userName, userRole: role, timestamp: Date.now(), isMe: true, isVoice: true, voiceDuration: recordingDuration, audioUrl, isPrivate: !!privateChat, toUserId: privateChat?.odoo_id?.toString(), toUserName: privateChat?.name };
      client.emit("chat", msg);
      setMessages((prev) => [...prev, msg]);
      setIsRecording(false);
    }, 100);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const url = URL.createObjectURL(file);
    const client = getRealtimeClient();
    const msg: Message = { id: `msg-${Date.now()}`, text: file.name, userId, userName, userRole: role, timestamp: Date.now(), isMe: true, attachmentUrl: url, attachmentType: isImage ? "image" : "file", isPrivate: !!privateChat, toUserId: privateChat?.odoo_id?.toString(), toUserName: privateChat?.name };
    client.emit("chat", msg);
    setMessages((prev) => [...prev, msg]);
    e.target.value = "";
  };

  const startCall = (type: "audio" | "video", member: TeamMember) => {
    setCallState({ active: true, type, user: member, duration: 0, isMuted: false, isVideoOff: false });
  };

  const endCall = () => {
    setCallState({ active: false, type: "audio", user: null, duration: 0, isMuted: false, isVideoOff: false });
  };

  const toggleMute = () => { setCallState((prev) => ({ ...prev, isMuted: !prev.isMuted })); };
  const toggleVideo = () => { setCallState((prev) => ({ ...prev, isVideoOff: !prev.isVideoOff })); };

  const formatCallDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const getRoleColor = (r: Role) => {
    const colors = { chef: "text-red-400", manager: "text-blue-400", assistant: "text-purple-400", employe: "text-gray-400" };
    return colors[r] || "text-gray-400";
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button onClick={() => { setIsMinimized(false); setUnreadCount(0); }} className="relative bg-[#00a884] hover:bg-[#00956f] text-white p-4 rounded-full shadow-lg transition-all hover:scale-105">
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{unreadCount > 9 ? "9+" : unreadCount}</span>)}
        </button>
      </div>
    );
  }

  if (callState.active) {
    return (
      <div className="fixed inset-0 bg-[#111b21] z-50 flex flex-col items-center justify-center">
        <div className="text-center">
          {callState.type === "video" && !callState.isVideoOff ? (
            <div className="w-64 h-64 bg-gray-800 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Video className="w-24 h-24 text-gray-600" />
            </div>
          ) : (
            <div className="w-32 h-32 bg-[#00a884] rounded-full flex items-center justify-center mb-6 mx-auto">
              <User className="w-16 h-16 text-white" />
            </div>
          )}
          <h2 className="text-white text-2xl font-semibold mb-2">{callState.user?.name || "Appel en cours"}</h2>
          <p className="text-gray-400 mb-2">{callState.type === "video" ? "Appel video" : "Appel audio"}</p>
          <p className="text-[#00a884] text-xl font-mono mb-8">{formatCallDuration(callState.duration)}</p>
        </div>
        <div className="flex gap-6">
          <button onClick={toggleMute} className={`p-4 rounded-full ${callState.isMuted ? "bg-red-500" : "bg-gray-700"} hover:opacity-80 transition`}>
            {callState.isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>
          {callState.type === "video" && (
            <button onClick={toggleVideo} className={`p-4 rounded-full ${callState.isVideoOff ? "bg-red-500" : "bg-gray-700"} hover:opacity-80 transition`}>
              {callState.isVideoOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
            </button>
          )}
          <button onClick={endCall} className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition">
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-[#111b21] flex flex-col z-50 shadow-2xl">
      <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {privateChat ? (
            <>
              <button onClick={() => setPrivateChat(null)} className="text-gray-400 hover:text-white">
                <ChevronUp className="w-5 h-5 rotate-[-90deg]" />
              </button>
              <div className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-medium flex items-center gap-2">
                  <Lock className="w-3 h-3 text-[#00a884]" />
                  {privateChat.name}
                </div>
                <div className={`text-xs ${getRoleColor(privateChat.role)}`}>{privateChat.role}</div>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-medium">Chat d equipe</div>
                <div className="text-xs text-gray-400">{teamMembers.length + 1} membres</div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {privateChat && (
            <>
              <button onClick={() => startCall("audio", privateChat)} className="p-2 text-gray-400 hover:text-[#00a884] hover:bg-[#2a3942] rounded-full transition" title="Appel audio">
                <Phone className="w-5 h-5" />
              </button>
              <button onClick={() => startCall("video", privateChat)} className="p-2 text-gray-400 hover:text-[#00a884] hover:bg-[#2a3942] rounded-full transition" title="Appel video">
                <Video className="w-5 h-5" />
              </button>
            </>
          )}
          <button onClick={() => setIsMinimized(true)} className="p-2 text-gray-400 hover:text-white hover:bg-[#2a3942] rounded-full transition" title="Reduire">
            <Minimize2 className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-[#2a3942] rounded-full transition" title="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!privateChat && (
        <div className="bg-[#202c33] border-t border-[#2a3942] px-4 py-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {teamMembers.map((member) => (
              <button key={String(member.odoo_id)} onClick={() => setPrivateChat(member)} className="flex flex-col items-center min-w-[60px] p-2 rounded-lg hover:bg-[#2a3942] transition">
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-300" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full border-2 border-[#202c33]" />
                </div>
                <span className="text-xs text-gray-300 mt-1 truncate max-w-[56px]">{member.name.split(" ")[0]}</span>
                {member.typing && (<span className="text-[10px] text-[#00a884]">ecrit...</span>)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23202c33' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}>
        {messages.filter((m) => {
          if (privateChat) return (m.isPrivate && ((m.userId === userId && m.toUserId === privateChat.odoo_id?.toString()) || (m.userId === privateChat.odoo_id?.toString() && m.toUserId === userId)));
          return !m.isPrivate;
        }).map((msg) => (
          <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg p-3 ${msg.isMe ? "bg-[#005c4b] text-white" : "bg-[#202c33] text-white"}`}>
              {!msg.isMe && (<div className={`text-xs font-medium mb-1 ${getRoleColor(msg.userRole)}`}>{msg.userName}</div>)}
              {msg.isVoice ? (
                <VoiceMessagePlayer duration={msg.voiceDuration || 0} audioUrl={msg.audioUrl} />
              ) : msg.attachmentUrl ? (
                <div>
                  {msg.attachmentType === "image" ? (
                    <img src={msg.attachmentUrl} alt="Image" className="max-w-full rounded-lg mb-2" />
                  ) : (
                    <a href={msg.attachmentUrl} download={msg.text} className="flex items-center gap-2 bg-[#2a3942] p-2 rounded-lg hover:bg-[#3a4952]">
                      <FileText className="w-8 h-8 text-[#00a884]" />
                      <span className="text-sm truncate">{msg.text}</span>
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
              )}
              <div className="text-[10px] text-gray-400 mt-1 text-right">{formatTime(msg.timestamp)}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {showEmojiPicker && (
        <div className="bg-[#202c33] border-t border-[#2a3942] p-3">
          <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
            {Object.entries(EMOJI_CATEGORIES).map(([key, cat]) => (
              <button key={key} onClick={() => setSelectedEmojiCategory(key)} className={`p-2 rounded-lg text-lg transition ${selectedEmojiCategory === key ? "bg-[#00a884] text-white" : "hover:bg-[#2a3942]"}`}>
                {cat.icon}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-1 max-h-[150px] overflow-y-auto">
            {EMOJI_CATEGORIES[selectedEmojiCategory as keyof typeof EMOJI_CATEGORIES]?.emojis.map((emoji, i) => (
              <button key={i} onClick={() => addEmoji(emoji)} className="text-2xl p-1 hover:bg-[#2a3942] rounded transition">
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {isRecording && (
        <div className="bg-[#202c33] border-t border-[#2a3942] px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-mono">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}</span>
            <div className="flex-1 h-8 flex items-center gap-[2px]">
              {[...Array(30)].map((_, i) => (<div key={i} className="w-1 bg-[#00a884] rounded-full animate-pulse" style={{ height: `${Math.random() * 24 + 8}px`, animationDelay: `${i * 50}ms` }} />))}
            </div>
          </div>
          <button onClick={stopRecording} className="bg-[#00a884] hover:bg-[#00956f] text-white px-4 py-2 rounded-full font-medium transition">Envoyer</button>
        </div>
      )}

      {!isRecording && (
        <div className="bg-[#202c33] border-t border-[#2a3942] px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 rounded-full transition ${showEmojiPicker ? "text-[#00a884] bg-[#2a3942]" : "text-gray-400 hover:text-[#00a884] hover:bg-[#2a3942]"}`}>
              <Smile className="w-6 h-6" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-[#00a884] hover:bg-[#2a3942] rounded-full transition">
              <Image className="w-6 h-6" />
            </button>
            <input ref={inputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder={privateChat ? `Message prive a ${privateChat.name}...` : "Tapez un message..."} className="flex-1 bg-[#2a3942] text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00a884] placeholder-gray-500" />
            {newMessage.trim() ? (
              <button onClick={sendMessage} className="p-2 bg-[#00a884] hover:bg-[#00956f] text-white rounded-full transition">
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button onMouseDown={startRecording} className="p-2 text-gray-400 hover:text-[#00a884] hover:bg-[#2a3942] rounded-full transition">
                <Mic className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
