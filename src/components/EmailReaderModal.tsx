"use client";

import { useState, useEffect } from "react";
import { Mail, Reply, ReplyAll, Forward, Star, Archive, Trash2, Download, Eye, X, Send, Bold, Italic, Underline, Link, Paperclip } from "lucide-react";
import type { Email, Attachment } from "@/lib/app-types";

interface EmailReaderModalProps {
  email: Email;
  onClose: () => void;
  onReply?: (email: Email, content: string, replyType: 'reply' | 'reply-all' | 'forward') => void;
  userInfo: any;
}

export default function EmailReaderModal({ email, onClose, onReply, userInfo }: EmailReaderModalProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyType, setReplyType] = useState<'reply' | 'reply-all' | 'forward'>('reply');
  const [replyContent, setReplyContent] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [sending, setSending] = useState(false);
  const [showFullHeaders, setShowFullHeaders] = useState(false);

  useEffect(() => {
    // Préparer le sujet selon le type de réponse
    if (isReplying) {
      const prefix = replyType === 'forward' ? 'Fwd: ' : 'Re: ';
      const cleanSubject = email.subject.replace(/^(Re:|Fwd:)\s*/i, '');
      setReplySubject(prefix + cleanSubject);
    }
  }, [isReplying, replyType, email.subject]);

  const handleStartReply = (type: 'reply' | 'reply-all' | 'forward') => {
    setReplyType(type);
    setIsReplying(true);
    
    // Préparer le contenu de réponse
    const signature = `\n\n---\n${userInfo.userName}\n${userInfo.email}`;
    const originalMessage = `\n\n--- Message original ---\nDe: ${email.fromName || email.from}\nDate: ${new Date(email.date).toLocaleString()}\nObjet: ${email.subject}\n\n${email.body || email.snippet}`;
    
    if (type === 'forward') {
      setReplyContent(signature + originalMessage);
    } else {
      setReplyContent(signature + originalMessage);
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim()) return;

    setSending(true);
    try {
      // Appeler l'API pour envoyer la réponse
      const response = await fetch('/api/email/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalEmail: email,
          replyType,
          subject: replySubject,
          content: replyContent,
          sender: userInfo
        })
      });

      if (response.ok) {
        alert('✅ Email envoyé avec succès !');
        setIsReplying(false);
        setReplyContent('');
        onReply?.(email, replyContent, replyType);
      } else {
        const error = await response.json();
        alert('❌ Erreur lors de l\'envoi: ' + (error.message || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur envoi email:', error);
      alert('❌ Erreur de connexion');
    } finally {
      setSending(false);
    }
  };

  const formatEmailAddress = (address: string) => {
    const match = address.match(/^(.*?)\s*<(.+)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2] };
    }
    return { name: address, email: address };
  };

  const fromInfo = formatEmailAddress(email.from);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-green-50">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="font-semibold text-gray-800 line-clamp-1">{email.subject}</h2>
              <div className="text-sm text-gray-600">
                {fromInfo.name} &lt;{fromInfo.email}&gt;
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStartReply('reply')}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Reply className="w-4 h-4" />
              Répondre
            </button>
            
            <button
              onClick={() => handleStartReply('reply-all')}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              <ReplyAll className="w-4 h-4" />
              Rép. à tous
            </button>
            
            <button
              onClick={() => handleStartReply('forward')}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Forward className="w-4 h-4" />
              Transférer
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <Star className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <Archive className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Email Content */}
        <div className="flex-1 overflow-auto">
          {!isReplying ? (
            <div className="p-6">
              {/* Headers */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">De:</span>
                      <span>{fromInfo.name} &lt;{fromInfo.email}&gt;</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Date:</span>
                      <span>{new Date(email.date).toLocaleString()}</span>
                    </div>
                    {email.to && email.to.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">À:</span>
                        <span>{email.to.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setShowFullHeaders(!showFullHeaders)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>

                {showFullHeaders && (
                  <div className="pt-2 border-t space-y-1 text-sm text-gray-600">
                    {email.cc && email.cc.length > 0 && (
                      <div><strong>Cc:</strong> {email.cc.join(', ')}</div>
                    )}
                    <div><strong>ID:</strong> {email.id}</div>
                    {email.threadId && (
                      <div><strong>Thread:</strong> {email.threadId}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Attachments */}
              {email.hasAttachments && email.attachments && email.attachments.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Pièces jointes ({email.attachments.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {email.attachments.map((attachment, index) => (
                      <div key={attachment.id || index} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{attachment.filename}</div>
                          <div className="text-xs text-gray-500">
                            {attachment.mimeType} • {Math.round(attachment.size / 1024)} KB
                          </div>
                        </div>
                        <button className="p-1 hover:bg-gray-200 rounded">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Body */}
              <div className="prose max-w-none">
                {email.html ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: email.html }} 
                    className="email-content"
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-gray-800">
                    {email.body || email.snippet}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Reply Form */
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objet
                  </label>
                  <input
                    type="text"
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  
                  {/* Mini toolbar */}
                  <div className="border border-gray-300 rounded-t-lg p-2 bg-gray-50 flex items-center gap-1">
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <Bold className="w-4 h-4" />
                    </button>
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <Italic className="w-4 h-4" />
                    </button>
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <Underline className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-300 mx-1" />
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <Link className="w-4 h-4" />
                    </button>
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <Paperclip className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 border-t-0 rounded-b-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Tapez votre message..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Type: {replyType === 'reply' ? 'Réponse' : replyType === 'reply-all' ? 'Réponse à tous' : 'Transfert'}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsReplying(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                    
                    <button
                      onClick={handleSendReply}
                      disabled={sending || !replyContent.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {sending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {sending ? 'Envoi...' : 'Envoyer'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
