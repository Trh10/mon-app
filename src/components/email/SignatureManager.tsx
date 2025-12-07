"use client";

import React, { useState } from 'react';
import { useUI, EmailSignature } from '@/store';
import { useTheme } from '@/contexts/ThemeContext';

interface SignatureManagerProps {
  onSelect?: (signature: EmailSignature) => void;
  onClose?: () => void;
}

export const SignatureManager: React.FC<SignatureManagerProps> = ({ onSelect, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    signatures,
    activeSignatureId,
    addSignature,
    removeSignature,
    updateSignature,
    setActiveSignature,
  } = useUI();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSignature, setNewSignature] = useState({ name: '', content: '', isDefault: false });

  const handleCreateSignature = () => {
    if (newSignature.name.trim() && newSignature.content.trim()) {
      addSignature(newSignature);
      setNewSignature({ name: '', content: '', isDefault: false });
      setIsCreating(false);
    }
  };

  return (
    <div className={`rounded-xl border shadow-xl overflow-hidden w-[420px] ${
      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isDark ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Signatures
          </h3>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Gérez vos signatures email
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

      {/* Liste des signatures */}
      <div className="p-2 max-h-96 overflow-y-auto">
        {signatures.map((signature) => {
          if (editingId === signature.id) {
            return (
              <EditSignatureForm
                key={signature.id}
                signature={signature}
                isDark={isDark}
                onSave={(updates) => {
                  updateSignature(signature.id, updates);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
                onDelete={() => {
                  removeSignature(signature.id);
                  setEditingId(null);
                }}
              />
            );
          }

          const isActive = activeSignatureId === signature.id;

          return (
            <div
              key={signature.id}
              className={`group p-3 rounded-lg cursor-pointer transition-all ${
                isActive
                  ? isDark ? 'bg-blue-500/20 ring-1 ring-blue-500' : 'bg-blue-50 ring-1 ring-blue-500'
                  : isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              onClick={() => {
                setActiveSignature(signature.id);
                onSelect?.(signature);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {signature.name}
                    </span>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500 text-white">
                        Active
                      </span>
                    )}
                    {signature.isDefault && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                      }`}>
                        Par défaut
                      </span>
                    )}
                  </div>
                  <pre className={`text-xs mt-2 font-sans whitespace-pre-wrap line-clamp-3 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {signature.content}
                  </pre>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(signature.id);
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

        {signatures.length === 0 && !isCreating && (
          <p className={`text-center py-6 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Aucune signature.
            <br />
            Créez votre première signature !
          </p>
        )}
      </div>

      {/* Formulaire de création */}
      {isCreating ? (
        <div className={`p-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <input
            type="text"
            value={newSignature.name}
            onChange={(e) => setNewSignature({ ...newSignature, name: e.target.value })}
            placeholder="Nom de la signature (ex: Professionnelle)"
            autoFocus
            className={`w-full px-3 py-2 rounded-lg border text-sm mb-2 ${
              isDark
                ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500'
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
          <textarea
            value={newSignature.content}
            onChange={(e) => setNewSignature({ ...newSignature, content: e.target.value })}
            placeholder="Cordialement,&#10;Votre nom&#10;votre@email.com&#10;+33 1 23 45 67 89"
            rows={5}
            className={`w-full px-3 py-2 rounded-lg border text-sm mb-2 resize-none font-mono ${
              isDark
                ? 'bg-gray-900 border-gray-600 text-white placeholder-gray-500'
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
          <label className={`flex items-center gap-2 mb-3 cursor-pointer ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <input
              type="checkbox"
              checked={newSignature.isDefault}
              onChange={(e) => setNewSignature({ ...newSignature, isDefault: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm">Définir comme signature par défaut</span>
          </label>
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
              onClick={handleCreateSignature}
              disabled={!newSignature.name.trim() || !newSignature.content.trim()}
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
          Nouvelle signature
        </button>
      )}
    </div>
  );
};

// Formulaire d'édition
const EditSignatureForm: React.FC<{
  signature: EmailSignature;
  isDark: boolean;
  onSave: (updates: Partial<EmailSignature>) => void;
  onCancel: () => void;
  onDelete: () => void;
}> = ({ signature, isDark, onSave, onCancel, onDelete }) => {
  const [name, setName] = useState(signature.name);
  const [content, setContent] = useState(signature.content);
  const [isDefault, setIsDefault] = useState(signature.isDefault);

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
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        className={`w-full px-3 py-2 rounded-lg border text-sm mb-2 resize-none font-mono ${
          isDark
            ? 'bg-gray-800 border-gray-600 text-white'
            : 'bg-white border-gray-300 text-gray-900'
        }`}
      />
      <label className={`flex items-center gap-2 mb-3 cursor-pointer ${
        isDark ? 'text-gray-300' : 'text-gray-700'
      }`}>
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
        />
        <span className="text-sm">Signature par défaut</span>
      </label>
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
          onClick={() => onSave({ name, content, isDefault })}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          Sauvegarder
        </button>
      </div>
    </div>
  );
};

// Sélecteur de signature compact
export const SignatureSelector: React.FC<{
  onSelect: (signature: EmailSignature) => void;
}> = ({ onSelect }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { signatures, activeSignatureId } = useUI();
  const [isOpen, setIsOpen] = useState(false);

  const activeSignature = signatures.find(s => s.id === activeSignatureId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
          isDark
            ? 'hover:bg-gray-700 text-gray-400'
            : 'hover:bg-gray-100 text-gray-600'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        <span>{activeSignature?.name || 'Signature'}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute bottom-full left-0 mb-1 w-56 rounded-lg border shadow-lg ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {signatures.map((signature) => (
            <button
              key={signature.id}
              onClick={() => {
                onSelect(signature);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                signature.id === activeSignatureId
                  ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                  : isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span>{signature.name}</span>
              {signature.id === activeSignatureId && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SignatureManager;
