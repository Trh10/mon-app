"use client";
import { useState } from 'react';
import { Reply, ReplyAll, Forward, Archive, Trash2, Star, MoreHorizontal, Download, Flag } from 'lucide-react';

interface EmailActionsProps {
  emailId: string;
  onReply: (emailId: string) => void;
  onReplyAll: (emailId: string) => void;
  onForward: (emailId: string) => void;
  onArchive: (emailId: string) => void;
  onDelete: (emailId: string) => void;
  onStar: (emailId: string) => void;
  onFlag: (emailId: string) => void;
  onDownload: (emailId: string) => void;
  compact?: boolean;
}

export function EmailActions({ 
  emailId, 
  onReply, 
  onReplyAll, 
  onForward, 
  onArchive, 
  onDelete, 
  onStar, 
  onFlag, 
  onDownload,
  compact = false 
}: EmailActionsProps) {
  const [showMore, setShowMore] = useState(false);

  const buttonClass = compact 
    ? "p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
    : "p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors";

  const iconSize = compact ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className="flex items-center space-x-1">
      {/* Actions principales */}
      <button
        onClick={() => onReply(emailId)}
        className={buttonClass}
        title="Répondre"
      >
        <Reply className={iconSize} />
      </button>

      <button
        onClick={() => onReplyAll(emailId)}
        className={buttonClass}
        title="Répondre à tous"
      >
        <ReplyAll className={iconSize} />
      </button>

      <button
        onClick={() => onForward(emailId)}
        className={buttonClass}
        title="Transférer"
      >
        <Forward className={iconSize} />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-2"></div>

      <button
        onClick={() => onArchive(emailId)}
        className={buttonClass}
        title="Archiver"
      >
        <Archive className={iconSize} />
      </button>

      <button
        onClick={() => onDelete(emailId)}
        className={`${buttonClass} text-red-600 hover:text-red-800 hover:bg-red-50`}
        title="Supprimer"
      >
        <Trash2 className={iconSize} />
      </button>

      <button
        onClick={() => onStar(emailId)}
        className={`${buttonClass} text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50`}
        title="Marquer comme important"
      >
        <Star className={iconSize} />
      </button>

      {/* Menu plus d'actions */}
      <div className="relative">
        <button
          onClick={() => setShowMore(!showMore)}
          className={buttonClass}
          title="Plus d'actions"
        >
          <MoreHorizontal className={iconSize} />
        </button>

        {showMore && (
          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px]">
            <button
              onClick={() => {
                onFlag(emailId);
                setShowMore(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <Flag className="w-4 h-4" />
              <span>Marquer</span>
            </button>
            
            <button
              onClick={() => {
                onDownload(emailId);
                setShowMore(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger</span>
            </button>
            
            <div className="border-t border-gray-200 my-1"></div>
            
            <button
              onClick={() => {
                // Action marquer comme spam
                setShowMore(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Marquer comme spam
            </button>
          </div>
        )}
      </div>
    </div>
  );
}