"use client";

import { useEffect, useCallback } from 'react';
import { useUI } from '@/store';

type ShortcutAction = {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
};

export const useKeyboardShortcuts = () => {
  const {
    toggleFocusMode,
    toggleImmersiveMode,
    selectedEmailId,
    setSelectedEmailId,
    quickReplies,
  } = useUI();

  const shortcuts: ShortcutAction[] = [
    // Navigation
    { key: 'Escape', action: () => setSelectedEmailId?.(null), description: 'Fermer l\'email' },
    
    // Modes
    { key: 'f', ctrl: true, shift: true, action: toggleFocusMode, description: 'Mode Focus' },
    { key: 'F11', action: toggleImmersiveMode, description: 'Mode plein écran' },
    
    // Actions email
    { key: 'r', ctrl: true, action: () => window.dispatchEvent(new CustomEvent('email:reply')), description: 'Répondre' },
    { key: 'r', ctrl: true, shift: true, action: () => window.dispatchEvent(new CustomEvent('email:replyAll')), description: 'Répondre à tous' },
    { key: 'f', ctrl: true, action: () => window.dispatchEvent(new CustomEvent('email:forward')), description: 'Transférer' },
    { key: 'n', ctrl: true, action: () => window.dispatchEvent(new CustomEvent('email:compose')), description: 'Nouveau message' },
    { key: 'Delete', action: () => window.dispatchEvent(new CustomEvent('email:delete')), description: 'Supprimer' },
    { key: 'e', ctrl: true, action: () => window.dispatchEvent(new CustomEvent('email:archive')), description: 'Archiver' },
    
    // Recherche
    { key: '/', action: () => window.dispatchEvent(new CustomEvent('search:focus')), description: 'Rechercher' },
    { key: 'k', ctrl: true, action: () => window.dispatchEvent(new CustomEvent('search:advanced')), description: 'Recherche avancée' },
    
    // Navigation liste
    { key: 'j', action: () => window.dispatchEvent(new CustomEvent('email:next')), description: 'Email suivant' },
    { key: 'k', action: () => window.dispatchEvent(new CustomEvent('email:previous')), description: 'Email précédent' },
    { key: 'ArrowDown', action: () => window.dispatchEvent(new CustomEvent('email:next')), description: 'Email suivant' },
    { key: 'ArrowUp', action: () => window.dispatchEvent(new CustomEvent('email:previous')), description: 'Email précédent' },
    
    // Marquer
    { key: 's', action: () => window.dispatchEvent(new CustomEvent('email:star')), description: 'Marquer comme important' },
    { key: 'u', action: () => window.dispatchEvent(new CustomEvent('email:toggleRead')), description: 'Marquer lu/non lu' },
    
    // Labels
    { key: 'l', action: () => window.dispatchEvent(new CustomEvent('email:labels')), description: 'Gérer les labels' },
    
    // Réponses rapides (Alt+1, Alt+2, Alt+3)
    ...quickReplies.slice(0, 9).map((reply, index) => ({
      key: String(index + 1),
      alt: true,
      action: () => window.dispatchEvent(new CustomEvent('quickReply:insert', { detail: reply })),
      description: `Réponse rapide: ${reply.title}`,
    })),
    
    // Aide
    { key: '?', shift: true, action: () => window.dispatchEvent(new CustomEvent('shortcuts:show')), description: 'Afficher les raccourcis' },
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Vérifier que event.key existe
    if (!event.key) return;
    
    // Ne pas intercepter si on est dans un champ de texte (sauf pour certains raccourcis)
    const target = event.target as HTMLElement;
    const isEditing = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;
    
    for (const shortcut of shortcuts) {
      // Vérifier que shortcut.key existe
      if (!shortcut.key) continue;
      
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
                       event.key === shortcut.key;
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      
      // Pour les raccourcis avec modificateurs, on les autorise même en édition
      const allowInEditing = shortcut.ctrl || shortcut.alt || event.key === 'Escape' || event.key === 'F11';
      
      if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
        if (!isEditing || allowInEditing) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    }
  }, [shortcuts, toggleFocusMode, toggleImmersiveMode, setSelectedEmailId, quickReplies]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
};

// Hook pour écouter les événements de raccourcis
export const useShortcutEvent = (event: string, callback: (detail?: unknown) => void) => {
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      callback(customEvent.detail);
    };
    window.addEventListener(event, handler);
    return () => window.removeEventListener(event, handler);
  }, [event, callback]);
};
