"use client";
import { useState } from "react";
import { 
  Send, Sparkles, Loader2, Copy, X, Wand2, ArrowRight, 
  CheckCircle, Mail, Brain, Languages, Calendar, Repeat,
  PenSquare, Zap, MessageSquare
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
      <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-auto p-8 text-center border border-gray-200 dark:border-white/10 transition-colors">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Email envoyé !</h2>
        <p className="text-gray-500 dark:text-white/60 mb-6 transition-colors">Votre message a été envoyé avec succès.</p>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/30"
        >
          Fermer
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-white/10 transition-colors">
      {/* Header Premium */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 backdrop-blur-sm transition-colors">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3 transition-colors">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/30">
            <PenSquare className="w-5 h-5 text-white" />
          </div>
          {replyToEmail ? "Répondre avec IA" : "Nouveau message"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              showAiPanel 
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30" 
                : "bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white/70 hover:bg-gray-300 dark:hover:bg-white/20"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Assistant IA
          </button>
          <button
            onClick={copyToClipboard}
            className="p-2.5 bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white/70 rounded-xl hover:bg-gray-300 dark:hover:bg-white/20 transition-all"
            title="Copier"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-white/70 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Panneau IA Premium */}
        {showAiPanel && (
          <div className="w-80 border-r border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 backdrop-blur-sm overflow-auto transition-colors">
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 dark:text-white transition-colors">
                <Brain className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                <span className="font-semibold">Assistant IA</span>
              </div>
              
              {/* Mode IA */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-white/50 mb-2 transition-colors">Mode:</label>
                <select
                  value={aiMode}
                  onChange={(e) => setAiMode(e.target.value as any)}
                  className="w-full p-3 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer transition-colors"
                >
                  <option value="compose" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">📝 Composition</option>
                  <option value="smart_reply" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">💬 Réponses multiples</option>
                  <option value="tone_analyzer" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">🎭 Analyse du ton</option>
                  <option value="meeting_scheduler" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">📅 Planifier réunion</option>
                </select>
              </div>
              
              <div className="space-y-4">
                {/* Instructions */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-white/50 mb-2 transition-colors">
                    Instructions:
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={
                      aiMode === "meeting_scheduler" 
                        ? "Ex: Réunion de suivi projet, présentation des résultats"
                        : aiMode === "tone_analyzer"
                        ? "Analyse automatique du ton"
                        : "Ex: Écris un email de relance pour un devis en attente"
                    }
                    className="w-full h-20 p-3 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400 dark:placeholder-white/30 transition-colors"
                    disabled={isGenerating}
                  />
                </div>

                {/* Boutons selon le mode */}
                <div className="space-y-2">
                  {aiMode === "compose" && (
                    <button
                      onClick={() => handleAiGenerate("compose")}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/20"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Composer l'email
                    </button>
                  )}

                  {aiMode === "smart_reply" && replyToEmail && (
                    <button
                      onClick={handleSmartReplies}
                      disabled={isGenerating}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                      Générer 3 options
                    </button>
                  )}

                  {aiMode === "tone_analyzer" && (
                    <button
                      onClick={handleToneAnalysis}
                      disabled={isGenerating || !content.trim()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition-all shadow-lg shadow-orange-500/20"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                      Analyser le ton
                    </button>
                  )}

                  {aiMode === "meeting_scheduler" && (
                    <button
                      onClick={handleMeetingGenerator}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                      Créer invitation
                    </button>
                  )}

                  {/* Bouton améliorer */}
                  <button
                    onClick={() => handleAiGenerate("improve")}
                    disabled={isGenerating || !content.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 transition-all border border-white/10"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Améliorer le texte
                  </button>
                </div>

                {/* Réponses multiples */}
                {smartReplies && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                    <h4 className="text-xs font-medium text-blue-400">💬 Options de réponse:</h4>
                    {smartReplies.formal && (
                      <button
                        onClick={() => setContent(smartReplies.formal)}
                        className="w-full text-left p-2 text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-lg hover:bg-blue-500/20"
                      >
                        <strong>Formelle:</strong> {smartReplies.formal.substring(0, 50)}...
                      </button>
                    )}
                    {smartReplies.friendly && (
                      <button
                        onClick={() => setContent(smartReplies.friendly)}
                        className="w-full text-left p-2 text-xs bg-green-500/10 text-green-300 border border-green-500/20 rounded-lg hover:bg-green-500/20"
                      >
                        <strong>Amicale:</strong> {smartReplies.friendly.substring(0, 50)}...
                      </button>
                    )}
                    {smartReplies.concise && (
                      <button
                        onClick={() => setContent(smartReplies.concise)}
                        className="w-full text-left p-2 text-xs bg-white/5 text-white/70 border border-white/10 rounded-lg hover:bg-white/10"
                      >
                        <strong>Concise:</strong> {smartReplies.concise.substring(0, 50)}...
                      </button>
                    )}
                  </div>
                )}

                {/* Analyse du ton */}
                {toneAnalysis && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <h4 className="text-xs font-medium text-orange-400 mb-2">🎭 Analyse:</h4>
                    <div className="text-xs text-white/70 space-y-1">
                      <div><span className="text-white/50">Ton:</span> {toneAnalysis.tone}</div>
                      <div><span className="text-white/50">Sentiment:</span> {toneAnalysis.sentiment}</div>
                    </div>
                  </div>
                )}

                {/* Prompts rapides */}
                {aiMode === "compose" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-white/50 mb-2 transition-colors">
                      Suggestions:
                    </label>
                    <div className="space-y-1">
                      {quickPrompts.map((prompt, index) => (
                        <button
                          key={index}
                          onClick={() => setAiPrompt(prompt)}
                          className="w-full text-left p-2.5 text-xs bg-white dark:bg-white/5 text-gray-700 dark:text-white/70 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:border-purple-300 dark:hover:border-purple-500/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all"
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
                  <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs transition-colors">
                    ❌ {aiError}
                  </div>
                )}

                {/* Statut */}
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-white/40 bg-gray-100 dark:bg-white/5 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 transition-colors">
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-purple-500 dark:text-purple-400" />
                      <span className="text-purple-600 dark:text-purple-400">Génération...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3 text-green-500 dark:text-green-400" />
                      <span>IA prête</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire email Premium */}
        <div className="flex-1 p-6 flex flex-col overflow-hidden">
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-white/50 mb-2 transition-colors">À:</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="destinataire@email.com"
                className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-white/50 mb-2 transition-colors">Sujet:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Objet du message"
                className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <label className="block text-xs font-medium text-gray-500 dark:text-white/50 mb-2 transition-colors">Message:</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tapez votre message ici ou utilisez l'IA pour le générer..."
              className="flex-1 p-4 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-white/10 transition-colors">
            <div className="text-sm text-gray-500 dark:text-white/40 transition-colors">
              {content.length > 0 && (
                <span>{content.length} caractères</span>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white rounded-xl hover:bg-gray-300 dark:hover:bg-white/20 transition-all border border-gray-300 dark:border-white/10"
              >
                Annuler
              </button>
              
              <button
                onClick={handleRealSend}
                disabled={!to.trim() || !subject.trim() || !content.trim() || isSending}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Envoyer
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