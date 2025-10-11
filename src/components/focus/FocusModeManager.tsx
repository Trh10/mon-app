"use client";

import { useState, useEffect, useCallback } from "react";
import { getRealtimeClient } from "../../lib/realtime/provider";
import { getNotificationManager } from "../../lib/notifications/manager";

export type FocusMode = "off" | "light" | "deep" | "dnd"; // Do Not Disturb

interface FocusSession {
  id: string;
  userId: string;
  userName: string;
  mode: FocusMode;
  startTime: number;
  endTime?: number;
  target?: string; // Objectif de la session
  plannedDuration?: number; // Durée prévue en minutes
}

interface FocusModeManagerProps {
  roomId: string;
  userId: string;
  userName: string;
  onFocusChange?: (mode: FocusMode, session?: FocusSession) => void;
}

const FOCUS_MODES = {
  off: {
    label: "Normal",
    emoji: "😊",
    description: "Mode normal, toutes les notifications",
    color: "bg-gray-100 text-gray-700"
  },
  light: {
    label: "Focus léger",
    emoji: "🎯",
    description: "Notifications importantes uniquement",
    color: "bg-yellow-100 text-yellow-700"
  },
  deep: {
    label: "Focus intense",
    emoji: "🔥",
    description: "Notifications urgentes uniquement",
    color: "bg-orange-100 text-orange-700"
  },
  dnd: {
    label: "Ne pas déranger",
    emoji: "🚫",
    description: "Aucune notification",
    color: "bg-red-100 text-red-700"
  }
};

const FOCUS_DURATIONS = [
  { minutes: 25, label: "25 min (Pomodoro)" },
  { minutes: 45, label: "45 min" },
  { minutes: 60, label: "1 heure" },
  { minutes: 90, label: "1h30" },
  { minutes: 120, label: "2 heures" },
];

