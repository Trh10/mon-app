"use client";

import React, { useState } from 'react';
import { useUI, EmailLabel } from '@/store';
import { useTheme } from '@/contexts/ThemeContext';

interface LabelManagerProps {
  emailId?: string;
  onClose?: () => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
];

export const LabelManager: React.FC<LabelManagerProps> = ({ emailId, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    labels,
    emailLabels,
    addLabel,
    removeLabel,
    updateLabel,
    assignLabelToEmail,
    removeLabelFromEmail,
  } = useUI();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState({ name: '', color: PRESET_COLORS[0] });

  const emailLabelIds = emailId ? (emailLabels[emailId] || []) : [];

  const handleCreateLabel = () => {
    if (newLabel.name.trim()) {
      addLabel(newLabel);
      setNewLabel({ name: '', color: PRESET_COLORS[0] });
      setIsCreating(false);
    }
  };

  const handleToggleLabel = (labelId: string) => {
    if (!emailId) return;
    if (emailLabelIds.includes(labelId)) {
      removeLabelFromEmail(emailId, labelId);
    } else {
      assignLabelToEmail(emailId, labelId);
    }
  };

  return (
    <div className={`rounded-xl border shadow-xl overflow-hidden ${
      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isDark ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {emailId ? 'Gérer les labels' : 'Labels'}
        </h3>
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

      {/* Liste des labels */}
      <div className="p-2 max-h-64 overflow-y-auto">
        {labels.map((label) => {
          const isAssigned = emailLabelIds.includes(label.id);
          const isEditing = editingId === label.id;

          if (isEditing) {
            return (
              <EditLabelForm
                key={label.id}
                label={label}
                isDark={isDark}
                onSave={(updates) => {
                  updateLabel(label.id, updates);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
                onDelete={() => {
                  removeLabel(label.id);
                  setEditingId(null);
                }}
              />
            );
          }

          return (
            <div
              key={label.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              onClick={() => emailId && handleToggleLabel(label.id)}
            >
              {/* Checkbox si emailId fourni */}
              {emailId && (
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isAssigned
                    ? 'bg-blue-500 border-blue-500'
                    : isDark ? 'border-gray-600' : 'border-gray-300'
                }`}>
                  {isAssigned && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              )}

              {/* Badge du label */}
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: label.color + '20',
                  color: label.color,
                }}
              >
                {label.name}
              </span>

              <div className="flex-1" />

              {/* Bouton éditer */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(label.id);
                }}
                className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                  isDark ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          );
        })}

        {labels.length === 0 && !isCreating && (
          <p className={`text-center py-4 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Aucun label. Créez-en un !
          </p>
        )}
      </div>

      {/* Formulaire de création */}
      {isCreating ? (
        <div className={`p-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <input
            type="text"
            value={newLabel.name}
            onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
            placeholder="Nom du label..."
            autoFocus
            className={`w-full px-3 py-2 rounded-lg border text-sm mb-2 ${
              isDark
                ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500'
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateLabel();
              if (e.key === 'Escape') setIsCreating(false);
            }}
          />

          <div className="flex gap-1 mb-3">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewLabel({ ...newLabel, color })}
                className={`w-6 h-6 rounded-full transition-transform ${
                  newLabel.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

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
              onClick={handleCreateLabel}
              disabled={!newLabel.name.trim()}
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
          Nouveau label
        </button>
      )}
    </div>
  );
};

// Formulaire d'édition inline
const EditLabelForm: React.FC<{
  label: EmailLabel;
  isDark: boolean;
  onSave: (updates: Partial<EmailLabel>) => void;
  onCancel: () => void;
  onDelete: () => void;
}> = ({ label, isDark, onSave, onCancel, onDelete }) => {
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState(label.color);

  return (
    <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        className={`w-full px-3 py-2 rounded-lg border text-sm mb-2 ${
          isDark
            ? 'bg-gray-800 border-gray-600 text-white'
            : 'bg-white border-gray-300 text-gray-900'
        }`}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave({ name, color });
          if (e.key === 'Escape') onCancel();
        }}
      />

      <div className="flex gap-1 mb-3">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-6 h-6 rounded-full transition-transform ${
              color === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

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
          onClick={() => onSave({ name, color })}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          Sauvegarder
        </button>
      </div>
    </div>
  );
};

// Composant pour afficher les labels d'un email (inline)
export const EmailLabels: React.FC<{ emailId: string; compact?: boolean }> = ({ emailId, compact = false }) => {
  const { labels, emailLabels } = useUI();
  const emailLabelIds = emailLabels[emailId] || [];

  if (emailLabelIds.length === 0) return null;

  const assignedLabels = labels.filter(l => emailLabelIds.includes(l.id));

  return (
    <div className="flex flex-wrap gap-1">
      {assignedLabels.map((label) => (
        <span
          key={label.id}
          className={`rounded-full font-medium ${
            compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          }`}
          style={{
            backgroundColor: label.color + '20',
            color: label.color,
          }}
        >
          {label.name}
        </span>
      ))}
    </div>
  );
};

export default LabelManager;
