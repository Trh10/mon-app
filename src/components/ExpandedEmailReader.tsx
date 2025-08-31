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
import type { Email } from "@/lib/email-types";

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
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setEmail({
        id: messageId,
        subject: "Validation du projet - Phase finale",
        from: "project.manager@company.com", 
        fromName: "Sophie Martin",
        to: userInfo?.email || "trh10@company.com",
        cc: "team@company.com",
        date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        snippet: "Bonjour, le projet arrive en phase finale...",
        body: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <p>Bonjour ${userInfo?.userName || 'Trh10'},</p>
            <p>J'espère que vous allez bien. Le projet arrive en phase finale et nous devons valider les derniers éléments.</p>
            <h3>Points à valider :</h3>
            <ul>
              <li><strong>Interface utilisateur :</strong> Validation finale des maquettes</li>
              <li><strong>Tests fonctionnels :</strong> Vérification de tous les cas d'usage</li>
              <li><strong>Performance :</strong> Optimisation et tests de charge</li>
              <li><strong>Documentation :</strong> Guide utilisateur et technique</li>
            </ul>
            <h3>Prochaines étapes :</h3>
            <ol>
              <li>Réunion de validation demain à 14h</li>
              <li>Corrections éventuelles d'ici vendredi</li>
              <li>Livraison prévue lundi prochain</li>
            </ol>
            <p>Merci de confirmer votre disponibilité pour la réunion.</p>
            <p>Excellente journée,<br>Sophie Martin<br>Chef de projet</p>
          </div>
        `,
        unread: false,
        hasAttachments: true
      } as any);
      
    } catch (err: any) {
      setError('Erreur lors du chargement de l\'email');
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
      setComposeCc(''); // cc not available in current Email type
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
      const forwardedContent = `\n\n---------- Message transféré ----------\nDe: ${email?.fromName || email?.from}\nDate: ${new Date(email?.date || '').toLocaleString()}\nObjet: ${email?.subject}\n\n${email?.snippet || ''}`;
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
    
    try {
      setActionLoading('send');
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      showNotification('success', 'Email envoyé avec succès !');
      setIsComposing(false);
      cancelCompose();
      
    } catch (err) {
      showNotification('error', 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Chargement de l'email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white relative">
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
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
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
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title={isComposing ? "Annuler" : "Retour"}
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <h2 className="text-lg font-medium text-gray-900">
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
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
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
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                title="Archiver"
              >
                {actionLoading === 'archive' ? (
                  <div className="w-5 h-5 animate-spin border-2 border-gray-400 border-t-transparent rounded-full" />
                ) : (
                  <Archive className="w-5 h-5 text-gray-600" />
                )}
              </button>
              
              <button
                type="button"
                onClick={(e) => handleAction('delete', e)}
                disabled={actionLoading === 'delete'}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                title="Supprimer"
              >
                {actionLoading === 'delete' ? (
                  <div className="w-5 h-5 animate-spin border-2 border-gray-400 border-t-transparent rounded-full" />
                ) : (
                  <Trash2 className="w-5 h-5 text-gray-600" />
                )}
              </button>

              <button
                type="button"
                onClick={(e) => handleAction(isStarred ? 'unstar' : 'star', e)}
                disabled={actionLoading === 'star' || actionLoading === 'unstar'}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                title={isStarred ? "Retirer l'étoile" : "Ajouter une étoile"}
              >
                {(actionLoading === 'star' || actionLoading === 'unstar') ? (
                  <div className="w-5 h-5 animate-spin border-2 border-gray-400 border-t-transparent rounded-full" />
                ) : isStarred ? (
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                ) : (
                  <StarOff className="w-5 h-5 text-gray-600" />
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
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Plus"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[180px]">
                    <button 
                      type="button"
                      onClick={(e) => handleAction('markUnread', e)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-gray-700"
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
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-gray-700"
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
                      <div className="font-medium text-gray-900 text-sm">
                        {email.fromName || email.from}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        <span>&lt;{email.from}&gt;</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
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
                  <div className="text-xs text-gray-500 mt-2">
                    à moi
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8 text-sm leading-relaxed">
              {email.body ? (
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: email.body }} 
                />
              ) : (
                <div className="text-gray-900 whitespace-pre-wrap">
                  {email.snippet}
                </div>
              )}
            </div>

            {email.hasAttachments && (
              <div className="mb-8 p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Paperclip className="w-4 h-4 text-gray-600" />
                  <span className="font-medium">Pièces jointes (2)</span>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      showNotification('success', 'Téléchargement des pièces jointes...');
                    }}
                    className="ml-auto text-blue-600 hover:underline"
                  >
                    Tout télécharger
                  </button>
                </div>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
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
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors"
              >
                <ReplyAll className="w-4 h-4" />
                <span>Répondre à tous</span>
              </button>
              
              <button
                type="button"
                onClick={(e) => startCompose('forward', e)}
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors"
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
                <label className="w-12 text-sm text-gray-600 font-medium">À</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Destinataires"
                />
                <div className="flex gap-2 text-sm text-gray-600">
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
                  <label className="w-12 text-sm text-gray-600 font-medium">Cc</label>
                  <input
                    type="email"
                    value={composeCc}
                    onChange={(e) => setComposeCc(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Copie"
                  />
                </div>
              )}

              {showBcc && (
                <div className="flex items-center gap-4">
                  <label className="w-12 text-sm text-gray-600 font-medium">Cci</label>
                  <input
                    type="email"
                    value={composeBcc}
                    onChange={(e) => setComposeBcc(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Copie cachée"
                  />
                </div>
              )}

              <div className="flex items-center gap-4">
                <label className="w-12 text-sm text-gray-600 font-medium">Objet</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Objet"
                />
              </div>
            </div>

            {/* Barre d'outils */}
            <div className="flex items-center gap-1 mb-4 p-2 bg-gray-50 border border-gray-200 rounded">
              <button type="button" className="p-2 hover:bg-gray-200 rounded" title="Gras">
                <Bold className="w-4 h-4 text-gray-600" />
              </button>
              <button type="button" className="p-2 hover:bg-gray-200 rounded" title="Italique">
                <Italic className="w-4 h-4 text-gray-600" />
              </button>
              <button type="button" className="p-2 hover:bg-gray-200 rounded" title="Souligné">
                <Underline className="w-4 h-4 text-gray-600" />
              </button>
              <div className="w-px h-4 bg-gray-300 mx-1"></div>
              <button type="button" className="p-2 hover:bg-gray-200 rounded" title="Aligner">
                <AlignLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button type="button" className="p-2 hover:bg-gray-200 rounded" title="Liste">
                <List className="w-4 h-4 text-gray-600" />
              </button>
              <div className="w-px h-4 bg-gray-300 mx-1"></div>
              <button type="button" className="p-2 hover:bg-gray-200 rounded" title="Pièce jointe">
                <Paperclip className="w-4 h-4 text-gray-600" />
              </button>
              <button type="button" className="p-2 hover:bg-gray-200 rounded" title="Image">
                <ImageIcon className="w-4 h-4 text-gray-600" />
              </button>
              <button type="button" className="p-2 hover:bg-gray-200 rounded" title="Lien">
                <Link2 className="w-4 h-4 text-gray-600" />
              </button>
              <button type="button" className="p-2 hover:bg-gray-200 rounded" title="Emoji">
                <Smile className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Zone de texte */}
            <div className="mb-6">
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                className="w-full h-96 p-4 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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