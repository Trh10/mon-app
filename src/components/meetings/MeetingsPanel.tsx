"use client";
import { useEffect, useState, useRef } from 'react';
import { FileText, Upload, Download, Trash2, X } from 'lucide-react';

type Meeting = {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
};

export default function MeetingsPanel({ onClose }: { onClose?: () => void }) {
  const [items, setItems] = useState<Meeting[]>([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/meetings', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setItems(data.items || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function uploadMeeting() {
    if (!file || !title.trim()) {
      alert('Veuillez entrer un titre et sélectionner un fichier');
      return;
    }

    // Vérifier le type de fichier
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Format non supporté. Veuillez uploader un fichier Word (.doc, .docx) ou PDF.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());

      const res = await fetch('/api/meetings/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        setTitle('');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await load();
      } else {
        const error = await res.json();
        alert(error.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  }

  async function deleteMeeting(id: string) {
    if (!confirm('Supprimer cette réunion ?')) return;
    
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
      if (res.ok) await load();
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Comptes Rendus de Réunions</h2>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Section */}
        <div className="p-5 bg-gray-50 border-b">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Titre (ex: Réunion du lundi 12 octobre)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            
            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              
              <button
                onClick={uploadMeeting}
                disabled={uploading || !file || !title.trim()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Upload...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Uploader
                  </>
                )}
              </button>
            </div>
            
            {file && (
              <div className="text-sm text-gray-600">
                📄 Fichier sélectionné: <span className="font-medium">{file.name}</span> ({formatFileSize(file.size)})
              </div>
            )}
          </div>
        </div>

        {/* List Section */}
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Aucun compte rendu pour l'instant.</p>
              <p className="text-sm mt-1">Uploadez votre premier document ci-dessus.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((meeting) => (
                <div
                  key={meeting.id}
                  className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1">{meeting.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>📎 {meeting.fileName}</span>
                        <span>{formatFileSize(meeting.fileSize)}</span>
                        <span>Par {meeting.uploadedBy}</span>
                        <span>{new Date(meeting.uploadedAt).toLocaleDateString('fr-FR', { 
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <a
                        href={meeting.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                      
                      <button
                        onClick={() => deleteMeeting(meeting.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-sm text-gray-600 rounded-b-lg">
          💡 Formats supportés : PDF, Word (.doc, .docx)
        </div>
      </div>
    </div>
  );
}
