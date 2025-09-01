"use client";

import { useState } from "react";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const COMMON_EMOJIS = [
  "👍", "👎", "❤️", "😂", "😮", "😢", "😡", "🔥", 
  "👏", "🎉", "💯", "✅", "❌", "⭐", "💡", "🚀"
];

export default function EmojiPicker({ onEmojiSelect, onClose, isOpen }: EmojiPickerProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-8 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50">
      <div className="grid grid-cols-8 gap-1">
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onEmojiSelect(emoji);
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded text-lg"
            title={`Réagir avec ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-200">
        <button
          onClick={onClose}
          className="w-full text-xs text-gray-500 hover:text-gray-700"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

interface MessageReactionsProps {
  reactions: Record<string, number>;
  onReactionAdd?: (emoji: string) => void;
  onReactionRemove?: (emoji: string) => void;
  compact?: boolean;
}

export function MessageReactions({ 
  reactions, 
  onReactionAdd, 
  onReactionRemove, 
  compact = false 
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  if (!reactions || Object.keys(reactions).length === 0) {
    return onReactionAdd ? (
      <div className="relative inline-block">
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs text-gray-400 hover:text-gray-600 p-1"
          title="Ajouter une réaction"
        >
          😀+
        </button>
        <EmojiPicker
          isOpen={showPicker}
          onEmojiSelect={onReactionAdd}
          onClose={() => setShowPicker(false)}
        />
      </div>
    ) : null;
  }

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap relative">
      {Object.entries(reactions).map(([emoji, count]) => (
        count > 0 && (
          <button
            key={emoji}
            onClick={() => onReactionRemove?.(emoji)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs hover:bg-gray-100 border ${
              compact ? "text-xs" : ""
            }`}
            title={`${count} réaction${count > 1 ? 's' : ''} ${emoji}`}
          >
            <span>{emoji}</span>
            <span className="font-medium text-gray-600">{count}</span>
          </button>
        )
      ))}
      
      {onReactionAdd && (
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs text-gray-400 hover:text-gray-600 p-1"
          title="Ajouter une réaction"
        >
          😀+
        </button>
      )}
      
      <EmojiPicker
        isOpen={showPicker}
        onEmojiSelect={onReactionAdd || (() => {})}
        onClose={() => setShowPicker(false)}
      />
    </div>
  );
}