export default function FocusModeManager({
  roomId,
  userId,
  userName,
  onFocusChange
}: FocusModeManagerProps) {
  const [currentMode, setCurrentMode] = useState<FocusMode>("off");
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionTarget, setSessionTarget] = useState("");
  const [plannedDuration, setPlannedDuration] = useState(25);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [teamFocusSessions, setTeamFocusSessions] = useState<FocusSession[]>([]);
  
  const rt = getRealtimeClient();
  const notificationManager = getNotificationManager();

  // Démarrer une session de focus
  const startFocusSession = useCallback(async (mode: FocusMode, target?: string, duration?: number) => {
    const session: FocusSession = {
      id: `focus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      userName,
      mode,
      startTime: Date.now(),
      target,
      plannedDuration: duration
    };

    setCurrentMode(mode);
    setCurrentSession(session);
    setShowSessionForm(false);
    setShowModeSelector(false);
    
    if (duration) {
      setTimeRemaining(duration * 60 * 1000); // Convertir en millisecondes
    }

    // Configurer les notifications selon le mode
    await configureNotifications(mode);

    // Notifier l'équipe
    await rt.trigger(roomId, "focus_session_start", {
      session,
      timestamp: Date.now()
    });

    // Notification de démarrage
    notificationManager.addNotification({
      type: 'system',
      title: 'Session de focus démarrée',
      message: `Mode "${FOCUS_MODES[mode].label}" activé${target ? ` - ${target}` : ''}`,
      priority: 'normal'
    });

    onFocusChange?.(mode, session);
  }, [userId, userName, roomId, rt, notificationManager, onFocusChange]);

  // Arrêter la session de focus
  const endFocusSession = useCallback(async () => {
    if (!currentSession) return;

    const endedSession = {
      ...currentSession,
      endTime: Date.now()
    };

    setCurrentMode("off");
    setCurrentSession(null);
    setTimeRemaining(0);

    // Restaurer les notifications normales
    await configureNotifications("off");

    // Notifier l'équipe
    await rt.trigger(roomId, "focus_session_end", {
      session: endedSession,
      timestamp: Date.now()
    });

    // Calculer la durée effective
    const duration = Math.round((endedSession.endTime! - endedSession.startTime) / 60000);
    
    // Notification de fin
    notificationManager.addNotification({
      type: 'system',
      title: 'Session de focus terminée',
      message: `Durée: ${duration} minutes${endedSession.target ? ` - ${endedSession.target}` : ''}`,
      priority: 'normal'
    });

    onFocusChange?.("off");
  }, [currentSession, roomId, rt, notificationManager, onFocusChange]);

  // Configurer les notifications selon le mode
  const configureNotifications = useCallback(async (mode: FocusMode) => {
    const settings = {
      off: { enableSounds: true, enableDesktop: true, priorityFilter: 'none' },
      light: { enableSounds: true, enableDesktop: true, priorityFilter: 'high' },
      deep: { enableSounds: false, enableDesktop: true, priorityFilter: 'urgent' },
      dnd: { enableSounds: false, enableDesktop: false, priorityFilter: 'urgent' }
    };

    const config = settings[mode];
    
    // Configurer le gestionnaire de notifications
    notificationManager.updateSettings({
      sounds: config.enableSounds,
      desktop: config.enableDesktop,
      // TODO: Implémenter le filtrage par priorité
    });
  }, [notificationManager]);

  // Timer pour les sessions avec durée
  useEffect(() => {
    if (timeRemaining <= 0 || !currentSession) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          // Fin automatique de la session
          endFocusSession();
          
          // Notification de fin de timer
          notificationManager.addNotification({
            type: 'system',
            title: '⏰ Temps écoulé !',
            message: 'Votre session de focus est terminée',
            priority: 'high'
          });
          
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, currentSession, endFocusSession, notificationManager]);

  // Écouter les sessions d'équipe
  useEffect(() => {
    const unsubscribeStart = rt.subscribe(roomId, "focus_session_start", (data: any) => {
      if (data.session.userId !== userId) {
        setTeamFocusSessions(prev => [...prev, data.session]);
      }
    });

    const unsubscribeEnd = rt.subscribe(roomId, "focus_session_end", (data: any) => {
      if (data.session.userId !== userId) {
        setTeamFocusSessions(prev => 
          prev.filter(session => session.id !== data.session.id)
        );
      }
    });

    return () => {
      unsubscribeStart();
      unsubscribeEnd();
    };
  }, [roomId, userId, rt]);

  // Formater le temps restant
  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="focus-mode-manager">
      {/* Indicateur de mode actuel */}
      <div className="relative">
        <button
          onClick={() => setShowModeSelector(!showModeSelector)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            FOCUS_MODES[currentMode].color
          }`}
        >
          <span className="text-lg">{FOCUS_MODES[currentMode].emoji}</span>
          <div className="text-left">
            <div className="text-sm font-medium">{FOCUS_MODES[currentMode].label}</div>
            {timeRemaining > 0 && (
              <div className="text-xs opacity-75">
                ⏱️ {formatTimeRemaining(timeRemaining)}
              </div>
            )}
          </div>
          <span className="text-xs opacity-50">▼</span>
        </button>

        {/* Menu de sélection */}
        {showModeSelector && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-64">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
                Mode de concentration
              </div>
              
              {Object.entries(FOCUS_MODES).map(([mode, config]) => (
                <button
                  key={mode}
                  onClick={() => {
                    if (mode === "off") {
                      if (currentSession) {
                        endFocusSession();
                      }
                    } else {
                      setShowSessionForm(true);
                      setCurrentMode(mode as FocusMode);
                    }
                    setShowModeSelector(false);
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-3 text-sm rounded-md hover:bg-gray-50 transition-colors ${
                    currentMode === mode ? "bg-blue-50 border-l-4 border-blue-500" : ""
                  }`}
                >
                  <span className="text-lg">{config.emoji}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{config.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{config.description}</div>
                  </div>
                  {currentMode === mode && (
                    <div className="text-blue-500">✓</div>
                  )}
                </button>
              ))}
            </div>

            {/* Sessions d'équipe actives */}
            {teamFocusSessions.length > 0 && (
              <div className="border-t p-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
                  Équipe en focus ({teamFocusSessions.length})
                </div>
                {teamFocusSessions.map(session => (
                  <div key={session.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                    <span>{FOCUS_MODES[session.mode].emoji}</span>
                    <span className="flex-1">{session.userName}</span>
                    <span className="text-gray-500">
                      {Math.round((Date.now() - session.startTime) / 60000)}min
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clic à l'extérieur pour fermer */}
        {showModeSelector && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowModeSelector(false)}
          />
        )}
      </div>

      {/* Modal de configuration de session */}
      {showSessionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {FOCUS_MODES[currentMode].emoji} Démarrer {FOCUS_MODES[currentMode].label}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Objectif de cette session (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Finir le rapport, Coder la fonctionnalité..."
                  value={sessionTarget}
                  onChange={(e) => setSessionTarget(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Durée (optionnel)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FOCUS_DURATIONS.map(duration => (
                    <button
                      key={duration.minutes}
                      onClick={() => setPlannedDuration(duration.minutes)}
                      className={`px-3 py-2 text-sm rounded border ${
                        plannedDuration === duration.minutes
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-gray-50 border-gray-300"
                      }`}
                    >
                      {duration.label}
                    </button>
                  ))}
                </div>
                
                <div className="mt-2">
                  <input
                    type="number"
                    placeholder="Minutes personnalisées"
                    value={plannedDuration}
                    onChange={(e) => setPlannedDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    min="1"
                    max="480"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm font-medium mb-1">Ce mode fera :</div>
                <div className="text-xs text-gray-600">
                  {FOCUS_MODES[currentMode].description}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => startFocusSession(
                  currentMode,
                  sessionTarget || undefined,
                  plannedDuration || undefined
                )}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
              >
                Démarrer
              </button>
              <button
                onClick={() => setShowSessionForm(false)}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session active - contrôles rapides */}
      {currentSession && currentMode !== "off" && (
        <div className="mt-2 p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              {currentSession.target && (
                <div className="font-medium">{currentSession.target}</div>
              )}
              <div className="text-gray-500">
                Démarré à {new Date(currentSession.startTime).toLocaleTimeString()}
              </div>
            </div>
            
            <button
              onClick={endFocusSession}
              className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
            >
              Terminer
            </button>
          </div>
          
          {timeRemaining > 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.max(0, (timeRemaining / (plannedDuration * 60 * 1000)) * 100)}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
