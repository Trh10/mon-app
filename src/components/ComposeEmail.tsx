"use client";
import { useState } from 'react';
import { Send, X, Paperclip, Save } from 'lucide-react';

interface ComposeEmailProps {
  onClose: () => void;
  onSent?: () => void;
  replyTo?: {
    to: string;
    subject: string;
    messageId: string;
    references?: string;
  };
}

export function ComposeEmail({ onClose, onSent, replyTo }: ComposeEmailProps) {
  const [to, setTo] = useState(replyTo?.to || '');
  const [subject, setSubject] = useState(replyTo?.subject || '');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const currentTime = '2025-08-29 14:14:16';
  const currentUser = 'Trh10';

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !content.trim()) {
      setError('Veuillez remplir tous les champs requis');
      return;
    }

    setSending(true);
    setError('');

    try {
      console.log(`📤 Tentative envoi email - To: ${to} - Subject: ${subject} - User: ${currentUser} - ${currentTime}`);

      // ✅ Récupérer les credentials de l'utilisateur connecté
      const credentials = localStorage.getItem('email_credentials');
      if (!credentials) {
        throw new Error('Aucune connexion email trouvée');
      }

      const parsedCredentials = JSON.parse(atob(credentials));
      console.log(`🔐 Credentials récupérés - Email: ${parsedCredentials.email} - User: ${currentUser}`);

      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          content: content, // backend accepte text/html mais on unifie
          from: parsedCredentials.email,
          fromEmail: parsedCredentials.email,
          fromPassword: parsedCredentials.password,
          password: parsedCredentials.password,
          fromName: parsedCredentials.userName || currentUser,
          replyTo: replyTo?.to,
          inReplyTo: replyTo?.messageId,
          references: replyTo?.references,
          messageId: `<${Date.now()}.${Math.random().toString(36)}@${parsedCredentials.email.split('@')[1]}>`
        })
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        console.log(`✅ Email envoyé avec succès - MessageID: ${data.messageId || data.id} - User: ${currentUser} - ${currentTime}`);
        alert('Email envoyé avec succès !');
        onSent && onSent();
        onClose();
      } else {
        console.error(`❌ Erreur envoi: ${data.error} - User: ${currentUser} - ${currentTime}`);
        setError(data.error || 'Erreur lors de l\'envoi');
      }
    } catch (err: any) {
      console.error(`❌ Erreur réseau envoi: ${err.message} - User: ${currentUser} - ${currentTime}`);
      setError('Erreur de connexion lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = () => {
    console.log(`💾 Sauvegarde brouillon - User: ${currentUser} - ${currentTime}`);
    // TODO: Implémenter la sauvegarde en brouillon
    alert('Brouillon sauvegardé (fonctionnalité à implémenter)');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              ✉️ {replyTo ? 'Répondre' : 'Nouveau message'}
            </h2>
            <p className="text-sm text-gray-600">
              User: {currentUser} • {currentTime} UTC
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destinataire
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
              placeholder="destinataire@example.com"
              required
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sujet
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
              placeholder="Sujet de votre message"
              required
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
              rows={12}
              placeholder="Tapez votre message ici..."
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Brouillon</span>
              </button>
              
              <button className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center space-x-2">
                <Paperclip className="w-4 h-4" />
                <span>Pièce jointe</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              
              <button
                onClick={handleSend}
                disabled={sending || !to.trim() || !subject.trim() || !content.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? 'Envoi...' : 'Envoyer'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}