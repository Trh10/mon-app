"use client";

import React, { useState } from 'react';
import { useUI, QuickReply } from '@/store';
import { useTheme } from '@/contexts/ThemeContext';

interface QuickRepliesProps {
  onSelect?: (content: string) => void;
  onClose?: () => void;
}

export const QuickReplies: React.FC<QuickRepliesProps> = ({ onSelect, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    quickReplies,
    addQuickReply,
    removeQuickReply,
    updateQuickReply,
  } = useUI();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newReply, setNewReply] = useState({ title: '', content: '', shortcut: '' });

  const handleCreateReply = () => {
    if (newReply.title.trim() && newReply.content.trim()) {
      addQuickReply(newReply);
      setNewReply({ title: '', content: '', shortcut: '' });
      setIsCreating(false);
    }
  };

  return (
    <div className={`rounded-xl border shadow-xl overflow-hidden w-96 ${
      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isDark ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Réponses rapides
          </h3>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Utilisez Alt+1, Alt+2... pour insérer
          </p>
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

      {/* Liste des réponses */}
      <div className="p-2 max-h-80 overflow-y-auto">
        {quickReplies.map((reply, index) => {
          if (editingId === reply.id) {
            return (
              <EditReplyForm
                key={reply.id}
                reply={reply}
                isDark={isDark}
                onSave={(updates) => {
                  updateQuickReply(reply.id, updates);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
                onDelete={() => {
                  removeQuickReply(reply.id);
                  setEditingId(null);
                }}
              />
            );
          }

          return (
            <div
              key={reply.id}
              className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              onClick={() => onSelect?.(reply.content)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {reply.title}
                    </span>
                    {index < 9 && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                      }`}>
                        Alt+{index + 1}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {reply.content}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(reply.id);
                  }}
                  className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                    isDark ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}

        {quickReplies.length === 0 && !isCreating && (
          <p className={`text-center py-6 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Aucune réponse rapide.
            <br />
            Créez-en pour gagner du temps !
          </p>
        )}
      </div>

      {/* Formulaire de création */}
      {isCreating ? (
        <div className={`p-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <input
            type="text"
            value={newReply.title}
            onChange={(e) => setNewReply({ ...newReply, title: e.target.value })}
            placeholder="Titre (ex: Remerciement)"
            autoFocus
            className={`w-full px-3 py-2 rounded-lg border text-sm mb-2 ${
              isDark
                ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500'
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
          <textarea
            value={newReply.content}
            onChange={(e) => setNewReply({ ...newReply, content: e.target.value })}
            placeholder="Contenu de la réponse..."
            rows={3}
            className={`w-full px-3 py-2 rounded-lg border text-sm mb-2 resize-none ${
              isDark
                ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500'
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setIsCreating(false)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Annuler
            </button>
            <button
              onClick={handleCreateReply}
              disabled={!newReply.title.trim() || !newReply.content.trim()}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Créer
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 border-t text-sm font-medium transition-colors ${
            isDark
              ? 'border-gray-700 text-blue-400 hover:bg-gray-700'
              : 'border-gray-200 text-blue-500 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle réponse rapide
        </button>
      )}
    </div>
  );
};

// Formulaire d'édition
const EditReplyForm: React.FC<{
  reply: QuickReply;
  isDark: boolean;
  onSave: (updates: Partial<QuickReply>) => void;
  onCancel: () => void;
  onDelete: () => void;
}> = ({ reply, isDark, onSave, onCancel, onDelete }) => {
  const [title, setTitle] = useState(reply.title);
  const [content, setContent] = useState(reply.content);

  return (
    <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        className={`w-full px-3 py-2 rounded-lg border text-sm mb-2 ${
          isDark
            ? 'bg-gray-800 border-gray-600 text-white'
            : 'bg-white border-gray-300 text-gray-900'
        }`}
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className={`w-full px-3 py-2 rounded-lg border text-sm mb-2 resize-none ${
          isDark
            ? 'bg-gray-800 border-gray-600 text-white'
            : 'bg-white border-gray-300 text-gray-900'
        }`}
      />
      <div className="flex gap-2">
        <button
          onClick={onDelete}
          className="px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
        >
          Supprimer
        </button>
        <div className="flex-1" />
        <button
          onClick={onCancel}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          Annuler
        </button>
        <button
          onClick={() => onSave({ title, content })}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          Sauvegarder
        </button>
      </div>
    </div>
  );
};

export default QuickReplies;
