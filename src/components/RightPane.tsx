"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUI } from "@/store";
import type { Email } from "@/lib/types";
import { ExpandedEmailReader } from "@/components/ExpandedEmailReader";
import { DocumentUploader } from "@/components/DocumentUploader";
import { EmailComposer } from "@/components/EmailComposer"; // NOUVEAU
import {
  Mail, Maximize2, User, Clock, AlertTriangle,
  Brain, Stars, Lightbulb, FileText, CheckCircle2,
  Loader2, ChevronDown, ChevronRight, Wand2, Sparkles, Upload, ShieldAlert,
  CheckSquare, Users, Package, Globe,
  PenTool, Reply, Send // NOUVEAU - Icônes pour la rédaction
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

  const [autoSummarize, setAutoSummarize] = useState<boolean>(() => {
    try { return localStorage.getItem("__auto_sum") !== "0"; } catch { return true; }
  });

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
    <div className="h-full flex flex-col bg-white">
      {/* NOUVEAU : Header adaptatif selon le mode */}
      {summaryMode === "multiple" && checkedEmailsList.length > 0 ? (
        // Header pour mode multiple
        <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium flex items-center gap-1">
                  <CheckSquare className="w-4 h-4" />
                  Mode multiple
                </span>
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
                  {checkedEmailsList.length} emails sélectionnés
                </span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Résumé groupé de {checkedEmailsList.length} emails
              </h2>
              <div className="mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {new Set(checkedEmailsList.map(e => e.from)).size} expéditeurs
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    {checkedEmailsList.filter(e => e.unread).length} non lus
                  </span>
                  {checkedEmailsList.some(e => e.priority === "P1") && (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                      Emails urgents détectés
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={handleSummarizeMultiple}
              disabled={aiBusy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60 font-medium"
              title="Résumer tous les emails sélectionnés"
            >
              {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              Résumer {checkedEmailsList.length} emails
            </button>
            
            {/* NOUVEAU : Boutons de rédaction pour mode multiple */}
            <button
              onClick={() => {
                setComposerMode("new");
                setShowComposer(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              title="Rédiger un email basé sur ces emails"
            >
              <PenTool className="w-4 h-4" />
              Rédiger IA
            </button>
            
            <button
              onClick={() => setSummaryMode("single")}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              title="Revenir au mode email unique"
            >
              Retour mode simple
            </button>
          </div>
        </div>
      ) : email ? (
        // Header pour mode simple (existant) avec NOUVEAUX boutons de rédaction
        <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {importanceChip}
                {email.unread && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">Non lu</span>}
                {checkedEmailsList.length > 0 && (
                  <button
                    onClick={() => setSummaryMode("multiple")}
                    className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs hover:bg-purple-200 cursor-pointer"
                    title="Voir le mode multiple"
                  >
                    {checkedEmailsList.length} cochés - Cliquer pour mode groupé
                  </button>
                )}
              </div>
              <h2 className="text-lg font-semibold text-gray-900 truncate">{email.subject}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span className="truncate">{email.fromName || email.from}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(email.date).toLocaleString()}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpandedView(true)}
                className="p-2 hover:bg-gray-100 rounded-full"
                title="Ouvrir en plein écran"
              >
                <Maximize2 className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={handleSummarizeClick}
              disabled={aiBusy}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
              title="Résumer cet email"
            >
              {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              Résumer
            </button>
            
            {/* NOUVEAU : Boutons de rédaction pour mode simple */}
            <button
              onClick={() => {
                setComposerMode("reply");
                setShowComposer(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              title="Répondre avec IA"
            >
              <Reply className="w-4 h-4" />
              Répondre IA
            </button>
            
            <button
              onClick={() => {
                setComposerMode("new");
                setShowComposer(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700"
              title="Nouveau email avec IA"
            >
              <PenTool className="w-4 h-4" />
              Nouveau IA
            </button>
            
            <button
              onClick={() => setAutoSummarize((v) => !v)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${autoSummarize ? "border-purple-500 text-purple-700 bg-purple-50" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              title="Activer/Désactiver le résumé auto"
            >
              <Wand2 className="w-4 h-4" />
              Auto
            </button>
            <button
              onClick={() => (window as any).__aiOpen?.({ subject: email.subject, summary: ai?.summary || email.snippet || "Aperçu", highlights: ai?.highlights || [], actions: ai?.actions || [] })}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              title="Ouvrir le panneau IA"
            >
              <Sparkles className="w-4 h-4" />
              Ouvrir le panneau
            </button>
          </div>
        </div>
      ) : (
        // Header par défaut avec NOUVEAU bouton de rédaction
        <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="text-center">
            <Mail className="w-10 h-10 mx-auto text-purple-400 mb-3" />
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Assistant IA</h2>
            <p className="text-sm text-gray-600">
              Sélectionnez un email à gauche{checkedEmailsList.length > 0 ? `, ou résumez les ${checkedEmailsList.length} emails cochés` : ""}, ou uploadez un document à analyser.
            </p>
            
            {/* NOUVEAU : Boutons d'actions générales */}
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => {
                  setComposerMode("new");
                  setShowComposer(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
              >
                <PenTool className="w-4 h-4" />
                Composer avec IA
              </button>
              
              {checkedEmailsList.length > 0 && (
                <button
                  onClick={() => setSummaryMode("multiple")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700"
                >
                  <CheckSquare className="w-4 h-4" />
                  Résumer {checkedEmailsList.length} emails cochés
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4">
          {/* NOUVEAU : Preview pour mode multiple */}
          {summaryMode === "multiple" && checkedEmailsList.length > 0 && (
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-purple-500" />
                Emails sélectionnés ({checkedEmailsList.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {checkedEmailsList.slice(0, 5).map((email, index) => (
                  <div key={email.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                    <span className="font-medium text-purple-600">#{index + 1}</span>
                    <div className="flex-1 truncate">
                      <div className="font-medium truncate">{email.subject || "Sans sujet"}</div>
                      <div className="text-gray-500 text-xs truncate">{email.fromName || email.from}</div>
                    </div>
                    {email.priority === "P1" && <AlertTriangle className="w-3 h-3 text-red-500" />}
                  </div>
                ))}
                {checkedEmailsList.length > 5 && (
                  <div className="text-center text-gray-500 text-sm">
                    ... et {checkedEmailsList.length - 5} autres emails
                  </div>
                )}
              </div>
              
              {/* NOUVEAU : Actions IA pour mode multiple */}
              <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
                  <Send className="w-4 h-4" />
                  Actions IA disponibles:
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setComposerMode("new");
                      setShowComposer(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    <PenTool className="w-3 h-3" />
                    Rédiger basé sur ces emails
                  </button>
                  
                  {checkedEmailsList.length === 1 && (
                    <button
                      onClick={() => {
                        setComposerMode("reply");
                        setShowComposer(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      <Reply className="w-3 h-3" />
                      Répondre IA
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Preview simple pour mode single */}
          {summaryMode === "single" && email && (
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  Aperçu
                </h3>
                {loadingDetail && <span className="text-xs text-blue-600">Chargement du contenu…</span>}
              </div>
              <p className="text-sm text-gray-700 mt-2">{email.snippet}</p>
              
              {/* NOUVEAU : Actions IA pour email unique */}
              <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  Rédaction IA:
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setComposerMode("reply");
                      setShowComposer(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    <Reply className="w-3 h-3" />
                    Répondre IA
                  </button>
                  
                  <button
                    onClick={() => {
                      setComposerMode("new");
                      setShowComposer(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    <PenTool className="w-3 h-3" />
                    Nouveau IA
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NOUVEAU : Cards d'analyse IA avancée */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-purple-800 flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5" />
              🤖 Intelligence Artificielle Avancée
              {loadingAdvanced && (
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              )}
              {aiAdvanced?.provider && (
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                  {aiAdvanced.provider === "groq" && "⚡ Groq"}
                  {aiAdvanced.provider === "openai" && "🤖 OpenAI"} 
                  {aiAdvanced.provider === "anthropic" && "🧠 Claude"}
                  {aiAdvanced.provider === "fallback" && "🔄 Fallback"}
                  {aiAdvanced.responseTime && ` (${aiAdvanced.responseTime}ms)`}
                </span>
              )}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Classification automatique */}
              <div className="bg-white border rounded-lg p-3 shadow-sm">
                <h4 className="font-medium text-gray-800 flex items-center gap-2 text-sm mb-2">
                  <CheckSquare className="w-4 h-4 text-blue-500" />
                  Classification
                </h4>
                {aiAdvanced?.classification ? (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {aiAdvanced.classification}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">Analyse en cours...</div>
                )}
              </div>

              {/* Analyse de sentiment */}
              <div className="bg-white border rounded-lg p-3 shadow-sm">
                <h4 className="font-medium text-gray-800 flex items-center gap-2 text-sm mb-2">
                  <Stars className="w-4 h-4 text-green-500" />
                  Sentiment
                </h4>
                {aiAdvanced?.sentiment ? (
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      aiAdvanced.sentiment === "positive" ? "bg-green-100 text-green-700" :
                      aiAdvanced.sentiment === "negative" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {aiAdvanced.sentiment === "positive" ? "😊 Positif" :
                       aiAdvanced.sentiment === "negative" ? "😞 Négatif" : "😐 Neutre"}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">Analyse en cours...</div>
                )}
              </div>

              {/* Priorité prédite */}
              <div className="bg-white border rounded-lg p-3 shadow-sm">
                <h4 className="font-medium text-gray-800 flex items-center gap-2 text-sm mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Priorité IA
                </h4>
                {aiAdvanced?.priority ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < (aiAdvanced.priority || 0) ? "bg-red-500" : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600">{aiAdvanced.priority}/5</span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">Calcul en cours...</div>
                )}
              </div>
            </div>

            {/* Réponses suggérées */}
            {aiAdvanced?.suggestedReplies && aiAdvanced.suggestedReplies.length > 0 && (
              <div className="mt-4 bg-white border rounded-lg p-3 shadow-sm">
                <h4 className="font-medium text-gray-800 flex items-center gap-2 text-sm mb-3">
                  <Reply className="w-4 h-4 text-blue-500" />
                  💬 Réponses suggérées par IA
                </h4>
                <div className="space-y-2">
                  {aiAdvanced.suggestedReplies.slice(0, 3).map((reply, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="text-sm text-gray-700 mb-2">{reply}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setComposerMode("reply");
                            setShowComposer(true);
                            // Pré-remplir avec la réponse suggérée
                          }}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Utiliser cette réponse
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(reply)}
                          className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          Copier
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Traduction */}
            <div className="mt-4 bg-white border rounded-lg p-3 shadow-sm">
              <h4 className="font-medium text-gray-800 flex items-center gap-2 text-sm mb-3">
                <Globe className="w-4 h-4 text-indigo-500" />
                🌍 Traduction automatique
              </h4>
              <div className="flex gap-2 items-center mb-3">
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="en">🇺🇸 Anglais</option>
                  <option value="es">🇪🇸 Espagnol</option>
                  <option value="de">🇩🇪 Allemand</option>
                  <option value="it">🇮🇹 Italien</option>
                  <option value="pt">🇵🇹 Portugais</option>
                  <option value="zh">🇨🇳 Chinois</option>
                  <option value="ja">🇯🇵 Japonais</option>
                  <option value="ar">🇸🇦 Arabe</option>
                </select>
                <button
                  onClick={() => {
                    const content = detail ? extractFromGmailMessage(detail).bodyText : email?.snippet;
                    if (content) {
                      translateEmail(content, targetLanguage);
                    }
                  }}
                  disabled={!email || loadingAdvanced}
                  className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60"
                >
                  Traduire
                </button>
              </div>
              
              {aiAdvanced?.translation && showTranslation && (
                <div className="bg-indigo-50 border border-indigo-200 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-indigo-800">Traduction en {targetLanguage}:</span>
                    <button
                      onClick={() => setShowTranslation(false)}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-sm text-gray-700">{aiAdvanced.translation[targetLanguage]}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(aiAdvanced.translation?.[targetLanguage] || "")}
                    className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 mt-2"
                  >
                    Copier traduction
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Cards d'analyse - mises à jour pour le mode multiple */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border rounded-lg shadow-sm">
              <button onClick={() => setOpenCards((s)=>({ ...s, summary: !s.summary }))} className="w-full flex items-center justify-between p-3 border-b">
                <span className="font-semibold text-purple-800 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  {summaryMode === "multiple" ? "Résumé groupé" : "Résumé IA"}
                </span>
                {openCards.summary ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {openCards.summary && (
                <div className="p-3">
                  {aiBusy ? (
                    <div className="flex items-center gap-2 text-purple-700">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyse en cours…</span>
                    </div>
                  ) : ai?.error ? (
                    <div className="bg-red-100 text-red-700 border border-red-300 p-3 rounded">{ai.error}</div>
                  ) : ai ? (
                    <div className="space-y-3">
                      {ai.emailCount && ai.emailCount > 1 && (
                        <div className="bg-purple-50 p-3 rounded border">
                          <div className="text-sm font-medium text-purple-700 mb-1">
                            📊 Résumé de {ai.emailCount} emails
                          </div>
                          {ai.urgentEmails && ai.urgentEmails > 0 && (
                            <div className="text-xs text-red-600">
                              ⚠️ {ai.urgentEmails} email(s) marqué(s) comme urgent(s)
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {ai.summary}
                      </p>
                    </div>
                  ) : summaryMode === "multiple" ? (
                    <div className="text-sm text-gray-500">Cliquez "Résumer {checkedEmailsList.length} emails" pour générer le résumé groupé.</div>
                  ) : email ? (
                    <div className="text-sm text-gray-500">Clique "Résumer" pour générer le résumé.</div>
                  ) : (
                    <div className="text-sm text-gray-500">Aucun contenu.</div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white border rounded-lg shadow-sm">
              <button onClick={() => setOpenCards((s)=>({ ...s, points: !s.points }))} className="w-full flex items-center justify-between p-3 border-b">
                <span className="font-semibold text-indigo-800 flex items-center gap-2">
                  <Stars className="w-5 h-5" />
                  Points clés
                </span>
                {openCards.points ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {openCards.points && (
                <div className="p-3">
                  {ai?.highlights?.length ? (
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {ai.highlights.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  ) : (
                    <div className="text-sm text-gray-500">Aucun point clé disponible.</div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white border rounded-lg shadow-sm">
              <button onClick={() => setOpenCards((s)=>({ ...s, actions: !s.actions }))} className="w-full flex items-center justify-between p-3 border-b">
                <span className="font-semibold text-emerald-800 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Actions suggérées
                </span>
                {openCards.actions ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {openCards.actions && (
                <div className="p-3">
                  {ai?.actions?.length ? (
                    <ul className="text-sm space-y-2">
                      {ai.actions.map((a, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-gray-500">Aucune action proposée.</div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white border rounded-lg shadow-sm">
              <button onClick={() => setOpenCards((s)=>({ ...s, meta: !s.meta }))} className="w-full flex items-center justify-between p-3 border-b">
                <span className="font-semibold text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Importance & Détails
                </span>
                {openCards.meta ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {openCards.meta && (
                <div className="p-3 text-sm text-gray-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Niveau:</span>
                    {(() => {
                      const level = ai?.urgency || "low";
                      if (level === "high") return <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">ÉLEVÉ</span>;
                      if (level === "medium") return <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">MOYEN</span>;
                      return <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">FAIBLE</span>;
                    })()}
                  </div>
                  {ai?.emailCount && ai.emailCount > 1 && (
                    <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded">
                      📧 Analyse de {ai.emailCount} emails groupés
                      {ai.senders && (
                        <div className="mt-1">
                          👥 {new Set(ai.senders).size} expéditeurs différents
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {ai?.language ? `Langue détectée: ${ai.language}` : "Langue: n/d"}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section d'analyse de texte libre - inchangée */}
          <div className="bg-white border rounded-lg shadow-sm">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="font-semibold text-blue-800 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Analyse d'un document ou texte
              </div>
            </div>
            <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600">Collez du texte à analyser</label>
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  className="mt-1 w-full border rounded p-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Collez ici le contenu d'un document ou d'un mail…"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={handleAnalyzeFreeText}
                    disabled={aiBusy || !freeText.trim()}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                    Analyser ce texte
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600">Uploader un fichier (PDF, DOCX, etc.)</label>
                <div className="mt-1 border rounded p-2">
                  <DocumentUploader />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Après upload, copiez/collez le texte du document ci‑contre pour une analyse immédiate.
                </p>
              </div>
            </div>
          </div>

          {/* Footer avec statistiques mises à jour */}
          <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-600">
            <div className="flex flex-wrap items-center gap-3">
              <span>Emails chargés: <b>{items.length}</b></span>
              <span>Email sélectionné: <b>{email ? "Oui" : "Non"}</b></span>
              <span>Emails cochés: <b>{checkedEmailsList.length}</b></span>
              <span>Mode: <b>{summaryMode === "multiple" ? "Groupé" : "Simple"}</b></span>
              <span>Résumé auto: <b>{autoSummarize ? "Activé" : "Désactivé"}</b></span>
              {!validId && selectedEmailId ? <span className="text-red-600">ID invalide (ignoré pour l'analyse)</span> : null}
            </div>
          </div>

        </div>
      </div>

      {/* NOUVEAU : Modal EmailComposer */}
      {showComposer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <EmailComposer
            replyToEmail={composerMode === "reply" ? email : null}
            initialTo={composerMode === "reply" ? email?.from : ""}
            initialSubject={composerMode === "reply" ? `Re: ${email?.subject}` : ""}
            onClose={() => setShowComposer(false)}
            onSend={handleEmailSend}
          />
        </div>
      )}
    </div>
  );
}