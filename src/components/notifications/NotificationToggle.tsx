"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useNotification } from "./NotificationProvider";

export function NotificationToggle() {
  const { isEnabled, toggleNotifications } = useNotification();

  return (
    <button
      onClick={toggleNotifications}
      className={`p-2 rounded-lg transition-colors ${
        isEnabled
          ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
      title={isEnabled ? "Désactiver les notifications sonores" : "Activer les notifications sonores"}
    >
      {isEnabled ? (
        <Volume2 className="w-4 h-4" />
      ) : (
        <VolumeX className="w-4 h-4" />
      )}
    </button>
  );
}
