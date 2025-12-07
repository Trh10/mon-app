"use client";

import React from 'react';
import { useUI } from '@/store';
import { useTheme } from '@/contexts/ThemeContext';

export const LoadingProgress: React.FC = () => {
  const { isLoading, loadingProgress, loadingMessage } = useUI();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!isLoading) return null;

  return (
    <>
      {/* Barre de progression en haut de l'écran */}
      <div className="fixed top-0 left-0 right-0 z-[9999]">
        <div 
          className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
          style={{ 
            width: `${loadingProgress}%`,
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
          }}
        />
      </div>
      
      {/* Overlay optionnel avec message */}
      {loadingMessage && (
        <div className={`fixed inset-0 z-[9998] flex items-center justify-center bg-opacity-50 backdrop-blur-sm transition-all duration-300 ${
          isDark ? 'bg-gray-900/50' : 'bg-white/50'
        }`}>
          <div className={`flex flex-col items-center gap-4 p-6 rounded-2xl shadow-2xl ${
            isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            {/* Spinner animé */}
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
            </div>
            
            {/* Message */}
            <p className="text-sm font-medium animate-pulse">{loadingMessage}</p>
            
            {/* Progression */}
            <div className="w-48 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{loadingProgress}%</span>
          </div>
        </div>
      )}
    </>
  );
};

// Composant pour un spinner inline
export const InlineSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className="absolute inset-0 rounded-full border-gray-200 dark:border-gray-700" style={{ borderWidth: 'inherit' }} />
      <div className="absolute inset-0 rounded-full border-transparent border-t-blue-500 animate-spin" style={{ borderWidth: 'inherit' }} />
    </div>
  );
};

// Composant pour un skeleton loader
export const SkeletonLoader: React.FC<{ 
  width?: string; 
  height?: string; 
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}> = ({ 
  width = '100%', 
  height = '1rem', 
  className = '',
  rounded = 'md'
}) => {
  const roundedClasses = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div 
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-shimmer ${roundedClasses[rounded]} ${className}`}
      style={{ width, height }}
    />
  );
};

// Composant pour charger une liste d'emails (skeleton)
export const EmailListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-4 w-32 rounded bg-gray-300 dark:bg-gray-600" />
              <div className="h-3 w-16 rounded bg-gray-300 dark:bg-gray-600" />
            </div>
            <div className="h-4 w-48 rounded bg-gray-300 dark:bg-gray-600" />
            <div className="h-3 w-full rounded bg-gray-300 dark:bg-gray-600" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingProgress;
