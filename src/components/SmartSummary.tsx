"use client";

import { useState, useEffect } from "react";
import { Brain, Loader, TrendingUp, Clock, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { cn } from "@lib/cn";

type SummaryData = {
  summary: string;
  urgency: "low" | "medium" | "high";
  keyPoints: string[];
  actionItems: string[];
  sentiment: "positive" | "neutral" | "negative";
  estimatedReadTime: number;
  emailType?: string;
};

export function SmartSummary({ 
  emailId, 
  emailContent, 
  emailSubject = "",
  emailFrom = "",
  visible = true 
}: { 
  emailId?: string;
  emailContent?: string;
  emailSubject?: string;
  emailFrom?: string;
  visible?: boolean;
}) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateSummary() {
    if (!emailContent) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: emailContent,
          subject: emailSubject,
          from: emailFrom
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || `Erreur ${res.status}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  // Si pas d'email sélectionné
  if (!emailContent || !emailId) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-200">
        <div className="text-center">
          <div className="relative mb-4">
            <Brain className="w-16 h-16 mx-auto text-purple-400" />
            <Sparkles className="w-6 h-6 absolute -top-1 -right-1 text-purple-500 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-purple-800 mb-2">
            🧠 IA Prête à analyser
          </h3>
          <p className="text-purple-600 text-sm mb-4">
            L'intelligence artificielle est prête à analyser votre email sélectionné.
          </p>
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <div className="text-purple-700 font-medium mb-2">Fonctionnalités disponibles :</div>
            <div className="space-y-2 text-sm text-purple-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Résumé automatique intelligent</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Détection d'urgence avancée</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Analyse de sentiment</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Suggestions d'actions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-purple-300">
      <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-3 border-b border-purple-300">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-purple-800 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            🧠 Résumé IA
          </h3>
          <button
            onClick={generateSummary}
            disabled={loading || !emailContent}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Analyse...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                Générer
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <div className="font-medium text-red-700">❌ Erreur d'analyse</div>
            <div>{error}</div>
            <button 
              onClick={generateSummary}
              className="mt-2 text-red-600 underline hover:no-underline text-xs"
            >
              🔄 Réessayer
            </button>
          </div>
        )}

        {!summary && !loading && !error && (
          <div className="text-center py-6">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border border-purple-200">
              <Brain className="w-12 h-12 mx-auto mb-3 text-purple-500" />
              <div className="text-purple-700 font-bold mb-2">
                📧 Email sélectionné !
              </div>
              <div className="text-purple-600 text-sm mb-4">
                Sujet: <span className="font-medium text-purple-800">{emailSubject}</span>
              </div>
              <div className="text-purple-600 text-sm mb-4">
                De: <span className="font-medium text-purple-800">{emailFrom}</span>
              </div>
              <button 
                onClick={generateSummary}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium flex items-center gap-2 mx-auto"
              >
                <Sparkles className="w-4 h-4" />
                🚀 Lancer l'analyse IA
              </button>
            </div>
          </div>
        )}

        {summary && (
          <div className="space-y-4">
            {/* Badge urgence */}
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold border-2",
              summary.urgency === 'high' ? "bg-red-100 text-red-700 border-red-300" :
              summary.urgency === 'medium' ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
              "bg-green-100 text-green-700 border-green-300"
            )}>
              {summary.urgency === 'high' ? <AlertTriangle className="w-4 h-4" /> :
               summary.urgency === 'medium' ? <Clock className="w-4 h-4" /> :
               <CheckCircle className="w-4 h-4" />}
              {summary.urgency === 'high' ? '🚨 URGENT' : 
               summary.urgency === 'medium' ? '⚠️ IMPORTANT' : '✅ NORMAL'}
            </div>

            {/* Résumé */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-4">
              <div className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                📝 Résumé intelligent
              </div>
              <p className="text-blue-700 leading-relaxed">{summary.summary}</p>
            </div>

            {/* Métriques */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border-2 border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-700">Lecture</span>
                </div>
                <div className="font-bold text-blue-600 text-lg">{summary.estimatedReadTime} min</div>
              </div>
              <div className="bg-white border-2 border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">
                    {summary.sentiment === 'positive' ? '😊' : 
                     summary.sentiment === 'negative' ? '😟' : '😐'}
                  </span>
                  <span className="font-medium text-gray-700">Sentiment</span>
                </div>
                <div className="font-bold text-gray-600 capitalize">{summary.sentiment}</div>
              </div>
            </div>

            {/* Points clés */}
            {summary.keyPoints.length > 0 && (
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-4">
                <div className="font-bold text-yellow-800 mb-3">🎯 Points clés identifiés</div>
                <ul className="space-y-2">
                  {summary.keyPoints.map((point, i) => (
                    <li key={i} className="text-yellow-700 bg-white p-2 rounded border-l-4 border-yellow-400 text-sm">
                      • {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            {summary.actionItems.length > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-4">
                <div className="font-bold text-green-800 mb-3">⚡ Actions recommandées</div>
                <ul className="space-y-2">
                  {summary.actionItems.map((action, i) => (
                    <li key={i} className="text-green-700 bg-white p-2 rounded border-l-4 border-green-400 text-sm">
                      • {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button 
              onClick={() => setSummary(null)}
              className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              🔄 Nouvelle analyse
            </button>
          </div>
        )}
      </div>
    </div>
  );
}