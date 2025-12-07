"use client";

import React, { useEffect, useState } from 'react';
import { useUI } from '@/store';
import { useTheme } from '@/contexts/ThemeContext';
import { useShortcutEvent } from '@/hooks/useKeyboardShortcuts';

// Bouton pour activer/désactiver le mode Focus
export const FocusModeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { focusMode, toggleFocusMode } = useUI();

  return (
    <button
      onClick={toggleFocusMode}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
        focusMode
          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
          : isDark
            ? 'hover:bg-gray-700 text-gray-400'
            : 'hover:bg-gray-100 text-gray-600'
      } ${className}`}
      title="Mode Focus (Ctrl+Shift+F)"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {focusMode ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        )}
      </svg>
      <span className="text-sm font-medium">
        {focusMode ? 'Quitter Focus' : 'Mode Focus'}
      </span>
    </button>
  );
};

// Bouton pour le mode immersif (plein écran)
export const ImmersiveModeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { immersiveMode, toggleImmersiveMode } = useUI();

  return (
    <button
      onClick={toggleImmersiveMode}
      className={`p-2 rounded-lg transition-all ${
        immersiveMode
          ? 'bg-indigo-500 text-white'
          : isDark
            ? 'hover:bg-gray-700 text-gray-400'
            : 'hover:bg-gray-100 text-gray-600'
      } ${className}`}
      title="Mode plein écran (F11)"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {immersiveMode ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        )}
      </svg>
    </button>
  );
};

// Indicateur de mode Focus (bannière)
export const FocusModeBanner: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { focusMode, toggleFocusMode } = useUI();

  if (!focusMode) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 flex items-center justify-center gap-4 animate-in slide-in-from-top duration-300 ${
      isDark 
        ? 'bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-purple-900/90 backdrop-blur-sm' 
        : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500'
    }`}>
      <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      <span className="text-white text-sm font-medium">Mode Focus activé — Concentrez-vous sur l'essentiel</span>
      <button
        onClick={toggleFocusMode}
        className="ml-4 px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white hover:bg-white/30 transition-colors"
      >
        Quitter (Ctrl+Shift+F)
      </button>
    </div>
  );
};

// Panneau des raccourcis clavier
export const KeyboardShortcutsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const shortcutGroups = [
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['↑', '↓'], description: 'Naviguer entre les emails' },
        { keys: ['j', 'k'], description: 'Email suivant / précédent' },
        { keys: ['Entrée'], description: 'Ouvrir l\'email' },
        { keys: ['Échap'], description: 'Fermer / Retour' },
      ],
    },
    {
      title: 'Actions Email',
      shortcuts: [
        { keys: ['Ctrl', 'N'], description: 'Nouveau message' },
        { keys: ['Ctrl', 'R'], description: 'Répondre' },
        { keys: ['Ctrl', 'Shift', 'R'], description: 'Répondre à tous' },
        { keys: ['Ctrl', 'F'], description: 'Transférer' },
        { keys: ['Suppr'], description: 'Supprimer' },
        { keys: ['Ctrl', 'E'], description: 'Archiver' },
      ],
    },
    {
      title: 'Marquer',
      shortcuts: [
        { keys: ['S'], description: 'Marquer comme important' },
        { keys: ['U'], description: 'Lu / Non lu' },
        { keys: ['L'], description: 'Gérer les labels' },
      ],
    },
    {
      title: 'Recherche',
      shortcuts: [
        { keys: ['/'], description: 'Rechercher' },
        { keys: ['Ctrl', 'K'], description: 'Recherche avancée' },
      ],
    },
    {
      title: 'Modes',
      shortcuts: [
        { keys: ['Ctrl', 'Shift', 'F'], description: 'Mode Focus' },
        { keys: ['F11'], description: 'Plein écran' },
      ],
    },
    {
      title: 'Réponses Rapides',
      shortcuts: [
        { keys: ['Alt', '1-9'], description: 'Insérer réponse rapide' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Raccourcis clavier
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="grid grid-cols-2 gap-6">
            {shortcutGroups.map((group) => (
              <div key={group.title}>
                <h3 className={`text-sm font-semibold mb-3 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between gap-4">
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd className={`px-2 py-1 rounded text-xs font-mono font-semibold ${
                              isDark 
                                ? 'bg-gray-700 text-gray-300 border border-gray-600' 
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-6 pt-6 border-t text-center ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Appuyez sur <kbd className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}>?</kbd> à tout moment pour afficher ce panneau
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook wrapper pour gérer l'affichage du panneau
export const KeyboardShortcutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useShortcutEvent('shortcuts:show', () => setShowShortcuts(true));

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showShortcuts]);

  return (
    <>
      {children}
      {showShortcuts && <KeyboardShortcutsPanel onClose={() => setShowShortcuts(false)} />}
    </>
  );
};

export default FocusModeToggle;
