'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook qui envoie un heartbeat au serveur toutes les 2 minutes
 * pour maintenir le statut "En ligne" de l'utilisateur
 */
export function usePresenceHeartbeat(enabled: boolean = true) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const sendHeartbeat = async () => {
      try {
        const response = await fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.warn('[Presence] Heartbeat failed:', response.status);
        }
      } catch (error) {
        console.warn('[Presence] Heartbeat error:', error);
      }
    };

    // Envoyer immédiatement au montage
    sendHeartbeat();

    // Puis toutes les 1 minute pour une meilleure réactivité
    intervalRef.current = setInterval(sendHeartbeat, 60 * 1000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled]);
}
