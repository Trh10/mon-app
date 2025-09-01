"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getRealtimeClient } from "../../lib/realtime/provider";
import { getNotificationManager } from "../../lib/notifications/manager";

interface CallUser {
  id: string;
  name: string;
  role: string;
  stream?: MediaStream;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
}

interface CallManagerProps {
  roomId: string;
  userId: string;
  userName: string;
  onCallStateChange?: (isInCall: boolean) => void;
}

export default function CallManager({
  roomId,
  userId,
  userName,
  onCallStateChange
}: CallManagerProps) {
  const [isInCall, setIsInCall] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callUsers, setCallUsers] = useState<CallUser[]>([]);
  const [incomingCall, setIncomingCall] = useState<{from: string, fromName: string} | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const rt = getRealtimeClient();

  // Configuration WebRTC
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Démarrer un appel
  const startCall = useCallback(async (withVideo = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo
      });
      
      setLocalStream(stream);
      setIsInCall(true);
      setIsVideoMuted(!withVideo);
      onCallStateChange?.(true);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Notifier les autres utilisateurs
      await rt.trigger(roomId, "call_start", {
        fromUserId: userId,
        fromUserName: userName,
        hasVideo: withVideo,
        timestamp: Date.now()
      });

      // Notification système
      const notificationManager = getNotificationManager();
      notificationManager.addNotification({
        type: 'call',
        title: 'Appel démarré',
        message: withVideo ? 'Appel vidéo en cours' : 'Appel audio en cours',
        priority: 'high'
      });

    } catch (error) {
      console.error("Erreur lors du démarrage de l'appel:", error);
      alert("Impossible d'accéder au microphone/caméra");
    }
  }, [roomId, userId, userName, rt, onCallStateChange]);

  // Rejoindre un appel
  const joinCall = useCallback(async (withVideo = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo
      });
      
      setLocalStream(stream);
      setIsInCall(true);
      setIsVideoMuted(!withVideo);
      setIncomingCall(null);
      onCallStateChange?.(true);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Notifier qu'on rejoint l'appel
      await rt.trigger(roomId, "call_join", {
        userId,
        userName,
        hasVideo: withVideo,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error("Erreur lors de l'adhésion à l'appel:", error);
      alert("Impossible d'accéder au microphone/caméra");
    }
  }, [roomId, userId, userName, rt, onCallStateChange]);

  // Terminer l'appel
  const endCall = useCallback(() => {
    // Fermer le stream local
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Fermer toutes les connexions peer
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    // Nettoyer les références vidéo
    remoteVideosRef.current.clear();
    
    setIsInCall(false);
    setCallUsers([]);
    setIncomingCall(null);
    setIsScreenSharing(false);
    onCallStateChange?.(false);

    // Notifier la fin d'appel
    rt.trigger(roomId, "call_end", {
      userId,
      userName,
      timestamp: Date.now()
    });

  }, [localStream, roomId, userId, userName, rt, onCallStateChange]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
        
        // Notifier le changement
        rt.trigger(roomId, "call_audio_toggle", {
          userId,
          isMuted: !audioTrack.enabled
        });
      }
    }
  }, [localStream, roomId, userId, rt]);

  // Toggle vidéo
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
        
        // Notifier le changement
        rt.trigger(roomId, "call_video_toggle", {
          userId,
          isMuted: !videoTrack.enabled
        });
      }
    }
  }, [localStream, roomId, userId, rt]);

  // Partage d'écran
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        // Remplacer le track vidéo
        if (localStream) {
          const videoTrack = screenStream.getVideoTracks()[0];
          const sender = peerConnections.current.values().next().value?.getSenders()
            .find((s: RTCRtpSender) => s.track?.kind === 'video');
          
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }
        
        setIsScreenSharing(true);
        
        // Notification
        rt.trigger(roomId, "screen_share_start", {
          userId,
          userName
        });

        // Arrêter le partage quand l'utilisateur clique sur "stop"
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          rt.trigger(roomId, "screen_share_end", { userId });
        };

      } else {
        // Arrêter le partage d'écran
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        
        const sender = peerConnections.current.values().next().value?.getSenders()
          .find((s: RTCRtpSender) => s.track?.kind === 'video');
        
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
        
        setIsScreenSharing(false);
        rt.trigger(roomId, "screen_share_end", { userId });
      }
    } catch (error) {
      console.error("Erreur partage d'écran:", error);
    }
  }, [isScreenSharing, localStream, roomId, userId, userName, rt]);

  // Écouter les événements d'appel
  useEffect(() => {
    const unsubscribeCallStart = rt.subscribe(roomId, "call_start", (data: any) => {
      if (data.fromUserId !== userId) {
        setIncomingCall({
          from: data.fromUserId,
          fromName: data.fromUserName
        });
        
        // Notification d'appel entrant
        const notificationManager = getNotificationManager();
        notificationManager.addNotification({
          type: 'call',
          title: 'Appel entrant',
          message: `${data.fromUserName} vous appelle`,
          priority: 'urgent'
        });
      }
    });

    const unsubscribeCallEnd = rt.subscribe(roomId, "call_end", (data: any) => {
      if (data.userId !== userId) {
        setCallUsers(prev => prev.filter(user => user.id !== data.userId));
      }
    });

    return () => {
      unsubscribeCallStart();
      unsubscribeCallEnd();
    };
  }, [roomId, userId, rt]);

  return (
    <div className="call-manager">
      {/* Interface d'appel entrant */}
      {incomingCall && !isInCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="text-2xl mb-2">📞</div>
              <h3 className="text-lg font-semibold mb-2">Appel entrant</h3>
              <p className="text-gray-600 mb-4">{incomingCall.fromName} vous appelle</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => joinCall(false)}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  🎤 Audio
                </button>
                <button
                  onClick={() => joinCall(true)}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                  📹 Vidéo
                </button>
                <button
                  onClick={() => setIncomingCall(null)}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                  ❌ Refuser
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interface d'appel en cours */}
      {isInCall && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">En appel</span>
            </div>
            <button
              onClick={endCall}
              className="text-red-500 hover:bg-red-50 p-1 rounded"
              title="Terminer l'appel"
            >
              📞❌
            </button>
          </div>

          {/* Vidéo locale */}
          {!isVideoMuted && (
            <div className="mb-3">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                className="w-full h-24 bg-gray-100 rounded object-cover"
              />
            </div>
          )}

          {/* Contrôles d'appel */}
          <div className="flex gap-2">
            <button
              onClick={toggleAudio}
              className={`flex-1 px-3 py-2 rounded text-sm ${
                isAudioMuted 
                  ? "bg-red-100 text-red-700" 
                  : "bg-green-100 text-green-700"
              }`}
            >
              {isAudioMuted ? "🔇" : "🎤"}
            </button>
            
            <button
              onClick={toggleVideo}
              className={`flex-1 px-3 py-2 rounded text-sm ${
                isVideoMuted 
                  ? "bg-red-100 text-red-700" 
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {isVideoMuted ? "📹❌" : "📹"}
            </button>
            
            <button
              onClick={toggleScreenShare}
              className={`flex-1 px-3 py-2 rounded text-sm ${
                isScreenSharing 
                  ? "bg-purple-100 text-purple-700" 
                  : "bg-gray-100 text-gray-700"
              }`}
              title="Partager l'écran"
            >
              {isScreenSharing ? "🖥️✅" : "🖥️"}
            </button>
          </div>

          {/* Liste des participants */}
          {callUsers.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs text-gray-600 mb-2">Participants ({callUsers.length + 1})</div>
              {callUsers.map(user => (
                <div key={user.id} className="flex items-center gap-2 text-sm py-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{user.name}</span>
                  {user.isAudioMuted && <span className="text-red-500">🔇</span>}
                  {user.isVideoMuted && <span className="text-red-500">📹❌</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Boutons pour démarrer un appel */}
      {!isInCall && !incomingCall && (
        <div className="flex gap-2">
          <button
            onClick={() => startCall(false)}
            className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
            title="Démarrer appel audio"
          >
            🎤 Appel Audio
          </button>
          <button
            onClick={() => startCall(true)}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
            title="Démarrer appel vidéo"
          >
            📹 Appel Vidéo
          </button>
        </div>
      )}
    </div>
  );
}
