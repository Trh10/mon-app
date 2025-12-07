"use client";
import { useEffect, useState, useRef } from 'react';
import { FileText, Upload, Download, Trash2, X, Calendar, Clock, User, Eye, Search, Filter, ChevronDown, Sparkles, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { useCodeAuth } from '../auth/CodeAuthContext';

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
  const { user } = useCodeAuth();
  const [items, setItems] = useState<Meeting[]>([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [viewingDocument, setViewingDocument] = useState<Meeting | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fonction pour obtenir l'URL du viewer en fonction du type de fichier
  // Vérifier si on est en localhost
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Obtenir l'extension du fichier
  const getFileExtension = (fileName: string): string => {
    return fileName.toLowerCase().split('.').pop() || '';
  };

  // Vérifier si le fichier est un document Office (Word, Excel, PowerPoint)
  const isOfficeDocument = (fileName: string): boolean => {
    const ext = getFileExtension(fileName);
    return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
  };

  // Vérifier si le fichier est un PDF
  const isPdfDocument = (fileName: string): boolean => {
    return getFileExtension(fileName) === 'pdf';
  };

  const getViewerUrl = (fileUrl: string, fileName: string): string => {
    const fullUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${fileUrl}`
      : fileUrl;
    
    const extension = getFileExtension(fileName);
    
    // Pour les PDF, on peut les afficher directement dans le navigateur
    if (extension === 'pdf') {
      return fileUrl;
    }
    
    // Pour les fichiers Word et Office, utiliser Microsoft Office Online Viewer
    // Note: Fonctionne uniquement avec des URLs publiques
    if (isOfficeDocument(fileName)) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;
    }
    
    // Pour les autres types, utiliser Google Docs Viewer en fallback
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`;
  };

  // Ouvrir le document dans le viewer
  const openDocumentViewer = (meeting: Meeting) => {
    // Pour les PDF, on peut les ouvrir directement même en localhost
    if (isPdfDocument(meeting.fileName)) {
      setViewingDocument(meeting);
      setIsFullscreen(false);
    } else if (isLocalhost && isOfficeDocument(meeting.fileName)) {
      // En localhost avec un fichier Office, proposer le téléchargement direct
      // car le viewer en ligne ne peut pas accéder aux fichiers locaux
      const userChoice = confirm(
        `Le viewer en ligne ne peut pas accéder aux fichiers locaux.\n\n` +
        `Voulez-vous :\n` +
        `• OK = Télécharger le fichier pour l'ouvrir dans Word\n` +
        `• Annuler = Essayer quand même le viewer (nécessite une URL publique)`
      );
      
      if (userChoice) {
        // Télécharger le fichier
        const link = document.createElement('a');
        link.href = meeting.fileUrl;
        link.download = meeting.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Ouvrir quand même le viewer
        setViewingDocument(meeting);
        setIsFullscreen(false);
      }
    } else {
      // Pour les autres cas (production avec URL publique), ouvrir le viewer
      setViewingDocument(meeting);
      setIsFullscreen(false);
    }
  };

  // Fermer le viewer
  const closeDocumentViewer = () => {
    setViewingDocument(null);
    setIsFullscreen(false);
  };

  // Vérifier si l'utilisateur peut uploader (niveau >= 5 : Assistant et plus)
  const canUpload = user && (user.level || 0) >= 5;

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
      // Ajouter les infos utilisateur pour l'API
      formData.append('uploaderName', user?.name || 'Utilisateur');
      formData.append('companyCode', user?.companyCode || user?.company || 'default');

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
    if (!confirm('Supprimer ce compte rendu ?')) return;
    
    try {
      console.log('Deleting meeting:', id);
      const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok && data.success) {
        console.log('Meeting deleted successfully');
        await load();
      } else {
        console.error('Delete failed:', data);
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Erreur lors de la suppression');
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.pdf')) return '📕';
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return '📘';
    return '📄';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-700" onClick={(e) => e.stopPropagation()}>
        
        {/* Header Premium */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600" />
          
          <div className="relative px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Comptes Rendus de Réunions
                    <span className="text-xs px-2 py-0.5 bg-amber-400 text-amber-900 rounded-full font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Premium
                    </span>
                  </h2>
                  <p className="text-sm text-white/70">
                    {items.length} document{items.length > 1 ? 's' : ''} • Réunions du lundi
                  </p>
                </div>
              </div>
              <button 
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white" 
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Zone d'upload - Visible seulement pour Assistant et plus */}
        {canUpload && (
          <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span>Publier un nouveau compte rendu</span>
              </div>
              
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-white placeholder-slate-500"
                placeholder="Titre (ex: Réunion du lundi 12 octobre)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              
              <div className="flex gap-3">
                <label className="flex-1 cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <div className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl transition-all ${
                    file 
                      ? 'border-purple-500 bg-purple-500/10 text-purple-400' 
                      : 'border-slate-600 hover:border-purple-500 hover:bg-purple-500/10 text-slate-400'
                  }`}>
                    {file ? (
                      <>
                        <span className="text-lg">{getFileIcon(file.name)}</span>
                        <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                        <span className="text-xs text-slate-500">({formatFileSize(file.size)})</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span>Choisir un fichier</span>
                      </>
                    )}
                  </div>
                </label>
                
                <button
                  onClick={uploadMeeting}
                  disabled={uploading || !file || !title.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg shadow-purple-500/25 transition-all"
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
            </div>
          </div>
        )}

        {/* Barre de recherche */}
        <div className="px-6 py-3 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher un compte rendu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm text-white placeholder-slate-500"
              />
            </div>
            <span className="text-xs text-slate-500">
              {filteredItems.length} résultat{filteredItems.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Liste des comptes rendus */}
        <div className="flex-1 overflow-auto bg-slate-900">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400">Chargement des comptes rendus...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-10 h-10 text-slate-600" />
              </div>
              <p className="font-medium text-slate-300">Aucun compte rendu pour l'instant</p>
              <p className="text-sm mt-1">
                {searchQuery 
                  ? "Aucun résultat pour votre recherche" 
                  : "Uploadez votre premier document ci-dessus"
                }
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredItems.map((meeting, index) => (
                <div
                  key={meeting.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:shadow-lg hover:border-purple-500/50 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    {/* Icône document */}
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      {getFileIcon(meeting.fileName)}
                    </div>
                    
                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">
                        {meeting.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatRelativeDate(meeting.uploadedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {meeting.uploadedBy}
                        </span>
                        <span className="text-slate-500">
                          {formatFileSize(meeting.fileSize)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(meeting.uploadedAt)}
                      </p>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openDocumentViewer(meeting)}
                        className="p-2.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors"
                        title="Voir le document"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      
                      <a
                        href={meeting.fileUrl}
                        download
                        className="p-2.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                      
                      {canUpload && (
                        <button
                          onClick={() => deleteMeeting(meeting.id)}
                          className="p-2.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-700 bg-slate-800/50 flex items-center justify-between">
          <div className="text-sm text-slate-400 flex items-center gap-2">
            <span className="text-lg">💡</span>
            <span>Formats supportés : PDF, Word (.doc, .docx)</span>
          </div>
          <div className="text-xs text-slate-500">
            Réunions du lundi • Comptes rendus du vendredi
          </div>
        </div>
      </div>

      {/* Modal de prévisualisation (optionnel pour le futur) */}
      {selectedMeeting && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]"
          onClick={() => setSelectedMeeting(null)}
        >
          <div 
            className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-2 text-white">{selectedMeeting.title}</h3>
            <p className="text-slate-400 text-sm mb-4">
              Uploadé par {selectedMeeting.uploadedBy} le {formatDate(selectedMeeting.uploadedAt)}
            </p>
            <div className="flex gap-3">
              <a
                href={selectedMeeting.fileUrl}
                target="_blank"
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-center hover:bg-purple-700"
              >
                Ouvrir
              </a>
              <button
                onClick={() => setSelectedMeeting(null)}
                className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de visualisation de document */}
      {viewingDocument && (
        <div 
          className={`fixed inset-0 bg-black/80 flex items-center justify-center z-[70] ${isFullscreen ? '' : 'p-4'}`}
          onClick={closeDocumentViewer}
        >
          <div 
            className={`bg-white rounded-xl overflow-hidden flex flex-col ${
              isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[85vh]'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header du viewer */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">{viewingDocument.title}</h3>
                  <p className="text-white/70 text-sm">{viewingDocument.fileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Bouton ouvrir dans nouvel onglet */}
                <a
                  href={getViewerUrl(viewingDocument.fileUrl, viewingDocument.fileName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                  title="Ouvrir dans un nouvel onglet"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                {/* Bouton télécharger */}
                <a
                  href={viewingDocument.fileUrl}
                  download
                  className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                  title="Télécharger"
                >
                  <Download className="w-5 h-5" />
                </a>
                {/* Bouton plein écran */}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                  title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                {/* Bouton fermer */}
                <button
                  onClick={closeDocumentViewer}
                  className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                  title="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Zone de visualisation */}
            <div className="flex-1 bg-gray-100 relative overflow-hidden">
              {/* Message d'information pour localhost avec fichiers Office */}
              {isLocalhost && isOfficeDocument(viewingDocument.fileName) && (
                <div className="absolute top-0 left-0 right-0 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center gap-2 z-10">
                  <span>💡</span>
                  <span>
                    <strong>Note :</strong> Le viewer Microsoft Office nécessite une URL publique. 
                    En local, cliquez sur <strong>Télécharger</strong> pour ouvrir le fichier dans Word.
                  </span>
                </div>
              )}
              
              {/* Pour les PDF, afficher directement */}
              {isPdfDocument(viewingDocument.fileName) ? (
                <iframe
                  src={viewingDocument.fileUrl}
                  className="w-full h-full"
                  style={{ border: 'none' }}
                  title={`Visualisation de ${viewingDocument.title}`}
                />
              ) : (
                /* Pour les fichiers Office, utiliser le viewer en ligne */
                <iframe
                  src={getViewerUrl(viewingDocument.fileUrl, viewingDocument.fileName)}
                  className={`w-full h-full ${isLocalhost && isOfficeDocument(viewingDocument.fileName) ? 'pt-10' : ''}`}
                  style={{ border: 'none' }}
                  title={`Visualisation de ${viewingDocument.title}`}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
              )}
            </div>
            
            {/* Footer du viewer */}
            <div className="bg-gray-50 px-4 py-2 border-t flex items-center justify-between text-sm">
              <div className="text-gray-500">
                Uploadé par <span className="font-medium text-gray-700">{viewingDocument.uploadedBy}</span> • {formatRelativeDate(viewingDocument.uploadedAt)}
              </div>
              <div className="text-gray-400">
                {formatFileSize(viewingDocument.fileSize)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
