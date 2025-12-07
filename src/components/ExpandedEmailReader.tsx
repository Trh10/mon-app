"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Archive, 
  Trash2, 
  MoreVertical, 
  Reply, 
  ReplyAll, 
  Forward,
  Star,
  StarOff,
  Send,
  Paperclip,
  Image as ImageIcon,
  Link2,
  Smile,
  MoreHorizontal,
  Minimize2,
  X,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  List,
  Type,
  Check,
  AlertCircle
} from "lucide-react";
import type { Email } from "@/lib/types";

interface ExpandedEmailReaderProps {
  messageId: string;
  onBack: () => void;
  onRefresh?: () => void;
  userInfo?: any;
}

export function ExpandedEmailReader({ 
  messageId, 
  onBack, 
  onRefresh,
  userInfo 
}: ExpandedEmailReaderProps) {
  const [email, setEmail] = useState<Email | null>(null);
  const [inlineImages, setInlineImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // État pour le mode composition
  const [isComposing, setIsComposing] = useState(false);
  const [composeType, setComposeType] = useState<'reply' | 'replyAll' | 'forward'>('reply');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeBcc, setComposeBcc] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    loadEmailContent();
  }, [messageId]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const loadEmailContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/email/message?id=${messageId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur de réseau ou de serveur');
      }
      const data = await response.json();
      if (data.success && data.email) {
        setEmail(data.email);
        // Préparer les images inline (cid)
        if (data.email.attachments && Array.isArray(data.email.attachments)) {
          const cidMap: Record<string, string> = {};
          data.email.attachments.forEach((att: any) => {
            if (att.contentId && att.content && att.mimeType?.startsWith('image/')) {
              // Correction du base64 si besoin
              let b64 = att.content.replace(/\r|\n/g, '');
              cidMap[att.contentId.replace(/[<>]/g, '')] = `data:${att.mimeType};base64,${b64}`;
            }
          });
          setInlineImages(cidMap);
        }
      } else {
        throw new Error(data.error || 'Format de réponse invalide');
      }
    } catch (err: any) {
      console.log('❌ Erreur chargement email:', err.message);
      setError(`Erreur lors du chargement de l'email: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    try {
      setActionLoading(action);
      await new Promise(resolve => setTimeout(resolve, 600));
      
      switch (action) {
        case 'archive':
          showNotification('success', 'Email archivé avec succès');
          setTimeout(() => {
            onRefresh?.();
            onBack();
          }, 1500);
          break;
          
        case 'delete':
          showNotification('success', 'Email supprimé définitivement');
          setTimeout(() => {
            onRefresh?.();
            onBack();
          }, 1500);
          break;
          
        case 'star':
        case 'unstar':
          setIsStarred(action === 'star');
          showNotification('success', action === 'star' ? 'Étoile ajoutée' : 'Étoile retirée');
          break;
          
        case 'markUnread':
          showNotification('success', 'Email marqué comme non lu');
          break;
          
        default:
          showNotification('success', `Action "${action}" effectuée`);
      }
      
    } catch (err) {
      showNotification('error', `Erreur lors de l'action: ${action}`);
    } finally {
      setActionLoading(null);
      setShowDropdown(false);
    }
  };

  const startCompose = (type: 'reply' | 'replyAll' | 'forward', event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setComposeType(type);
    
    if (type === 'reply') {
      setComposeTo(email?.from || '');
      setComposeSubject(`Re: ${email?.subject || ''}`);
      setShowCc(false);
    } else if (type === 'replyAll') {
      setComposeTo(email?.from || '');
      setComposeCc(Array.isArray(email?.cc) ? email.cc.join(', ') : email?.cc || '');
      setComposeSubject(`Re: ${email?.subject || ''}`);
      setShowCc(true);
    } else if (type === 'forward') {
      setComposeTo('');
      setComposeCc('');
      setComposeSubject(`Fwd: ${email?.subject || ''}`);
      setShowCc(false);
    }
    
    const signature = `\n\n--\n${userInfo?.userName || 'Trh10'}\n${userInfo?.email || 'trh10@company.com'}`;
    
    if (type === 'forward') {
      const forwardedContent = `\n\n---------- Message transféré ----------\nDe: ${email?.fromName || email?.from}\nDate: ${new Date(email?.date || '').toLocaleString()}\nObjet: ${email?.subject}\nÀ: ${email?.to}\n\n${email?.snippet || ''}`;
      setComposeBody(signature + forwardedContent);
    } else {
      const originalContent = `\n\nLe ${new Date(email?.date || '').toLocaleDateString()} à ${new Date(email?.date || '').toLocaleTimeString()}, ${email?.fromName || email?.from} a écrit :\n> ${(email?.snippet || '').replace(/\n/g, '\n> ')}`;
      setComposeBody(signature + originalContent);
    }
    
    setShowBcc(false);
    setIsComposing(true);
  };

  const cancelCompose = () => {
    setIsComposing(false);
    setComposeTo('');
    setComposeCc('');
    setComposeBcc('');
    setComposeSubject('');
    setComposeBody('');
    setShowCc(false);
    setShowBcc(false);
  };

  const handleSendEmail = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!composeTo.trim()) {
      showNotification('error', 'Veuillez saisir au moins un destinataire');
      return;
    }
    
    if (!composeSubject.trim()) {
      showNotification('error', 'Veuillez saisir un objet');
      return;
    }
    
    try {
      setActionLoading('send');
      
      // Envoi réel via notre API
      const response = await fetch('/api/email/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalEmailId: email?.id,
          replyType: composeType,
          subject: composeSubject,
          content: composeBody,
          to: composeTo.split(',').map(s => s.trim()).filter(Boolean),
          cc: composeCc ? composeCc.split(',').map(s => s.trim()).filter(Boolean) : [],
          sender: {
            email: userInfo?.email || 'user@example.com',
            name: userInfo?.userName || 'Utilisateur'
          }
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        showNotification('success', '✅ Email envoyé avec succès !');
        setIsComposing(false);
        cancelCompose();
        onRefresh?.(); // Actualiser la liste
      } else {
        showNotification('error', `❌ Erreur: ${result.error || 'Envoi échoué'}`);
      }
      
    } catch (err) {
      console.error('Erreur envoi email:', err);
      showNotification('error', '❌ Erreur de connexion lors de l\'envoi');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-slate-900 transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-300">Chargement de l'email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 relative transition-colors">
      {/* Notification toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header - différent selon le mode */}
      <div className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 sticky top-0 z-10 transition-colors">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isComposing) {
                  cancelCompose();
                } else {
                  onBack();
                }
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
              title={isComposing ? "Annuler" : "Retour"}
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              {isComposing ? (
                composeType === 'reply' ? 'Répondre' :
                composeType === 'replyAll' ? 'Répondre à tous' : 'Transférer'
              ) : (
                email?.subject || 'Email'
              )}
            </h2>
          </div>

          {/* Actions selon le mode */}
          {isComposing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={actionLoading === 'send'}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {actionLoading === 'send' ? (
                  <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Envoyer</span>
              </button>
              
              <button
                type="button"
                onClick={cancelCompose}
                className="px-4 py-2 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
              >
                Annuler
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => handleAction('archive', e)}
                disabled={actionLoading === 'archive'}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                title="Archiver"
              >
                {actionLoading === 'archive' ? (
                  <div className="w-5 h-5 animate-spin border-2 border-gray-400 border-t-transparent rounded-full" />
                ) : (
                  <Archive className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                )}
              </button>
              
              <button
                type="button"
                onClick={(e) => handleAction('delete', e)}
                disabled={actionLoading === 'delete'}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                title="Supprimer"
              >
                {actionLoading === 'delete' ? (
                  <div className="w-5 h-5 animate-spin border-2 border-gray-400 border-t-transparent rounded-full" />
                ) : (
                  <Trash2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                )}
              </button>

              <button
                type="button"
                onClick={(e) => handleAction(isStarred ? 'unstar' : 'star', e)}
                disabled={actionLoading === 'star' || actionLoading === 'unstar'}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                title={isStarred ? "Retirer l'étoile" : "Ajouter une étoile"}
              >
                {(actionLoading === 'star' || actionLoading === 'unstar') ? (
                  <div className="w-5 h-5 animate-spin border-2 border-gray-400 border-t-transparent rounded-full" />
                ) : isStarred ? (
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                ) : (
                  <StarOff className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                )}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                  title="Plus"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg py-1 z-20 min-w-[180px]">
                    <button 
                      type="button"
                      onClick={(e) => handleAction('markUnread', e)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300"
                    >
                      Marquer comme non lu
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.print();
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300"
                    >
                      Imprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenu principal - Email OU Composition */}
      <div className="flex-1 overflow-auto">
        {email && !isComposing && (
          /* MODE LECTURE EMAIL */
          <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-lg shadow-sm">
                  {(email.fromName || email.from).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {email.fromName || email.from}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>&lt;{email.from}&gt;</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                      <div>{new Date(email.date).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}</div>
                      <div>{new Date(email.date).toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    à moi
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8 text-sm leading-relaxed">
              {(() => {
                // Affichage HTML riche avec remplacement des images inline cid
                if (email.bodyHtml) {
                  let html = email.bodyHtml;
                  // Remplacer les cid:xxx par data:image/xxx;base64,...
                  Object.entries(inlineImages).forEach(([cid, dataUrl]) => {
                    html = html.replace(new RegExp(`src=["']cid:${cid}["']`, 'g'), `src=\"${dataUrl}\"`);
                  });
                  return (
                    <div
                      className="prose prose-sm max-w-none email-content gmail-rich dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  );
                } else if (email.bodyText) {
                  // Texte brut enrichi (liens cliquables)
                  const textWithLinks = email.bodyText.replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
                  return (
                    <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono text-sm email-content gmail-rich" dangerouslySetInnerHTML={{ __html: textWithLinks }} />
                  );
                } else if (email.body) {
                  return <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap email-content gmail-rich">{email.body}</div>;
                } else {
                  return <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap email-content gmail-rich">{email.snippet || 'Aucun contenu disponible'}</div>;
                }
              })()}
            </div>

            {/* Affichage des pièces jointes */}
            {email.attachments && email.attachments.length > 0 && (
              <div className="mb-6 border-t border-gray-200 dark:border-white/10 pt-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Pièces jointes ({email.attachments.length})
                </h3>
                <div className="space-y-2">
                  {email.attachments.map((attachment: any, index: number) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-700 rounded border border-gray-200 dark:border-white/10">
                          {attachment.mimeType?.startsWith('image/') ? (
                            <ImageIcon className="w-4 h-4 text-blue-500" />
                          ) : attachment.mimeType?.includes('pdf') ? (
                            <div className="w-4 h-4 bg-red-500 text-white text-xs font-bold rounded flex items-center justify-center">
                              PDF
                            </div>
                          ) : attachment.mimeType?.includes('doc') ? (
                            <div className="w-4 h-4 bg-blue-500 text-white text-xs font-bold rounded flex items-center justify-center">
                              DOC
                            </div>
                          ) : (
                            <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {attachment.filename || attachment.name || 'Fichier sans nom'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {attachment.size ? (
                              attachment.size > 1024 * 1024 
                                ? `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`
                                : `${Math.round(attachment.size / 1024)} KB`
                            ) : 'Taille inconnue'}
                            {attachment.mimeType && (
                              <span className="ml-2">• {attachment.mimeType}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {attachment.mimeType?.startsWith('image/') && (
                          <button
                            onClick={() => {
                              // Ouvrir l'image dans une nouvelle fenêtre pour prévisualisation
                              if (attachment.content) {
                                let b64 = attachment.content.replace(/\r|\n/g, '');
                                const byteCharacters = atob(b64);
                                const byteNumbers = new Array(byteCharacters.length);
                                for (let i = 0; i < byteCharacters.length; i++) {
                                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                                }
                                const byteArray = new Uint8Array(byteNumbers);
                                const blob = new Blob([byteArray], {
                                  type: attachment.mimeType
                                });
                                const url = URL.createObjectURL(blob);
                                window.open(url, '_blank');
                                setTimeout(() => URL.revokeObjectURL(url), 1000);
                              }
                            }}
                            className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors"
                          >
                            Aperçu image
                          </button>
                        )}
                        <button
                          onClick={() => {
                            // Télécharger le fichier
                            if (attachment.content) {
                              let b64 = attachment.content.replace(/\r|\n/g, '');
                              const byteCharacters = atob(b64);
                              const byteNumbers = new Array(byteCharacters.length);
                              for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                              }
                              const byteArray = new Uint8Array(byteNumbers);
                              const blob = new Blob([byteArray], {
                                type: attachment.mimeType || 'application/octet-stream'
                              });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = attachment.filename || attachment.name || 'fichier';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }
                          }}
                          className="px-3 py-1 text-xs bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                        >
                          Télécharger
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex items-center gap-3 pt-6 border-t border-gray-100 dark:border-white/10">
              <button
                type="button"
                onClick={(e) => startCompose('reply', e)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Reply className="w-4 h-4" />
                <span className="font-medium">Répondre</span>
              </button>
              
              <button
                type="button"
                onClick={(e) => startCompose('replyAll', e)}
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
              >
                <ReplyAll className="w-4 h-4" />
                <span>Répondre à tous</span>
              </button>
              
              <button
                type="button"
                onClick={(e) => startCompose('forward', e)}
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
              >
                <Forward className="w-4 h-4" />
                <span>Transférer</span>
              </button>
            </div>
          </div>
        )}

        {isComposing && (
          /* MODE COMPOSITION */
          <div className="max-w-4xl mx-auto p-6">
            {/* Champs destinataires */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-4">
                <label className="w-12 text-sm text-gray-600 dark:text-gray-300 font-medium">À</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-white/20 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Destinataires"
                />
                <div className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowCc(!showCc);
                    }}
                    className="hover:underline"
                  >
                    Cc
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowBcc(!showBcc);
                    }}
                    className="hover:underline"
                  >
                    Cci
                  </button>
                </div>
              </div>

              {showCc && (
                <div className="flex items-center gap-4">
                  <label className="w-12 text-sm text-gray-600 dark:text-gray-300 font-medium">Cc</label>
                  <input
                    type="email"
                    value={composeCc}
                    onChange={(e) => setComposeCc(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-white/20 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Copie"
                  />
                </div>
              )}

              {showBcc && (
                <div className="flex items-center gap-4">
                  <label className="w-12 text-sm text-gray-600 dark:text-gray-300 font-medium">Cci</label>
                  <input
                    type="email"
                    value={composeBcc}
                    onChange={(e) => setComposeBcc(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-white/20 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Copie cachée"
                  />
                </div>
              )}

              <div className="flex items-center gap-4">
                <label className="w-12 text-sm text-gray-600 dark:text-gray-300 font-medium">Objet</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-white/20 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Objet"
                />
              </div>
            </div>

            {/* Barre d'outils */}
            <div className="flex items-center gap-1 mb-4 p-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded">
              <button type="button" className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded" title="Gras">
                <Bold className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button type="button" className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded" title="Italique">
                <Italic className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button type="button" className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded" title="Souligné">
                <Underline className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <div className="w-px h-4 bg-gray-300 dark:bg-white/20 mx-1"></div>
              <button type="button" className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded" title="Aligner">
                <AlignLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button type="button" className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded" title="Liste">
                <List className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <div className="w-px h-4 bg-gray-300 dark:bg-white/20 mx-1"></div>
              <button type="button" className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded" title="Pièce jointe">
                <Paperclip className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button type="button" className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded" title="Image">
                <ImageIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button type="button" className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded" title="Lien">
                <Link2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button type="button" className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded" title="Emoji">
                <Smile className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Zone de texte */}
            <div className="mb-6">
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                className="w-full h-96 p-4 border border-gray-300 dark:border-white/20 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Rédigez votre message..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Overlay pour fermer dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDropdown(false);
          }}
        />
      )}
    </div>
  );
}