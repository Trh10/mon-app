"use client";

import { useState, useEffect } from "react";
import { getNotificationManager, type Notification, type NotificationSettings } from "../../lib/notifications/manager";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [activeTab, setActiveTab] = useState<"notifications" | "settings">("notifications");
  const notificationManager = getNotificationManager();

  useEffect(() => {
    if (isOpen) {
      const unsubscribe = notificationManager.subscribe(setNotifications);
      setSettings(notificationManager.getSettings());
      return unsubscribe;
    }
  }, [isOpen, notificationManager]);

  const handleMarkAsRead = (id: string) => {
    notificationManager.markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    notificationManager.markAllAsRead();
  };

  const handleClear = () => {
    notificationManager.clearNotifications();
  };

  const handleSettingsChange = (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings!, ...newSettings };
    setSettings(updated);
    notificationManager.updateSettings(updated);
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      chat: "💬", mention: "🔔", file: "📎", task: "✅", call: "📞", system: "⚙️"
    };
    return icons[type as keyof typeof icons] || "📢";
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}j`;
    
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-800">Centre de Notifications</h2>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {notificationManager.getUnreadCount()} non lues
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            ✕
          </button>
        </div>

        {/* Onglets */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex-1 py-3 px-4 font-medium ${
              activeTab === "notifications" 
                ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50" 
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            📋 Notifications ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 py-3 px-4 font-medium ${
              activeTab === "settings" 
                ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50" 
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            ⚙️ Paramètres
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "notifications" ? (
            <div className="h-full flex flex-col">
              {/* Actions */}
              {notifications.length > 0 && (
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {notifications.filter(n => !n.read).length} non lues / {notifications.length} total
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={handleMarkAllAsRead}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Tout marquer lu
                    </button>
                    <button
                      onClick={handleClear}
                      className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Effacer tout
                    </button>
                  </div>
                </div>
              )}

              {/* Liste des notifications */}
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🔔</div>
                      <div>Aucune notification</div>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 hover:bg-gray-50 cursor-pointer ${
                          !notif.read ? "bg-blue-50 border-l-4 border-blue-500" : ""
                        }`}
                        onClick={() => handleMarkAsRead(notif.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">{getTypeIcon(notif.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900 truncate">
                                {notif.title}
                              </h4>
                              <span className="text-xs text-gray-500 ml-2">
                                {formatTime(notif.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notif.message}
                            </p>
                            {notif.userName && (
                              <div className="text-xs text-gray-500 mt-1">
                                de {notif.userName}
                              </div>
                            )}
                          </div>
                          {!notif.read && (
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Paramètres
            <div className="p-4 space-y-6 overflow-y-auto h-full">
              {settings && (
                <>
                  {/* Paramètres généraux */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Paramètres généraux</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.enabled}
                          onChange={(e) => handleSettingsChange({ enabled: e.target.checked })}
                          className="rounded"
                        />
                        <span>Activer les notifications</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.sounds}
                          onChange={(e) => handleSettingsChange({ sounds: e.target.checked })}
                          className="rounded"
                        />
                        <span>Sons de notification</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.desktop}
                          onChange={(e) => handleSettingsChange({ desktop: e.target.checked })}
                          className="rounded"
                        />
                        <span>Notifications bureau</span>
                      </label>
                    </div>
                  </div>

                  {/* Volume */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Volume sonore</h3>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.soundVolume}
                      onChange={(e) => handleSettingsChange({ soundVolume: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-600 mt-1">
                      {Math.round(settings.soundVolume * 100)}%
                    </div>
                  </div>

                  {/* Types de notifications */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Types de notifications</h3>
                    <div className="space-y-2">
                      {Object.entries(settings.types).map(([type, enabled]) => (
                        <label key={type} className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => handleSettingsChange({ 
                              types: { ...settings.types, [type]: e.target.checked }
                            })}
                            className="rounded"
                          />
                          <span>{getTypeIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Priorités */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Priorités</h3>
                    <div className="space-y-2">
                      {Object.entries(settings.priorities).map(([priority, enabled]) => (
                        <label key={priority} className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => handleSettingsChange({ 
                              priorities: { ...settings.priorities, [priority]: e.target.checked }
                            })}
                            className="rounded"
                          />
                          <span className={`px-2 py-1 rounded text-xs ${
                            priority === "urgent" ? "bg-red-100 text-red-700" :
                            priority === "high" ? "bg-orange-100 text-orange-700" :
                            priority === "normal" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {priority.toUpperCase()}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
