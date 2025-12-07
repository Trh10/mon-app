"use client";

import React from 'react';
import { LoadingProgress } from '@/components/ui/LoadingProgress';
import { FocusModeBanner, KeyboardShortcutsProvider } from '@/components/ui/FocusMode';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Composant qui initialise les raccourcis clavier globaux
const KeyboardShortcutsInitializer: React.FC = () => {
  useKeyboardShortcuts();
  return null;
};

interface GlobalFeaturesProviderProps {
  children: React.ReactNode;
}

export const GlobalFeaturesProvider: React.FC<GlobalFeaturesProviderProps> = ({ children }) => {
  return (
    <KeyboardShortcutsProvider>
      <KeyboardShortcutsInitializer />
      <LoadingProgress />
      <FocusModeBanner />
      {children}
    </KeyboardShortcutsProvider>
  );
};

export default GlobalFeaturesProvider;
