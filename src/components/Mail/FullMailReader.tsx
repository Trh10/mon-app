"use client";

import { useEffect, useState, useRef } from "react";
import { X, Reply, Forward, Archive, Trash2, Star, Download, Paperclip, Send } from "lucide-react";

// Le type a été ajusté pour correspondre aux données de notre API
type EmailDetail = {
  id: string;
  threadId?: string;
  headers: {
    subject: string;
    from: string;
    to: string;
    date: string;
  };
  bodyHtml: string;
  bodyText: string;
  attachments: Array<{
    attachmentId: string;
    filename: string;
    mimeType: string;
    size: number;
    url: string;
  }>;
};

export function FullEmailReader({ 
  messageId, 
  onClose,
  onArchive,
  onDelete 
}: { 
  messageId: string; 
  onClose: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}) {
  const [data, setData] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMessage() {
    if (!messageId) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/google/message?id=${messageId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }
      const detail = await response.json();

      // --- NOTRE ESPION EST ICI ---
      console.log("Données reçues de l'API :", detail);
      // ----------------------------
      
      const emailData = {
        id: detail.id,
        threadId: detail.threadId,
        headers: {
          subject: detail.subject || "Sans sujet",
          from: detail.from || "Inconnu",
          to: detail.to || "Inconnu",
          date: detail.date ? new Date(detail.date).toLocaleString('fr-FR') : "Date inconnue",
        },
        bodyHtml: detail.bodyHtml || detail.body || "<p>Aucun contenu disponible.</p>",
        bodyText: detail.body || "",
        attachments: detail.attachments || [],
      };

      setData(emailData as EmailDetail);

    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessage();
  }, [messageId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-gray-600">Chargement du message...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Erreur: {error}</div>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Fermer</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
        <h1 className="font-semibold text-lg truncate max-w-md">{data.headers.subject}</h1>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2 shrink-0">
        {/* Actions */}
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-700 space-y-1">
            <div><strong>De:</strong> {data.headers.from}</div>
            <div><strong>À:</strong> {data.headers.to}</div>
            <div><strong>Date:</strong> {data.headers.date}</div>
          </div>
        </div>
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: data.bodyHtml }} />
      </div>
    </div>
  );
}