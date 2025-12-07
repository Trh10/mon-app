"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useUI } from '@/store';
import { useTheme } from '@/contexts/ThemeContext';
import { useShortcutEvent } from '@/hooks/useKeyboardShortcuts';

interface AdvancedSearchProps {
  onSearch?: (query: string, filters: Record<string, unknown>) => void;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ onSearch }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    searchQuery,
    searchFilters,
    setSearchQuery,
    setSearchFilters,
    clearSearch,
    labels,
  } = useUI();

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [localFilters, setLocalFilters] = useState(searchFilters);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Écouter les événements de raccourcis
  useShortcutEvent('search:focus', () => {
    searchInputRef.current?.focus();
  });

  useShortcutEvent('search:advanced', () => {
    setIsAdvancedOpen(true);
    searchInputRef.current?.focus();
  });

  useEffect(() => {
    setLocalQuery(searchQuery);
    setLocalFilters(searchFilters);
  }, [searchQuery, searchFilters]);

  const handleSearch = () => {
    setSearchQuery(localQuery);
    setSearchFilters(localFilters);
    onSearch?.(localQuery, localFilters);
  };

  const handleClear = () => {
    setLocalQuery('');
    setLocalFilters({});
    clearSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'Escape') {
      setIsAdvancedOpen(false);
    }
  };

  const updateFilter = (key: string, value: unknown) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  };

  const hasActiveFilters = Object.values(localFilters).some(v => v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true));

  return (
    <div className="relative w-full max-w-2xl">
      {/* Barre de recherche principale */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 ${
        isDark 
          ? 'bg-gray-800 border-gray-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20' 
          : 'bg-white border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
      }`}>
        {/* Icône recherche */}
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        {/* Input */}
        <input
          ref={searchInputRef}
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher dans les emails... (appuyez sur / pour focus)"
          className={`flex-1 bg-transparent border-none outline-none text-sm ${
            isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
          }`}
        />

        {/* Indicateur de filtres actifs */}
        {hasActiveFilters && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500 text-white">
            Filtres actifs
          </span>
        )}

        {/* Bouton recherche avancée */}
        <button
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className={`p-1.5 rounded-lg transition-colors ${
            isAdvancedOpen
              ? 'bg-blue-500 text-white'
              : isDark
                ? 'hover:bg-gray-700 text-gray-400'
                : 'hover:bg-gray-100 text-gray-500'
          }`}
          title="Recherche avancée (Ctrl+K)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>

        {/* Bouton effacer */}
        {(localQuery || hasActiveFilters) && (
          <button
            onClick={handleClear}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
            title="Effacer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Panneau de recherche avancée */}
      {isAdvancedOpen && (
        <div className={`absolute top-full left-0 right-0 mt-2 p-4 rounded-xl border shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Recherche avancée
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* De */}
            <div>
              <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                De
              </label>
              <input
                type="text"
                value={localFilters.from || ''}
                onChange={(e) => updateFilter('from', e.target.value)}
                placeholder="expéditeur@email.com"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDark 
                    ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>

            {/* À */}
            <div>
              <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                À
              </label>
              <input
                type="text"
                value={localFilters.to || ''}
                onChange={(e) => updateFilter('to', e.target.value)}
                placeholder="destinataire@email.com"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDark 
                    ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>

            {/* Sujet */}
            <div className="col-span-2">
              <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Sujet contient
              </label>
              <input
                type="text"
                value={localFilters.subject || ''}
                onChange={(e) => updateFilter('subject', e.target.value)}
                placeholder="Mots dans le sujet..."
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDark 
                    ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>

            {/* Date de */}
            <div>
              <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Date de début
              </label>
              <input
                type="date"
                value={localFilters.dateFrom || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDark 
                    ? 'bg-gray-900 border-gray-600 text-white' 
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
            </div>

            {/* Date à */}
            <div>
              <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Date de fin
              </label>
              <input
                type="date"
                value={localFilters.dateTo || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDark 
                    ? 'bg-gray-900 border-gray-600 text-white' 
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
            </div>

            {/* Pièce jointe */}
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.hasAttachment || false}
                  onChange={(e) => updateFilter('hasAttachment', e.target.checked || undefined)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Avec pièce jointe uniquement
                </span>
              </label>
            </div>

            {/* Labels */}
            {labels.length > 0 && (
              <div className="col-span-2">
                <label className={`text-xs font-medium mb-2 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Labels
                </label>
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) => {
                    const isSelected = localFilters.labels?.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        onClick={() => {
                          const currentLabels = localFilters.labels || [];
                          const newLabels = isSelected
                            ? currentLabels.filter(id => id !== label.id)
                            : [...currentLabels, label.id];
                          updateFilter('labels', newLabels.length > 0 ? newLabels : undefined);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          isSelected
                            ? 'ring-2 ring-offset-2 ring-blue-500'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ 
                          backgroundColor: label.color + '20',
                          color: label.color,
                          borderColor: label.color,
                        }}
                      >
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClear}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark 
                  ? 'text-gray-400 hover:bg-gray-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Effacer tout
            </button>
            <button
              onClick={() => {
                handleSearch();
                setIsAdvancedOpen(false);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              Rechercher
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;
