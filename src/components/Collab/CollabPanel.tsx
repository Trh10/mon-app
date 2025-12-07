"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle, Send, Users, X, Smile, Lock, Image, FileText, Mic, Play, Pause,
  User, Phone, Video, PhoneOff, MicOff, VideoOff, Minimize2, ChevronUp
} from "lucide-react";
import { getRealtimeClient } from "@/lib/realtime/provider";

type Role = "chef" | "manager" | "assistant" | "employe";

interface TeamMember {
  id: string;
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
  isVoice?: boolean;
  voiceDuration?: number;
  attachments?: Array<{
    type: "image" | "file";
    name: string;
    url: string;
    size?: number;
  }>;
}

interface CallState {
  active: boolean;
  type: "voice" | "video";
  startTime: number;
  muted: boolean;
  videoOff: boolean;
  minimized: boolean;
  participants: string[];
}

const EMOJI_CATEGORIES = {
  smileys: {
    label: "Smileys",
    emojis: ["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]
  },
  people: {
    label: "Personnes",
    emojis: ["","","","","","","","","","","","","","","","","","","","","","","","","","",""]
  },
  hearts: {
    label: "Coeurs",
    emojis: ["","","","","","","","","","","","","","","","","","","","",""]
  },
  objects: {
    label: "Objets",
    emojis: ["","","","","","","","","","","","","","","","","","","",""]
  },
  food: {
    label: "Nourriture",
    emojis: ["","","","","","","","","","","","","","","","","","","",""]
  }
};

function VoiceMessagePlayer({ duration }: { duration: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return p + (100 / duration);
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  return (
    <div className="flex items-center gap-2 bg-[#1f2c33] rounded-lg px-3 py-2 min-w-[200px]">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="p-1.5 rounded-full bg-[#00a884] hover:bg-[#06cf9c]"
      >
        {isPlaying ? <Pause className="w-3 h-3 text-white" /> : <Play className="w-3 h-3 text-white" />}
      </button>
      <div className="flex-1">
        <div className="h-1 bg-gray-600 rounded-full overflow-hidden">
          <div className="h-full bg-[#00a884] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <span className="text-xs text-gray-400">{duration}s</span>
    </div>
  );
}

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState("smileys");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-full left-0 mb-2 bg-[#1f2c33] rounded-lg shadow-xl border border-[#2a3942] w-[280px] sm:w-[320px] overflow-hidden z-50">
      <div className="flex border-b border-[#2a3942] overflow-x-auto">
        {Object.entries(EMOJI_CATEGORIES).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`px-2 sm:px-3 py-2 text-xs whitespace-nowrap ${activeCategory === key ? "bg-[#00a884] text-white" : "text-gray-400 hover:bg-[#2a3942]"}`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="p-2 h-[180px] overflow-y-auto">
        <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].emojis.map((emoji, i) => (
            <button
              key={i}
              onClick={() => { onSelect(emoji); onClose(); }}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-[#2a3942] rounded text-lg sm:text-xl"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CollabPanel({
  roomId,
  userId,
  userName,
  role,
  onClose,
  initialPrivateChat,
  initialCall
}: {
  roomId: string;
  userId: string;
  userName: string;
  role: Role;
  onClose: () => void;
  initialPrivateChat?: any;
  initialCall?: any;
}) {
  const user: TeamMember = {
    id: userId,
    odoo_id: userId,
    name: userName,
    role: role
  };
  
  const [teamMembers] = useState<TeamMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPresence, setShowPresence] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [attachments, setAttachments] = useState<Array<{ type: "image" | "file"; name: string; file: File }>>([]);
  const [call, setCall] = useState<CallState | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    }
    return () => { clearInterval(interval); setRecordingTime(0); };
  }, [isRecording]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (call?.active) {
      interval = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => { clearInterval(interval); setCallDuration(0); };
  }, [call?.active]);

  useEffect(() => {
    const client = getRealtimeClient();
    if (!client) return;

    client.connect(roomId, user.id, user.name, user.role);

    const handlePresenceState = (data: { users: Array<{ odoo_id: string }> }) => {
      if (data.users) {
        setOnlineUsers(new Set(data.users.map(u => String(u.odoo_id))));
      }
    };

    const handlePresenceJoin = (data: { odoo_id: string }) => {
      setOnlineUsers(prev => new Set([...prev, String(data.odoo_id)]));
    };

    const handlePresenceLeave = (data: { odoo_id: string }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(String(data.odoo_id));
        return newSet;
      });
    };

    const handleChat = (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    };

    client.on("presence:state", handlePresenceState);
    client.on("presence:join", handlePresenceJoin);
    client.on("presence:leave", handlePresenceLeave);
    client.on("chat", handleChat);

    return () => {
      client.off("presence:state", handlePresenceState);
      client.off("presence:join", handlePresenceJoin);
      client.off("presence:leave", handlePresenceLeave);
      client.off("chat", handleChat);
      client.disconnect();
    };
  }, [roomId, user.id, user.name, user.role]);

  const safeFormatTime = useCallback((timestamp: number): string => {
    try {
      if (!timestamp || isNaN(timestamp)) return "";
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const getRoleColor = (role: Role): string => {
    switch (role) {
      case "chef": return "text-red-400";
      case "manager": return "text-blue-400";
      case "assistant": return "text-purple-400";
      case "employe": return "text-gray-400";
      default: return "text-gray-400";
    }
  };

  const getRoleBadge = (role: Role): string => {
    switch (role) {
      case "chef": return "";
      case "manager": return "";
      case "assistant": return "";
      case "employe": return "";
      default: return "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (audioChunksRef.current.length > 0) {
          sendVoiceMessage();
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Erreur micro:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = () => {
    const client = getRealtimeClient();
    if (!client) return;

    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: " Message vocal",
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      timestamp: Date.now(),
      isVoice: true,
      voiceDuration: recordingTime
    };

    client.emit("chat", message);
    setMessages(prev => [...prev, message]);
  };

  const sendMessage = () => {
    if (!input.trim() && attachments.length === 0) return;

    const client = getRealtimeClient();
    if (!client) return;

    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: input.trim(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      timestamp: Date.now(),
      attachments: attachments.map(a => ({
        type: a.type,
        name: a.name,
        url: URL.createObjectURL(a.file),
        size: a.file.size
      }))
    };

    client.emit("chat", message);
    setMessages(prev => [...prev, message]);
    setInput("");
    setAttachments([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments = Array.from(files).map(file => ({
      type,
      name: file.name,
      file
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const startCall = (type: "voice" | "video") => {
    setCall({
      active: true,
      type,
      startTime: Date.now(),
      muted: false,
      videoOff: false,
      minimized: false,
      participants: [user.name]
    });
  };

  const endCall = () => setCall(null);

  const toggleMute = () => {
    if (call) setCall({ ...call, muted: !call.muted });
  };

  const toggleVideo = () => {
    if (call) setCall({ ...call, videoOff: !call.videoOff });
  };

  const toggleMinimize = () => {
    if (call) setCall({ ...call, minimized: !call.minimized });
  };

  const onlineCount = teamMembers.filter(m => onlineUsers.has(String(m.odoo_id))).length;

  if (call?.active && !call.minimized) {
    return (
      <div className="fixed inset-0 bg-[#111b21] z-50 flex flex-col items-center justify-center">
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00a884] to-[#128c7e] flex items-center justify-center mx-auto mb-4">
            <User className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Appel {call.type === "video" ? "video" : "vocal"}</h3>
          <p className="text-gray-400">{formatDuration(callDuration)}</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full ${call.muted ? "bg-red-500" : "bg-[#2a3942]"}`}
          >
            <MicOff className="w-6 h-6 text-white" />
          </button>
          {call.type === "video" && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full ${call.videoOff ? "bg-red-500" : "bg-[#2a3942]"}`}
            >
              <VideoOff className="w-6 h-6 text-white" />
            </button>
          )}
          <button onClick={endCall} className="p-4 rounded-full bg-red-500 hover:bg-red-600">
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
          <button onClick={toggleMinimize} className="p-4 rounded-full bg-[#2a3942]">
            <Minimize2 className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto ${isMobile ? "w-full" : "w-[380px] md:w-[420px]"} bg-[#111b21] flex flex-col z-50 shadow-2xl`}>
      {/* Header */}
      <div className="bg-[#202c33] px-3 sm:px-4 py-3 flex items-center justify-between border-b border-[#2a3942]">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={onClose} className="p-1.5 hover:bg-[#2a3942] rounded-full sm:hidden">
            <ChevronUp className="w-5 h-5 text-gray-400 rotate-90" />
          </button>
          <div className="p-1.5 sm:p-2 bg-[#00a884] rounded-full">
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base">Chat Equipe</h3>
            <p className="text-xs text-gray-400">{onlineCount} en ligne</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={() => startCall("voice")} className="p-1.5 sm:p-2 hover:bg-[#2a3942] rounded-full" title="Appel vocal">
            <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          </button>
          <button onClick={() => startCall("video")} className="p-1.5 sm:p-2 hover:bg-[#2a3942] rounded-full" title="Appel video">
            <Video className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          </button>
          <button onClick={() => setShowPresence(!showPresence)} className="p-1.5 sm:p-2 hover:bg-[#2a3942] rounded-full relative" title="Presence equipe">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-[#00a884] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {onlineCount}
            </span>
          </button>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-[#2a3942] rounded-full hidden sm:block">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Presence panel */}
      {showPresence && (
        <div className="bg-[#202c33] border-b border-[#2a3942] p-3 max-h-40 overflow-y-auto">
          <h4 className="text-xs font-medium text-gray-400 mb-2">Membres en ligne</h4>
          <div className="space-y-2">
            {teamMembers.map(member => {
              const isOnline = onlineUsers.has(String(member.odoo_id));
              return (
                <div key={member.id} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-500"}`} />
                  <span className={`text-sm ${isOnline ? "text-white" : "text-gray-500"}`}>
                    {getRoleBadge(member.role)} {member.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Minimized call banner */}
      {call?.active && call.minimized && (
        <div className="bg-[#00a884] px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {call.type === "video" ? <Video className="w-4 h-4 text-white" /> : <Phone className="w-4 h-4 text-white" />}
            <span className="text-sm text-white">{formatDuration(callDuration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleMinimize} className="text-white hover:text-gray-200">
              <Minimize2 className="w-4 h-4" />
            </button>
            <button onClick={endCall} className="text-white hover:text-gray-200">
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#0b141a]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Lock className="w-10 h-10 sm:w-12 sm:h-12 mb-3 opacity-50" />
            <p className="text-center text-sm">Messages chiffres de bout en bout</p>
            <p className="text-xs text-center mt-1">Commencez a discuter avec votre equipe</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.userId === user.id;
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 ${isOwn ? "bg-[#005c4b]" : "bg-[#202c33]"}`}>
                  {!isOwn && (
                    <div className={`text-xs font-medium mb-1 ${getRoleColor(msg.userRole)}`}>
                      {getRoleBadge(msg.userRole)} {msg.userName}
                    </div>
                  )}
                  {msg.isVoice ? (
                    <VoiceMessagePlayer duration={msg.voiceDuration || 5} />
                  ) : (
                    <>
                      {msg.attachments?.map((att, idx) => (
                        <div key={idx} className="mb-2">
                          {att.type === "image" ? (
                            <img
                              src={att.url}
                              alt={att.name}
                              className="max-w-full rounded cursor-pointer"
                              onClick={() => setPreviewImage(att.url)}
                            />
                          ) : (
                            <div className="flex items-center gap-2 bg-[#1f2c33] rounded p-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-300 truncate">{att.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {msg.text && <p className="text-white text-sm break-words">{msg.text}</p>}
                    </>
                  )}
                  <div className="text-[10px] text-gray-400 text-right mt-1">{safeFormatTime(msg.timestamp)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image preview modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="bg-[#202c33] px-3 py-2 border-t border-[#2a3942]">
          <div className="flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="bg-[#2a3942] rounded px-2 py-1 flex items-center gap-2">
                {att.type === "image" ? <Image className="w-3 h-3 text-gray-400" /> : <FileText className="w-3 h-3 text-gray-400" />}
                <span className="text-xs text-gray-300 truncate max-w-[100px]">{att.name}</span>
                <button onClick={() => removeAttachment(idx)} className="text-gray-400 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-[#202c33] px-2 sm:px-3 py-2 sm:py-3 border-t border-[#2a3942]">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="relative">
            <button onClick={() => setShowEmoji(!showEmoji)} className="p-1.5 sm:p-2 hover:bg-[#2a3942] rounded-full">
              <Smile className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
            </button>
            {showEmoji && <EmojiPicker onSelect={(e) => setInput(prev => prev + e)} onClose={() => setShowEmoji(false)} />}
          </div>

          <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={(e) => handleFileSelect(e, "image")} />
          <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => handleFileSelect(e, "file")} />

          <button onClick={() => imageInputRef.current?.click()} className="p-1.5 sm:p-2 hover:bg-[#2a3942] rounded-full">
            <Image className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-1.5 sm:p-2 hover:bg-[#2a3942] rounded-full hidden sm:block">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ecrivez un message..."
            className="flex-1 bg-[#2a3942] text-white rounded-full px-3 sm:px-4 py-2 text-sm focus:outline-none placeholder:text-gray-500"
          />

          {input.trim() || attachments.length > 0 ? (
            <button onClick={sendMessage} className="p-2 sm:p-2.5 bg-[#00a884] hover:bg-[#06cf9c] rounded-full">
              <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          ) : (
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`p-2 sm:p-2.5 rounded-full ${isRecording ? "bg-red-500" : "bg-[#2a3942] hover:bg-[#3a4a52]"}`}
            >
              <Mic className={`w-4 h-4 sm:w-5 sm:h-5 ${isRecording ? "text-white animate-pulse" : "text-gray-400"}`} />
            </button>
          )}
        </div>
        {isRecording && (
          <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Enregistrement... {formatDuration(recordingTime)}
          </div>
        )}
      </div>
    </div>
  );
}
