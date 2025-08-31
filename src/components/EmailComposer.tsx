"use client";
import { useState } from "react";
import { 
  Send, Sparkles, Loader2, Copy, X, Wand2, ArrowRight, 
  CheckCircle, Mail, Brain, Languages, Calendar, Repeat
} from "lucide-react";

interface EmailComposerProps {
  initialTo?: string;
  initialSubject?: string;
  initialContent?: string;
  replyToEmail?: any;
  onClose?: () => void;
  onSend?: (email: { to: string; subject: string; content: string }) => void;
}

export function EmailComposer({
  initialTo = "",
  initialSubject = "",
  initialContent = "",
  replyToEmail = null,
  onClose,
  onSend
}: EmailComposerProps) {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [content, setContent] = useState(initialContent);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [aiError, setAiError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  
  // NOUVEAU : États pour les fonctionnalités IA avancées
  const [aiMode, setAiMode] = useState<"compose" | "smart_reply" | "tone_analyzer" | "meeting_scheduler">("compose");
  const [smartReplies, setSmartReplies] = useState<any>(null);
  const [toneAnalysis, setToneAnalysis] = useState<any>(null);

  // NOUVEAU : Envoi réel d'email
  const handleRealSend = async () => {
    if (!to.trim() || !subject.trim() || !content.trim()) {
      alert("Veuillez remplir tous les champs (À, Sujet, Message)");
      return;
    }

    setIsSending(true);
    setAiError("");

    try {
      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          content: content.trim(),
          replyToMessageId: replyToEmail?.id,
          threadId: replyToEmail?.threadId
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSendSuccess(true);
        setTimeout(() => {
          onSend?.({ to: to.trim(), subject: subject.trim(), content: content.trim() });
          onClose?.();
        }, 2000);
      } else {
        throw new Error(result.error || "Erreur lors de l'envoi");
      }

    } catch (error: any) {
      console.error("Erreur envoi email:", error);
      setAiError(`Erreur envoi: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // NOUVEAU : Analyse du ton
  const handleToneAnalysis = async () => {
    if (!content.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: "tone_analyzer",
          context: content
        })
      });

      const data = await response.json();
      if (data.content) {
        setToneAnalysis(data.content);
      }
    } catch (error) {
      console.error("Erreur analyse ton:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // NOUVEAU : Réponses intelligentes multiples
  const handleSmartReplies = async () => {
    if (!replyToEmail) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: "smart_reply",
          prompt: aiPrompt || "Génère des options de réponse",
          context: `Sujet: ${replyToEmail.subject}\nContenu: ${replyToEmail.snippet}`
        })
      });

      const data = await response.json();
      if (data.content) {
        setSmartReplies(data.content);
      }
    } catch (error) {
      console.error("Erreur réponses intelligentes:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // NOUVEAU : Générateur de réunion
  const handleMeetingGenerator = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: "meeting_scheduler",
          prompt: aiPrompt,
          context: replyToEmail ? `Email original: ${replyToEmail.snippet}` : ""
        })
      });

      const data = await response.json();
      if (data.content?.emailContent) {
        setContent(data.content.emailContent);
        if (!subject && aiPrompt) {
          setSubject(`Demande de réunion - ${aiPrompt}`);
        }
      }
    } catch (error) {
      console.error("Erreur générateur réunion:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fonction de génération originale (améliorée)
  const handleAiGenerate = async (type: "compose" | "reply" | "improve") => {
    if (!aiPrompt.trim() && type !== "reply") {
      setAiError("Veuillez entrer des instructions pour l'IA");
      return;
    }
    
    setIsGenerating(true);
    setAiError("");
    
    try {
      let prompt = "";
      
      if (type === "compose") {
        prompt = `Écris un email professionnel en français pour: ${aiPrompt}
        
Instructions:
- Utilise un ton professionnel mais amical
- Structure l'email avec une salutation, le corps du message, et une formule de politesse
- Sois concis et clair
- N'ajoute pas de signature
- Réponds uniquement avec le contenu de l'email`;

      } else if (type === "reply") {
        prompt = `Écris une réponse professionnelle en français à cet email:

EMAIL ORIGINAL:
De: ${replyToEmail?.fromName || replyToEmail?.from}
Sujet: ${replyToEmail?.subject}
Contenu: ${replyToEmail?.snippet}

INSTRUCTIONS POUR LA RÉPONSE:
${aiPrompt || "Réponse polie et professionnelle"}

- Utilise un ton professionnel mais amical
- Référence l'email original si nécessaire
- Sois concis et clair
- N'ajoute pas de signature
- Réponds uniquement avec le contenu de l'email de réponse`;

      } else if (type === "improve") {
        prompt = `Améliore ce texte d'email en français, rends-le plus professionnel et clair:

EMAIL À AMÉLIORER:
${content}

INSTRUCTIONS D'AMÉLIORATION:
${aiPrompt}

- Garde le sens original
- Améliore la clarté et le professionnalisme
- Corrige l'orthographe et la grammaire
- Structure mieux le texte
- Réponds uniquement avec le texte amélioré`;
      }

      const response = await fetch('/api/ai/compose-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.content) {
        let emailContent = data.content.trim();
        emailContent = emailContent.replace(/^(Email|Voici l'email|Réponse|Contenu de l'email):\s*/i, '');
        emailContent = emailContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        
        if (type === "compose" || type === "reply") {
          const lines = emailContent.split('\n');
          let foundSubject = false;
          let bodyStart = 0;
          
          for (let i = 0; i < Math.min(3, lines.length); i++) {
            const line = lines[i].trim();
            if (line.match(/^(Sujet|Subject|Objet):\s*/i)) {
              const extractedSubject = line.replace(/^(Sujet|Subject|Objet):\s*/i, '').trim();
              if (extractedSubject && type === "compose") {
                setSubject(extractedSubject);
              }
              foundSubject = true;
              bodyStart = i + 1;
              break;
            }
          }
          
          const bodyContent = foundSubject 
            ? lines.slice(bodyStart).join('\n').trim()
            : emailContent;
            
          setContent(bodyContent);
        } else {
          setContent(emailContent);
        }
        
        setAiPrompt("");
      } else {
        throw new Error("Aucun contenu généré par l'IA");
      }
      
    } catch (error: any) {
      console.error("Erreur génération IA:", error);
      setAiError(error.message || "Erreur lors de la génération. Vérifiez votre connexion.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    const emailText = `À: ${to}\nSujet: ${subject}\n\n${content}`;
    navigator.clipboard.writeText(emailText);
    alert("Email copié dans le presse-papier !");
  };

  const quickPrompts = [
    "Demande de réunion pour la semaine prochaine",
    "Relance polie pour une facture en attente",
    "Remerciements pour la collaboration",
    "Demande d'informations complémentaires", 
    "Confirmation de réception",
    "Demande de report de délai"
  ];

  // NOUVEAU : Affichage du succès d'envoi
  if (sendSuccess) {
    return (
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-green-800 mb-2">Email envoyé !</h2>
        <p className="text-gray-600 mb-4">Votre email a été envoyé avec succès.</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Fermer
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[95vh] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          {replyToEmail ? "✉️ Répondre avec IA" : "📝 Nouveau message avec IA"}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
              showAiPanel 
                ? "bg-purple-600 text-white" 
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Assistant IA
          </button>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            title="Copier l'email"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Panneau IA amélioré */}
        {showAiPanel && (
          <div className="w-96 border-r bg-gradient-to-b from-purple-50 to-blue-50 overflow-auto">
            <div className="p-4">
              <h3 className="font-semibold mb-3 text-purple-800 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                🤖 Assistant IA Avancé
              </h3>
              
              {/* NOUVEAU : Sélecteur de mode IA */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Mode IA:</label>
                <select
                  value={aiMode}
                  onChange={(e) => setAiMode(e.target.value as any)}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="compose">📝 Composition</option>
                  <option value="smart_reply">💬 Réponses multiples</option>
                  <option value="tone_analyzer">🎭 Analyse du ton</option>
                  <option value="meeting_scheduler">📅 Planifier réunion</option>
                </select>
              </div>
              
              <div className="space-y-4">
                {/* Instructions */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Instructions:
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={
                      aiMode === "meeting_scheduler" 
                        ? "Ex: Réunion de suivi projet, présentation des résultats"
                        : aiMode === "tone_analyzer"
                        ? "Analyse automatique du ton - pas d'instructions nécessaires"
                        : "Ex: Écris un email de relance pour un devis en attente"
                    }
                    className="w-full h-20 p-3 border rounded text-sm resize-none focus:ring-2 focus:ring-purple-300"
                    disabled={isGenerating}
                  />
                </div>

                {/* Boutons selon le mode */}
                <div className="space-y-2">
                  {aiMode === "compose" && (
                    <button
                      onClick={() => handleAiGenerate("compose")}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Composer l'email
                    </button>
                  )}

                  {aiMode === "smart_reply" && replyToEmail && (
                    <button
                      onClick={handleSmartReplies}
                      disabled={isGenerating}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      Générer 3 options
                    </button>
                  )}

                  {aiMode === "tone_analyzer" && (
                    <button
                      onClick={handleToneAnalysis}
                      disabled={isGenerating || !content.trim()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 transition-colors font-medium"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                      Analyser le ton
                    </button>
                  )}

                  {aiMode === "meeting_scheduler" && (
                    <button
                      onClick={handleMeetingGenerator}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                      Créer invitation
                    </button>
                  )}

                  {/* Bouton améliorer (toujours disponible) */}
                  <button
                    onClick={() => handleAiGenerate("improve")}
                    disabled={isGenerating || !content.trim()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Améliorer le texte
                  </button>
                </div>

                {/* NOUVEAU : Affichage des réponses multiples */}
                {smartReplies && (
                  <div className="bg-white border rounded p-3">
                    <h4 className="font-medium text-sm mb-2 text-blue-600">💬 Options de réponse:</h4>
                    <div className="space-y-2">
                      {smartReplies.formal && (
                        <button
                          onClick={() => setContent(smartReplies.formal)}
                          className="w-full text-left p-2 text-xs bg-blue-50 border rounded hover:bg-blue-100"
                        >
                          <strong>Formelle:</strong> {smartReplies.formal.substring(0, 60)}...
                        </button>
                      )}
                      {smartReplies.friendly && (
                        <button
                          onClick={() => setContent(smartReplies.friendly)}
                          className="w-full text-left p-2 text-xs bg-green-50 border rounded hover:bg-green-100"
                        >
                          <strong>Amicale:</strong> {smartReplies.friendly.substring(0, 60)}...
                        </button>
                      )}
                      {smartReplies.concise && (
                        <button
                          onClick={() => setContent(smartReplies.concise)}
                          className="w-full text-left p-2 text-xs bg-gray-50 border rounded hover:bg-gray-100"
                        >
                          <strong>Concise:</strong> {smartReplies.concise.substring(0, 60)}...
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* NOUVEAU : Analyse du ton */}
                {toneAnalysis && (
                  <div className="bg-white border rounded p-3">
                    <h4 className="font-medium text-sm mb-2 text-orange-600">🎭 Analyse du ton:</h4>
                    <div className="text-xs space-y-1">
                      <div><strong>Ton:</strong> {toneAnalysis.tone}</div>
                      <div><strong>Sentiment:</strong> {toneAnalysis.sentiment}</div>
                      {toneAnalysis.suggestions && (
                        <div>
                          <strong>Suggestions:</strong>
                          <ul className="ml-2 mt-1">
                            {toneAnalysis.suggestions.map((suggestion: string, index: number) => (
                              <li key={index}>• {suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Prompts rapides (mode composition seulement) */}
                {aiMode === "compose" && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Prompts rapides:
                    </label>
                    <div className="grid grid-cols-1 gap-1">
                      {quickPrompts.map((prompt, index) => (
                        <button
                          key={index}
                          onClick={() => setAiPrompt(prompt)}
                          className="text-left p-2 text-xs bg-white border rounded hover:bg-purple-50 hover:border-purple-300 transition-colors"
                          disabled={isGenerating}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Erreur */}
                {aiError && (
                  <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded text-sm">
                    ❌ {aiError}
                  </div>
                )}

                {/* Email original si réponse */}
                {replyToEmail && (
                  <div className="bg-white border rounded p-3">
                    <h4 className="font-medium text-sm mb-2 text-blue-600">📧 Email original:</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div><strong>De:</strong> {replyToEmail.fromName || replyToEmail.from}</div>
                      <div><strong>Sujet:</strong> {replyToEmail.subject}</div>
                      <div className="mt-2 p-2 bg-gray-50 rounded max-h-24 overflow-y-auto">
                        {replyToEmail.snippet}
                      </div>
                    </div>
                  </div>
                )}

                {/* Statut */}
                <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                  {isGenerating ? (
                    <div className="flex items-center gap-2 text-purple-600">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Génération en cours...
                    </div>
                  ) : (
                    <div>
                      ✅ Groq IA prêt - Llama 3.1 + Fonctions avancées
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire email */}
        <div className="flex-1 p-4 flex flex-col overflow-hidden">
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">À:</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="destinataire@email.com"
                className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sujet:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Objet du message"
                className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <label className="block text-sm font-medium mb-1">Message:</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tapez votre message ici ou utilisez l'IA pour le générer..."
              className="flex-1 p-3 border rounded resize-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
            />
          </div>

          <div className="flex justify-between items-center gap-3 mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">
              {content.length > 0 && (
                <span>{content.length} caractères</span>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              
              {/* NOUVEAU : Bouton envoi réel */}
              <button
                onClick={handleRealSend}
                disabled={!to.trim() || !subject.trim() || !content.trim() || isSending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Envoyer maintenant
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}