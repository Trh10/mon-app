"use client";

import React, { useState } from 'react';
import { useUI, ScheduledEmail } from '@/store';
import { useTheme } from '@/contexts/ThemeContext';

interface ScheduleSendProps {
  onSchedule?: (scheduledAt: Date) => void;
  onClose?: () => void;
}

// Suggestions de planification rapides
const QUICK_OPTIONS = [
  { label: 'Dans 1 heure', hours: 1 },
  { label: 'Dans 2 heures', hours: 2 },
  { label: 'Demain matin (9h)', tomorrow: true, hour: 9 },
  { label: 'Demain après-midi (14h)', tomorrow: true, hour: 14 },
  { label: 'Lundi matin (9h)', nextMonday: true, hour: 9 },
];

export const ScheduleSend: React.FC<ScheduleSendProps> = ({ onSchedule, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');

  const getScheduledDate = (option: typeof QUICK_OPTIONS[0]): Date => {
    const now = new Date();
    
    if (option.hours) {
      return new Date(now.getTime() + option.hours * 60 * 60 * 1000);
    }
    
    if (option.tomorrow) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(option.hour || 9, 0, 0, 0);
      return tomorrow;
    }
    
    if (option.nextMonday) {
      const nextMonday = new Date(now);
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
      nextMonday.setHours(option.hour || 9, 0, 0, 0);
      return nextMonday;
    }
    
    return now;
  };

  const handleQuickOption = (option: typeof QUICK_OPTIONS[0]) => {
    const scheduledDate = getScheduledDate(option);
    onSchedule?.(scheduledDate);
  };

  const handleCustomSchedule = () => {
    if (customDate && customTime) {
      const scheduledDate = new Date(`${customDate}T${customTime}`);
      if (scheduledDate > new Date()) {
        onSchedule?.(scheduledDate);
      }
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`rounded-xl border shadow-xl overflow-hidden w-80 ${
      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isDark ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Planifier l'envoi
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Options rapides */}
      <div className="p-2">
        <p className={`text-xs font-medium px-2 mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Options rapides
        </p>
        {QUICK_OPTIONS.map((option, index) => {
          const scheduledDate = getScheduledDate(option);
          return (
            <button
              key={index}
              onClick={() => handleQuickOption(option)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                {option.label}
              </span>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {formatDate(scheduledDate)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Séparateur */}
      <div className={`flex items-center gap-3 px-4 py-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        <div className={`flex-1 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
        <span className="text-xs">ou</span>
        <div className={`flex-1 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
      </div>

      {/* Date/heure personnalisée */}
      <div className={`p-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Date et heure personnalisées
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
              isDark
                ? 'bg-gray-900 border-gray-600 text-white'
                : 'bg-gray-50 border-gray-300 text-gray-900'
            }`}
          />
          <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className={`w-28 px-3 py-2 rounded-lg border text-sm ${
              isDark
                ? 'bg-gray-900 border-gray-600 text-white'
                : 'bg-gray-50 border-gray-300 text-gray-900'
            }`}
          />
        </div>
        <button
          onClick={handleCustomSchedule}
          disabled={!customDate || !customTime}
          className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Planifier l'envoi
        </button>
      </div>
    </div>
  );
};

// Liste des emails programmés
export const ScheduledEmailsList: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { scheduledEmails, removeScheduledEmail } = useUI();

  if (scheduledEmails.length === 0) {
    return (
      <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">Aucun email programmé</p>
      </div>
    );
  }

  const formatScheduledDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-2">
      {scheduledEmails.map((email) => (
        <div
          key={email.id}
          className={`p-3 rounded-lg border transition-colors ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {email.subject || '(Sans sujet)'}
              </p>
              <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                À : {email.to}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {formatScheduledDate(email.scheduledAt)}
                </span>
              </div>
            </div>
            <button
              onClick={() => removeScheduledEmail(email.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
              title="Annuler"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ScheduleSend;
