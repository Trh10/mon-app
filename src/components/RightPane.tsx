"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUI } from "@/store";
import type { Email } from "@/lib/types";
import { ExpandedEmailReader } from "@/components/ExpandedEmailReader";
import { DocumentUploader } from "@/components/DocumentUploader";
import { EmailComposer } from "@/components/EmailComposer";
import {
  Mail, Maximize2, Minimize2, User, Clock,
  Brain, Stars, Lightbulb, FileText, CheckCircle2,
  Loader2, ChevronDown, ChevronRight, Wand2, Sparkles, Upload, ShieldAlert,
  CheckSquare, Users, Package, Globe,
  PenTool, Reply, Send, Zap, Eye, EyeOff, X
} from "lucide-react";
import { extractFromGmailMessage } from "@/lib/mail/extract";

type AIResult = {
  summary: string;
  highlights?: string[];
  actions?: string[];
  language?: string;
  urgency?: "low" | "medium" | "high";
  error?: string;
  // NOUVEAU : champs pour résumé multiple
  emailCount?: number;
  subjects?: string[];
  senders?: string[];
  urgentEmails?: number;
  // NOUVEAU : Fonctionnalités IA avancées
  category?: string;
  sentiment?: "positive" | "negative" | "neutral";
  suggestedReplies?: string[];
  translation?: { [key: string]: string };
  confidence?: number;
  keywords?: string[];
  priority?: number;
};

function isValidGmailId(id?: string | null) {
  if (!id) return false;
  return /^[a-f0-9]{8,}$/i.test(id);
}

