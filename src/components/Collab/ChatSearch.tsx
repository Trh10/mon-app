"use client";

import { useState, useEffect, useMemo } from 'react';

type Message = {
  id: string;
  text: string;
  user: { id: string; name: string; role: string };
  ts: number;
  reactions?: Record<string, string[]>;
  isEdited?: boolean;
  replyTo?: string;
};

interface ChatSearchProps {
  messages: Message[];
  onSelectMessage?: (message: Message) => void;
  onClose?: () => void;
  placeholder?: string;
}

export function ChatSearch({ 
  messages, 
  onSelectMessage, 
  onClose, 
  placeholder = "Rechercher dans les messages..." 
}: ChatSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Charger l'historique de recherche depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chat-search-history');
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
    }
  }, []);

  // Sauvegarder l'historique de recherche
  const saveSearchHistory = (newQuery: string) => {
    if (!newQuery.trim()) return;
    
    const updated = [newQuery, ...searchHistory.filter(q => q !== newQuery)].slice(0, 10);
    setSearchHistory(updated);
    
    try {
      localStorage.setItem('chat-search-history', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  };

  // Filtrage intelligent des messages
  const filteredMessages = useMemo(() => {
    if (!query.trim()) return [];

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return messages
      .filter(message => {
        const searchText = `${message.text} ${message.user.name}`.toLowerCase();
        
        // Recherche AND : tous les termes doivent être présents
        return searchTerms.every(term => {
          // Recherche exacte entre guillemets
          if (term.startsWith('"') && term.endsWith('"')) {
            const exactTerm = term.slice(1, -1);
            return searchText.includes(exactTerm);
          }
          
          // Recherche normale
          return searchText.includes(term);
        });
      })
      .sort((a, b) => {
        // Priorité aux messages récents
        const recencyScore = (b.ts - a.ts) / 1000000;
        
        // Score de pertinence basé sur la position des termes
        const aRelevance = calculateRelevanceScore(a, searchTerms);
        const bRelevance = calculateRelevanceScore(b, searchTerms);
        
        return (bRelevance + recencyScore) - (aRelevance + recencyScore);
      })
      .slice(0, 50); // Limiter à 50 résultats pour les performances
  }, [messages, query]);

  // Calcul du score de pertinence
  const calculateRelevanceScore = (message: Message, terms: string[]): number => {
    let score = 0;
    const text = message.text.toLowerCase();
    const userName = message.user.name.toLowerCase();
    
    terms.forEach(term => {
      // Bonus si le terme est au début du message
      if (text.startsWith(term)) score += 3;
      // Bonus si le terme est dans le nom d'utilisateur
      if (userName.includes(term)) score += 2;
      // Bonus pour les correspondances exactes de mots
      if (text.includes(` ${term} `) || text.includes(`${term} `) || text.includes(` ${term}`)) {
        score += 2;
      }
      // Score de base pour toute correspondance
      const matches = (text.match(new RegExp(term, 'g')) || []).length;
      score += matches;
    });
    
    return score;
  };

  // Gestion du clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredMessages.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredMessages[selectedIndex]) {
        handleSelectMessage(filteredMessages[selectedIndex]);
      } else if (query.trim()) {
        saveSearchHistory(query);
      }
    } else if (e.key === 'Escape') {
      onClose?.();
    }
  };

  const handleSelectMessage = (message: Message) => {
    saveSearchHistory(query);
    onSelectMessage?.(message);
    setQuery("");
    setSelectedIndex(-1);
  };

  const highlightText = (text: string, searchQuery: string): JSX.Element => {
    if (!searchQuery.trim()) return <span>{text}</span>;

    const terms = searchQuery.toLowerCase().split(' ').filter(term => term.length > 0);
    let highlightedText = text;

    terms.forEach(term => {
      const cleanTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${cleanTerm})`, 'gi');
      highlightedText = highlightedText.replace(regex, '**$1**');
    });

    const parts = highlightedText.split(/\*\*(.*?)\*\*/g);
    
    return (
      <span>
        {parts.map((part, index) => 
          index % 2 === 1 ? (
            <mark key={index} className="bg-yellow-200 px-1 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="relative">
      {/* Barre de recherche */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus
        />
        
        {/* Icône de recherche */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Bouton de fermeture */}
        <button
          onClick={onClose}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Suggestions d'historique de recherche */}
      {!query && searchHistory.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 text-xs font-medium text-gray-500 border-b">Recherches récentes</div>
          {searchHistory.slice(0, 5).map((historyQuery, index) => (
            <button
              key={index}
              onClick={() => setQuery(historyQuery)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {historyQuery}
            </button>
          ))}
        </div>
      )}

      {/* Résultats de recherche */}
      {query && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {filteredMessages.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <svg className="h-8 w-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.329-1.232-5.412-2.96L3 12l3.588-.04A7.962 7.962 0 0112 9c2.34 0 4.329 1.232 5.412 2.96L21 12l-3.588.04z" />
              </svg>
              Aucun message trouvé pour "{query}"
            </div>
          ) : (
            <>
              <div className="p-2 text-xs font-medium text-gray-500 border-b">
                {filteredMessages.length} résultat{filteredMessages.length > 1 ? 's' : ''} trouvé{filteredMessages.length > 1 ? 's' : ''}
              </div>
              {filteredMessages.map((message, index) => (
                <button
                  key={message.id}
                  onClick={() => handleSelectMessage(message)}
                  className={`w-full px-3 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                    index === selectedIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">
                          {message.user.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {message.user.role}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(message.ts).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 line-clamp-2">
                        {highlightText(message.text, query)}
                      </div>
                      {message.reactions && Object.keys(message.reactions).length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {Object.entries(message.reactions).map(([emoji, users]) => (
                            <span key={emoji} className="text-xs bg-gray-100 px-1 rounded">
                              {emoji} {users.length}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Instructions d'utilisation */}
      {query && (
        <div className="mt-2 text-xs text-gray-500">
          <div className="flex flex-wrap gap-4">
            <span>↑↓ Naviguer</span>
            <span>↵ Sélectionner</span>
            <span>Esc Fermer</span>
            <span>"terme" Recherche exacte</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook pour la recherche avancée avec filtres
export function useAdvancedChatSearch(messages: Message[]) {
  const [filters, setFilters] = useState({
    user: '',
    dateFrom: '',
    dateTo: '',
    hasReactions: false,
    hasFiles: false
  });

  const filteredMessages = useMemo(() => {
    return messages.filter(message => {
      // Filtre par utilisateur
      if (filters.user && !message.user.name.toLowerCase().includes(filters.user.toLowerCase())) {
        return false;
      }

      // Filtre par date
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        if (message.ts < fromDate.getTime()) return false;
      }
      
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (message.ts > toDate.getTime()) return false;
      }

      // Filtre par réactions
      if (filters.hasReactions && (!message.reactions || Object.keys(message.reactions).length === 0)) {
        return false;
      }

      // Filtre par fichiers (à implémenter selon votre structure de données)
      if (filters.hasFiles) {
        // Logique pour détecter les messages avec fichiers
        if (!message.text.includes('📎') && !message.text.includes('Fichier')) {
          return false;
        }
      }

      return true;
    });
  }, [messages, filters]);

  return {
    filters,
    setFilters,
    filteredMessages,
    resetFilters: () => setFilters({
      user: '',
      dateFrom: '',
      dateTo: '',
      hasReactions: false,
      hasFiles: false
    })
  };
}
