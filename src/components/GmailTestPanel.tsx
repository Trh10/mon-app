"use client";

import { useState } from "react";
import { gmailActions } from "@lib/gmail-actions";
import { useGmailComposer } from "@hooks/useGmailComposer";
import { FullReader } from "@components/FullReader";

export function GmailTestPanel() {
  const [messages, setMessages] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [status, setStatus] = useState("Prêt");

  const composer = useGmailComposer(openId);

  async function loadMessages() {
    try {
      setStatus("Chargement...");
      const list = await gmailActions.list();
      setMessages(list);
      setStatus(`${list.length} messages chargés`);
    } catch (e: any) {
      setStatus(`Erreur: ${e.message}`);
    }
  }

  async function testSend() {
    try {
      const me = await gmailActions.me();
      await gmailActions.send({
        to: me.emailAddress,
        subject: "Test depuis ICONES BOX",
        html: "<p>Ceci est un test d'envoi depuis l'application.</p>"
      });
      setStatus("Test envoyé avec succès");
    } catch (e: any) {
      setStatus(`Erreur envoi: ${e.message}`);
    }
  }

  return (
    <div className="border rounded p-4 bg-white">
      <h3 className="font-bold mb-3">Test Gmail Actions</h3>
      
      <div className="flex gap-2 mb-3">
        <button onClick={loadMessages} className="px-3 py-1 border rounded hover:bg-gray-50">
          Charger Messages
        </button>
        <button onClick={testSend} className="px-3 py-1 border rounded hover:bg-gray-50">
          Test Envoi
        </button>
        <button onClick={() => gmailActions.connect()} className="px-3 py-1 border rounded hover:bg-gray-50">
          Se connecter
        </button>
      </div>

      <div className="text-sm text-gray-600 mb-3">Status: {status}</div>

      {messages.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Messages:</h4>
          {messages.slice(0, 5).map((msg: any) => (
            <div key={msg.id} className="border rounded p-2">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{msg.subject}</div>
                  <div className="text-sm text-gray-600">{msg.fromName} - {msg.snippet}</div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setOpenId(msg.id)}
                    className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                  >
                    Ouvrir
                  </button>
                  <button 
                    onClick={() => {
                      setOpenId(msg.id);
                      setTimeout(composer.startReply, 100);
                    }}
                    className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                  >
                    Répondre
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer simple */}
      {openId && (
        <div className="mt-4 border-t pt-4">
          <input ref={composer.fileRef} type="file" multiple onChange={composer.onFilesPicked} className="hidden" />
          <div className="space-y-2">
            <input 
              value={composer.to} 
              onChange={(e) => composer.setTo(e.target.value)}
              placeholder="Destinataire"
              className="w-full px-2 py-1 border rounded"
            />
            <input 
              value={composer.subject} 
              onChange={(e) => composer.setSubject(e.target.value)}
              placeholder="Sujet"
              className="w-full px-2 py-1 border rounded"
            />
            <textarea 
              value={composer.html} 
              onChange={(e) => composer.setHtml(e.target.value)}
              placeholder="Message"
              className="w-full px-2 py-1 border rounded h-20"
            />
            <div className="flex gap-2">
              <button onClick={composer.openFilePicker} className="px-3 py-1 border rounded hover:bg-gray-50">
                Joindre ({composer.attachments.length})
              </button>
              <button 
                onClick={composer.send} 
                disabled={composer.sending}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {composer.sending ? "Envoi..." : "Envoyer"}
              </button>
            </div>
            {composer.status && <div className="text-sm text-gray-600">{composer.status}</div>}
          </div>
        </div>
      )}

      {openId && <FullReader messageId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}