async function fetchEmailDetail(id: string) {
  const res = await fetch(`/api/google/message?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`message ${id} -> ${res.status}`);
  return res.json();
}

async function summarizePayload(payload: { 
  subject: string; 
  bodyHtml?: string; 
  bodyText?: string; 
  lang?: "fr" | "en";
  // NOUVEAU : pour résumé multiple
  isMultiple?: boolean;
  emailCount?: number;
  subjects?: string[];
}) {
  const res = await fetch("/api/ai/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  const summary =
    data?.summary ??
    data?.text ??
    data?.content ??
    data?.result ??
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    "";

  const highlights = data?.highlights ?? data?.key_points ?? data?.bullets ?? [];
  const actions = data?.actions ?? data?.next_steps ?? [];
  const language = data?.language ?? payload.lang ?? "fr";
  const urgency = data?.urgency ?? "low";

  if (!res.ok || !String(summary).trim()) {
    console.warn("[RightPane] summarize: empty or error", res.status, data);
    return { error: data?.error || "Résumé indisponible" } as AIResult;
  }
  
  return {
    summary: String(summary),
    highlights: Array.isArray(highlights) ? highlights : [],
    actions: Array.isArray(actions) ? actions : [],
    language,
    urgency,
    // Transférer les infos multiples
    emailCount: payload.emailCount,
    subjects: payload.subjects,
  } as AIResult;
}

export function RightPane({
  items,
  onRefresh,
  // NOUVEAU : prop pour les emails cochés
  checkedEmails,
}: {
  items: Email[];
  onRefresh?: () => void;
  checkedEmails?: Set<string>;
}) {
  const { selectedEmailId } = useUI();
  const [currentTab, setCurrentTab] = useState("summary");

  const [expandedView, setExpandedView] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // MODIFIÉ : Auto-résumé désactivé par défaut
  const [autoSummarize, setAutoSummarize] = useState<boolean>(false);
  const [autoAdvanced, setAutoAdvanced] = useState<boolean>(false);

  // NOUVEAU : État pour le mode plein écran du panneau droit entier
  const [rightPaneFullscreen, setRightPaneFullscreen] = useState(false);

  const [aiBusy, setAiBusy] = useState(false);
  const [ai, setAi] = useState<AIResult | null>(null);
  const [openCards, setOpenCards] = useState<{ [key: string]: boolean }>({
    summary: true, points: true, actions: true, meta: true,
  });

  const [freeText, setFreeText] = useState("");
  const lastSummarizedId = useRef<string | null>(null);

  // NOUVEAU : State pour le mode de résumé
  const [summaryMode, setSummaryMode] = useState<"single" | "multiple">("single");

  // NOUVEAU : States pour les fonctionnalités IA avancées
  const [aiAdvanced, setAiAdvanced] = useState<{
    classification?: string;
    sentiment?: "positive" | "negative" | "neutral";
    suggestedReplies?: string[];
    translation?: { [key: string]: string };
    priority?: number;
    provider?: string; // NOUVEAU : Indicateur du provider utilisé
    responseTime?: number; // NOUVEAU : Temps de réponse
  } | null>(null);
  const [loadingAdvanced, setLoadingAdvanced] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("en");

  // NOUVEAU : States pour la rédaction IA
  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState<"new" | "reply">("new");

  // NOUVEAU : States pour sections flexibles/redimensionnables
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    preview: false,
    aiAdvanced: false,
    analysis: false,
    document: false,
  });

  // SIMPLIFIÉ : Plus besoin de contrôles de taille - tout est dans une seule page scrollable

  const email = useMemo(() => items.find((e) => e.id === selectedEmailId), [items, selectedEmailId]);
  const validId = isValidGmailId(selectedEmailId);

  // NOUVEAU : Emails cochés
  const checkedEmailsList = useMemo(() => {
    if (!checkedEmails || checkedEmails.size === 0) return [];
    return items.filter(item => checkedEmails.has(item.id));
  }, [items, checkedEmails]);

  useEffect(() => {
    try { localStorage.setItem("__auto_sum", autoSummarize ? "1" : "0"); } catch {}
  }, [autoSummarize]);
  useEffect(() => {
    try { localStorage.setItem("__auto_adv_ai", autoAdvanced ? "1" : "0"); } catch {}
  }, [autoAdvanced]);

  // NOUVEAU : Déterminer le mode automatiquement
  useEffect(() => {
    if (checkedEmailsList.length > 1) {
      setSummaryMode("multiple");
    } else if (email) {
      setSummaryMode("single");
    }
  }, [checkedEmailsList.length, email]);

  // Charger le détail quand l'email change
  useEffect(() => {
    setAi(null);
    setFreeText("");
    setDetail(null);
    setLoadingDetail(false);
    lastSummarizedId.current = null;

    if (!selectedEmailId) {
      console.debug("[RightPane] aucun email sélectionné");
      return;
    }
    if (!validId) {
      console.debug("[RightPane] id invalide ignoré:", selectedEmailId);
      return;
    }

    (async () => {
      try {
        setLoadingDetail(true);
        console.debug("[RightPane] fetch detail:", selectedEmailId);
        const d = await fetchEmailDetail(selectedEmailId);
        setDetail(d);
      } catch (e) {
        console.warn("[RightPane] détail email KO:", e);
      } finally {
        setLoadingDetail(false);
      }
    })();
  }, [selectedEmailId, validId]);

  // Résumé auto si Auto ON ou si onglet "summary" actif
  useEffect(() => {
    if (!email || !selectedEmailId) return;

    const shouldRun =
      (autoSummarize && lastSummarizedId.current !== selectedEmailId) ||
      currentTab === "summary";

    if (!shouldRun) return;

    (async () => {
      let subject = email.subject || "";
      let bodyHtml: string | undefined;
      let bodyText: string | undefined = email.snippet || "";

      if (detail) {
        const { subject: s, bodyHtml: h, bodyText: t } = extractFromGmailMessage(detail);
        subject = s || subject;
        bodyHtml = h;
        bodyText = t || bodyText;
      }

      if (!subject && !bodyHtml && !bodyText) {
        console.debug("[RightPane] rien à résumer");
        return;
      }

      setAiBusy(true);
      console.debug("[RightPane] summarize start:", { id: selectedEmailId, subject, snippetLen: (email.snippet || "").length });
      const result = await summarizePayload({ subject, bodyHtml, bodyText, lang: "fr" });
      setAi(result);
      setAiBusy(false);
      lastSummarizedId.current = selectedEmailId;

      try {
        if (!(result as any).error) {
          (window as any).__aiOpen?.({
            source: "email",
            subject,
            summary: result.summary,
            highlights: result.highlights,
            actions: result.actions,
            language: result.language,
          });
        }
      } catch {}
    })();
  }, [autoSummarize, email?.id, detail?.id, selectedEmailId, currentTab]);

  // NOUVEAU : Fonction pour résumer un seul email
  async function handleSummarizeClick() {
    if (!email) return;
    let subject = email.subject || "";
    let bodyHtml: string | undefined;
    let bodyText: string | undefined = email.snippet || "";

    if (detail) {
      const { subject: s, bodyHtml: h, bodyText: t } = extractFromGmailMessage(detail);
      subject = s || subject;
      bodyHtml = h;
      bodyText = t || bodyText;
    }

    if (!subject && !bodyHtml && !bodyText) return;

    setCurrentTab("summary");
    setAiBusy(true);
    console.debug("[RightPane] summarize (manual) start:", { id: selectedEmailId });
    const result = await summarizePayload({ subject, bodyHtml, bodyText, lang: "fr" });
    setAi(result);
    setAiBusy(false);
    lastSummarizedId.current = selectedEmailId || null;
  }

  // NOUVEAU : Fonction pour résumer plusieurs emails cochés
  async function handleSummarizeMultiple() {
    if (checkedEmailsList.length === 0) return;

    setAiBusy(true);
    setCurrentTab("summary");
    
    try {
      console.debug("[RightPane] summarize multiple emails:", checkedEmailsList.length);
      
      // Collecter toutes les infos des emails cochés
      const subjects = checkedEmailsList.map(e => e.subject || "Sans sujet");
      const senders = checkedEmailsList.map(e => e.fromName || e.from || "Expéditeur inconnu");
      const urgentCount = checkedEmailsList.filter(e => 
        e.priority === "P1" || 
        (e.subject && /urgent|asap|emergency|critical/i.test(e.subject))
      ).length;
      
      // Construire un résumé consolidé
      const consolidatedText = checkedEmailsList.map((email, index) => {
        return `EMAIL ${index + 1}:
Sujet: ${email.subject || "Sans sujet"}
De: ${email.fromName || email.from || "Inconnu"}
Date: ${new Date(email.date).toLocaleDateString()}
Aperçu: ${email.snippet || "Pas d'aperçu"}
---`;
      }).join('\n\n');

      const multipleSubject = `Résumé groupé de ${checkedEmailsList.length} emails`;
      
      // Appeler l'API avec toutes les infos
      const result = await summarizePayload({ 
        subject: multipleSubject,
        bodyText: consolidatedText,
        lang: "fr",
        isMultiple: true,
        emailCount: checkedEmailsList.length,
        subjects: subjects
      });

      // Ajouter les métadonnées spécifiques au résumé multiple
      const enhancedResult = {
        ...result,
        emailCount: checkedEmailsList.length,
        subjects: subjects,
        senders: senders,
        urgentEmails: urgentCount
      };

      setAi(enhancedResult);
      console.debug("[RightPane] multiple summary completed");
      
    } catch (error) {
      console.error("[RightPane] error summarizing multiple emails:", error);
      setAi({
        summary: "Erreur lors du résumé groupé",
        error: "Impossible de résumer les emails sélectionnés",
        emailCount: checkedEmailsList.length
      });
    } finally {
      setAiBusy(false);
    }
  }

  // NOUVEAU : Fonctions IA avancées
  async function analyzeEmailAdvanced(emailContent: { subject: string; content: string; from: string }) {
    setLoadingAdvanced(true);
    const startTime = Date.now();
    let usedProvider = "fallback";
    
    try {
      // Tous les appels en parallèle pour la vitesse
      const [classifyRes, sentimentRes, priorityRes, repliesRes] = await Promise.allSettled([
        fetch("/api/ai/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailContent),
        }).then(r => r.json()),
        
        fetch("/api/ai/sentiment", {
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailContent),
        }).then(r => r.json()),
        
        fetch("/api/ai/predict-priority", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailContent),
        }).then(r => r.json()),
        
        fetch("/api/ai/suggest-replies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailContent),
        }).then(r => r.json())
      ]);

      const responseTime = Date.now() - startTime;
      
      // Extraire les données des résultats
      const classification = classifyRes.status === "fulfilled" ? classifyRes.value : {};
      const sentiment = sentimentRes.status === "fulfilled" ? sentimentRes.value : {};
      const priority = priorityRes.status === "fulfilled" ? priorityRes.value : {};
      const replies = repliesRes.status === "fulfilled" ? repliesRes.value : {};

      // Déterminer le provider utilisé (prendre le premier disponible)
      if (sentiment.provider) usedProvider = sentiment.provider;
      else if (priority.provider) usedProvider = priority.provider;
      else if (classification.provider) usedProvider = classification.provider;

      setAiAdvanced({
        classification: classification.category || "Général",
        sentiment: sentiment.sentiment || "neutral",
        suggestedReplies: replies.suggestions || [],
        priority: priority.priority || 3,
        provider: usedProvider,
        responseTime
      });

      console.log(`🤖 Analyse IA avancée terminée avec ${usedProvider} en ${responseTime}ms:`, {
        classification: classification.category,
        sentiment: sentiment.sentiment,
        priority: priority.priority,
        repliesCount: replies.suggestions?.length || 0,
      });
    } catch (error) {
      console.error("❌ Erreur analyse IA avancée:", error);
      setAiAdvanced({
        provider: "fallback",
        responseTime: Date.now() - startTime
      });
    } finally {
      setLoadingAdvanced(false);
    }
  }

  // NOUVEAU : Traduction automatique
  async function translateEmail(text: string, targetLang: string) {
    try {
      const response = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage: targetLang }),
      });
      const data = await response.json();
      
      if (data.translation) {
        setAiAdvanced(prev => ({
          ...prev,
          translation: { [targetLang]: data.translation }
        }));
        setShowTranslation(true);
      }
    } catch (error) {
      console.error("❌ Erreur traduction:", error);
    }
  }

  // NOUVEAU : Auto-analyse quand un email est sélectionné
  useEffect(() => {
  if (!email || !detail) return;
  if (!autoAdvanced) return; // ne lance pas si auto off

    const { subject: s, bodyText: content } = extractFromGmailMessage(detail);
    const emailContent = {
      subject: s || email.subject || "",
      content: content || email.snippet || "",
      from: email.from || ""
    };

    if (emailContent.subject || emailContent.content) {
      analyzeEmailAdvanced(emailContent);
    }
  }, [email?.id, detail?.id]);

  async function handleAnalyzeFreeText() {
    const text = freeText.trim();
    if (!text) return;
    setAiBusy(true);
    const result = await summarizePayload({ subject: "Analyse de contenu", bodyText: text, lang: "fr" });
    setAi(result);
    setAiBusy(false);
  }

  // NOUVEAU : Fonction pour gérer l'envoi d'emails
  const handleEmailSend = (emailData: { to: string; subject: string; content: string }) => {
    console.log("📧 Email à envoyer:", emailData);
    
    // Ici tu peux ajouter l'intégration avec l'API Gmail pour envoyer
    // Pour l'instant, on simule
    alert(`Email généré avec IA !
    
À: ${emailData.to}
Sujet: ${emailData.subject}
    
Contenu: ${emailData.content.substring(0, 150)}...

(Intégration envoi Gmail à venir)`);
    
    setShowComposer(false);
  };

  const importanceChip = (() => {
    const level = ai?.urgency || "low";
    if (level === "high") return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Très important</span>;
    if (level === "medium") return <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs">Important</span>;
    return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">Normal</span>;
  })();

  if (expandedView && selectedEmailId) {
    return (
      <div className="h-full">
        <ExpandedEmailReader
          messageId={selectedEmailId}
          onBack={() => setExpandedView(false)}
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden transition-colors duration-300">
      {/* Background subtil - only dark mode */}
      <div className="absolute inset-0 opacity-0 dark:opacity-30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
      </div>
      
      {/* TOUT LE CONTENU DANS UNE SEULE PAGE SCROLLABLE */}
      <div className="flex-1 overflow-auto relative z-10 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-white/20 scrollbar-track-transparent">
        <div className="p-6 space-y-6">
          
          {/* Bouton plein écran flottant */}
          <button
            onClick={() => setRightPaneFullscreen(true)}
            className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-lg border border-gray-200 dark:border-white/20 transition-all z-20"
            title="Plein écran"
          >
            <Maximize2 className="w-4 h-4 text-gray-600 dark:text-white/70" />
          </button>

          {/* === SECTION HEADER / TITRE === */}
          {summaryMode === "multiple" && checkedEmailsList.length > 0 ? (
            <div className="pb-4 border-b border-gray-200 dark:border-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <CheckSquare className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {checkedEmailsList.length} emails sélectionnés
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSummarizeMultiple}
                  disabled={aiBusy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-500/30 border border-purple-200 dark:border-purple-400/30 transition-all text-sm"
                >
                  {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  Résumer tout
                </button>
                <button
                  onClick={() => { setComposerMode("new"); setShowComposer(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-500/30 border border-blue-200 dark:border-blue-400/30 transition-all text-sm"
                >
                  <PenTool className="w-4 h-4" />
                  Rédiger
                </button>
                <button
                  onClick={() => setSummaryMode("single")}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 transition-all text-sm"
                >
                  Retour
                </button>
              </div>
            </div>
          ) : email ? (
            <div className="pb-4 border-b border-gray-200 dark:border-white/10 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {(() => {
                      const level = ai?.urgency || "low";
                      if (level === "high") return <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 text-xs">Urgent</span>;
                      if (level === "medium") return <span className="px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 text-xs">Important</span>;
                      return <span className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">Normal</span>;
                    })()}
                    {email.unread && <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">Non lu</span>}
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate transition-colors">{email.subject || "Sans sujet"}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-white/60 transition-colors">
                    <span>{email.fromName || email.from}</span>
                    <span>•</span>
                    <span>{new Date(email.date).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={handleSummarizeClick}
                  disabled={aiBusy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-500/30 border border-purple-200 dark:border-purple-400/30 transition-all text-sm"
                >
                  {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  Résumer
                </button>
                <button
                  onClick={() => { setComposerMode("reply"); setShowComposer(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-500/30 border border-blue-200 dark:border-blue-400/30 transition-all text-sm"
                >
                  <Reply className="w-4 h-4" />
                  Répondre IA
                </button>
                <button
                  onClick={() => { setComposerMode("new"); setShowComposer(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 border border-emerald-200 dark:border-emerald-400/30 transition-all text-sm"
                >
                  <PenTool className="w-4 h-4" />
                  Nouveau IA
                </button>
                <button
                  onClick={() => setAutoSummarize((v) => !v)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${autoSummarize ? "bg-purple-100 dark:bg-purple-500/20 border-purple-200 dark:border-purple-400/30 text-purple-700 dark:text-purple-300" : "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50"}`}
                >
                  <Wand2 className="w-4 h-4" />
                  Auto
                </button>
              </div>
            </div>
          ) : (
            <div className="pb-4 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-6 h-6 text-purple-500 dark:text-purple-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assistant IA</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-white/50">
                Sélectionnez un email ou uploadez un document à analyser
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setComposerMode("new"); setShowComposer(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 border border-emerald-200 dark:border-emerald-400/30 transition-all text-sm"
                >
                  <PenTool className="w-4 h-4" />
                  Composer avec IA
                </button>
                {checkedEmailsList.length > 0 && (
                  <button
                    onClick={() => setSummaryMode("multiple")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-500/30 border border-purple-200 dark:border-purple-400/30 transition-all text-sm"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Résumer {checkedEmailsList.length} emails
                  </button>
                )}
              </div>
            </div>
          )}

          {/* === APERÇU EMAIL === */}
          {email && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-white/70 flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" />
                Aperçu
                {loadingDetail && <Loader2 className="w-3 h-3 animate-spin text-gray-400 dark:text-white/50" />}
              </h3>
              <p className="text-sm text-gray-700 dark:text-white/80 leading-relaxed">{email.snippet}</p>
            </div>
          )}

          {/* === EMAILS SÉLECTIONNÉS (MODE MULTIPLE) === */}
          {summaryMode === "multiple" && checkedEmailsList.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-white/70 flex items-center gap-2 mb-3">
                <Package className="w-4 h-4" />
                Emails sélectionnés
              </h3>
              <div className="space-y-2">
                {checkedEmailsList.slice(0, 5).map((em, index) => (
                  <div key={em.id} className="flex items-center gap-3 p-2 bg-gray-100 dark:bg-white/5 rounded-lg text-sm">
                    <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/30 text-purple-700 dark:text-purple-200 text-xs">#{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 dark:text-white truncate">{em.subject || "Sans sujet"}</div>
                      <div className="text-gray-500 dark:text-white/50 text-xs">{em.fromName || em.from}</div>
                    </div>
                  </div>
                ))}
                {checkedEmailsList.length > 5 && (
                  <div className="text-center text-gray-400 dark:text-white/40 text-sm">
                    + {checkedEmailsList.length - 5} autres
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === INTELLIGENCE ARTIFICIELLE === */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-white/70 flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              Intelligence Artificielle
              {loadingAdvanced && <Loader2 className="w-3 h-3 animate-spin" />}
            </h3>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-100 dark:bg-white/5 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-white/50 mb-1">Classification</div>
                {aiAdvanced?.classification ? (
                  <div className="text-sm text-blue-600 dark:text-blue-300">{aiAdvanced.classification}</div>
                ) : (
                  <div className="text-xs text-gray-400 dark:text-white/30">—</div>
                )}
              </div>
              <div className="bg-gray-100 dark:bg-white/5 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-white/50 mb-1">Sentiment</div>
                {aiAdvanced?.sentiment ? (
                  <div className={`text-sm ${aiAdvanced.sentiment === "positive" ? "text-emerald-600 dark:text-emerald-300" : aiAdvanced.sentiment === "negative" ? "text-red-600 dark:text-red-300" : "text-gray-600 dark:text-white/70"}`}>
                    {aiAdvanced.sentiment === "positive" ? "😊 Positif" : aiAdvanced.sentiment === "negative" ? "😞 Négatif" : "😐 Neutre"}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 dark:text-white/30">—</div>
                )}
              </div>
              <div className="bg-gray-100 dark:bg-white/5 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-white/50 mb-1">Priorité</div>
                {aiAdvanced?.priority ? (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${i < aiAdvanced.priority! ? "bg-red-400" : "bg-gray-300 dark:bg-white/20"}`} />
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 dark:text-white/30">—</div>
                )}
              </div>
            </div>

            {/* Traduction - compact */}
            <div className="flex gap-2 items-center mb-4">
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="text-xs bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded px-2 py-1.5 text-gray-900 dark:text-white"
              >
                <option value="en" className="bg-white dark:bg-slate-900">Anglais</option>
                <option value="es" className="bg-white dark:bg-slate-900">Espagnol</option>
                <option value="de" className="bg-white dark:bg-slate-900">Allemand</option>
              </select>
              <button
                onClick={() => {
                  const content = detail ? extractFromGmailMessage(detail).bodyText : email?.snippet;
                  if (content) translateEmail(content, targetLanguage);
                }}
                disabled={!email || loadingAdvanced}
                className="text-xs px-3 py-1.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-500/30 disabled:opacity-50"
              >
                Traduire
              </button>
            </div>
            {aiAdvanced?.translation && showTranslation && (
              <div className="mb-4 bg-gray-100 dark:bg-white/5 rounded-lg p-3 text-sm text-gray-700 dark:text-white/80">
                {aiAdvanced.translation[targetLanguage]}
              </div>
            )}
          </div>

          {/* === ANALYSE DÉTAILLÉE === */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-white/70 flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              Analyse détaillée
            </h3>

            <div className="space-y-3">
              {/* Résumé */}
              <div className="bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden">
                <button onClick={() => setOpenCards(s => ({ ...s, summary: !s.summary }))} className="w-full flex items-center justify-between p-3 hover:bg-gray-200 dark:hover:bg-white/5">
                  <span className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                    Résumé IA
                  </span>
                  {openCards.summary ? <ChevronDown className="w-4 h-4 text-gray-500 dark:text-white/50" /> : <ChevronRight className="w-4 h-4 text-gray-500 dark:text-white/50" />}
                </button>
                {openCards.summary && (
                  <div className="px-3 pb-3 text-sm text-gray-600 dark:text-white/70">
                    {aiBusy ? (
                      <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Analyse...</div>
                    ) : ai?.summary ? (
                      <p className="whitespace-pre-wrap">{ai.summary}</p>
                    ) : (
                      <p className="text-gray-400 dark:text-white/40">Cliquez "Résumer" pour générer</p>
                    )}
                  </div>
                )}
              </div>

              {/* Points clés */}
              <div className="bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden">
                <button onClick={() => setOpenCards(s => ({ ...s, points: !s.points }))} className="w-full flex items-center justify-between p-3 hover:bg-gray-200 dark:hover:bg-white/5">
                  <span className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <Stars className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    Points clés
                  </span>
                  {openCards.points ? <ChevronDown className="w-4 h-4 text-gray-500 dark:text-white/50" /> : <ChevronRight className="w-4 h-4 text-gray-500 dark:text-white/50" />}
                </button>
                {openCards.points && (
                  <div className="px-3 pb-3 text-sm">
                    {ai?.highlights?.length ? (
                      <ul className="space-y-1">
                        {ai.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-600 dark:text-white/70">
                            <span className="w-1 h-1 bg-indigo-500 dark:bg-indigo-400 rounded-full mt-2"></span>
                            {h}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 dark:text-white/40">Aucun point clé</p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions suggérées */}
              <div className="bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden">
                <button onClick={() => setOpenCards(s => ({ ...s, actions: !s.actions }))} className="w-full flex items-center justify-between p-3 hover:bg-gray-200 dark:hover:bg-white/5">
                  <span className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    Actions suggérées
                  </span>
                  {openCards.actions ? <ChevronDown className="w-4 h-4 text-gray-500 dark:text-white/50" /> : <ChevronRight className="w-4 h-4 text-gray-500 dark:text-white/50" />}
                </button>
                {openCards.actions && (
                  <div className="px-3 pb-3 text-sm">
                    {ai?.actions?.length ? (
                      <ul className="space-y-1">
                        {ai.actions.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-600 dark:text-white/70">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mt-0.5" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 dark:text-white/40">Aucune action</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* === ANALYSE DE TEXTE LIBRE === */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-white/70 flex items-center gap-2 mb-4">
              <Upload className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              Analyse de texte / document
            </h3>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div>
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-sm text-gray-900 dark:text-white min-h-[120px] focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-white/30 placeholder-gray-400 dark:placeholder-white/30 resize-y"
                  placeholder="Collez du texte à analyser..."
                />
                <button
                  onClick={handleAnalyzeFreeText}
                  disabled={aiBusy || !freeText.trim()}
                  className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-200 dark:hover:bg-cyan-500/30 disabled:opacity-50 border border-cyan-200 dark:border-cyan-400/30 transition-all text-sm"
                >
                  {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  Analyser
                </button>
              </div>
              <div>
                <DocumentUploader />
              </div>
            </div>
          </div>

          {/* === FOOTER STATS === */}
          <div className="pt-4 border-t border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-white/40 flex flex-wrap gap-3">
            <span>Emails: {items.length}</span>
            <span>Cochés: {checkedEmailsList.length}</span>
            <span>Mode: {summaryMode === "multiple" ? "Groupé" : "Simple"}</span>
            <span>Auto: {autoSummarize ? "✓" : "✗"}</span>
          </div>

        </div>
      </div>

      {/* Modal EmailComposer */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <EmailComposer
            replyToEmail={composerMode === "reply" ? email : null}
            initialTo={composerMode === "reply" ? email?.from : ""}
            initialSubject={composerMode === "reply" ? `Re: ${email?.subject}` : ""}
            onClose={() => setShowComposer(false)}
            onSend={handleEmailSend}
          />
        </div>
      )}

      {/* Modal plein écran */}
      {rightPaneFullscreen && (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-[9999] flex flex-col overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
          </div>
          
          {/* Header modal */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 z-10">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              Assistant IA - Plein écran
            </h2>
            <button
              onClick={() => setRightPaneFullscreen(false)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          {/* Contenu modal */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Analyse de texte */}
              <div>
                <h3 className="text-sm font-medium text-white/70 mb-3">Analyse de texte</h3>
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white min-h-[200px] focus:outline-none focus:ring-1 focus:ring-white/30 placeholder-white/30 resize-y"
                  placeholder="Collez du texte à analyser..."
                />
                <button
                  onClick={handleAnalyzeFreeText}
                  disabled={aiBusy || !freeText.trim()}
                  className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50 border border-purple-400/30 transition-all"
                >
                  {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  Analyser avec l'IA
                </button>
              </div>
              
              {/* Résultats */}
              {ai && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-white/70 mb-3">Résultats</h3>
                  {ai.summary && <p className="text-white/80 mb-4">{ai.summary}</p>}
                  {ai.highlights && ai.highlights.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs text-white/50 mb-2">Points clés</h4>
                      <ul className="space-y-1">
                        {ai.highlights.map((h: string, i: number) => (
                          <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                            <span className="w-1 h-1 bg-purple-400 rounded-full mt-2"></span>
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {/* Upload */}
              <div>
                <h3 className="text-sm font-medium text-white/70 mb-3">Upload de document</h3>
                <DocumentUploader />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
