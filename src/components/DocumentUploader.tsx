"use client";

import { useState } from "react";
import { Upload, FileText, X, Loader, CheckCircle, AlertTriangle, Clock, Tag, FileWarning, Sparkles } from "lucide-react";
import { cn } from "@lib/cn";

type DocumentAnalysis = {
  filename: string;
  fileType: string;
  fileSize: number;
  summary: string;
  keyFindings: string[];
  urgency: "low" | "medium" | "high";
  estimatedReadTime: number;
  tags: string[];
  extractedText: string;
};

export function DocumentUploader() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file) return;
    
    setUploading(true);
    setError(null);
    setAnalysis(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/ai/analyze-document', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        const result = await res.json();
        setAnalysis(result);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || `Erreur ${res.status}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files[0]) handleFile(files[0]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files[0]) handleFile(files[0]);
  };

  return (
    <div className="space-y-4">
      {/* Zone de drop - Design Premium */}
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300",
          dragOver 
            ? "border-cyan-500 dark:border-cyan-400 bg-cyan-100 dark:bg-cyan-500/20 scale-[1.02]" 
            : "border-gray-300 dark:border-white/30 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-400 dark:hover:border-white/50",
          uploading && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileInput}
          className="hidden"
          id="document-upload"
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="text-cyan-600 dark:text-cyan-300 py-4">
            <Loader className="w-10 h-10 animate-spin mx-auto mb-3" />
            <div className="font-bold text-lg">Analyse en cours...</div>
            <div className="text-sm text-gray-500 dark:text-white/60 mt-2">Extraction et résumé du document avec l'IA</div>
          </div>
        ) : (
          <>
            <FileText className="w-14 h-14 mx-auto text-cyan-500 dark:text-cyan-400/80 mb-4" />
            <div className="text-gray-900 dark:text-white font-semibold text-lg mb-2">
              Glissez un document ici
            </div>
            <div className="text-gray-500 dark:text-white/60 text-sm mb-4">
              PDF, Word (.docx), ou fichiers texte supportés
            </div>
            <label
              htmlFor="document-upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-xl cursor-pointer hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 hover:scale-105 shadow-lg shadow-cyan-500/30"
            >
              <Upload className="w-4 h-4" />
              Sélectionner un fichier
            </label>
          </>
        )}
      </div>

      {/* Erreur - Design Premium */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-400/30 rounded-xl">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold mb-1">
            <FileWarning className="w-5 h-5" />
            Erreur d'analyse
          </div>
          <div className="text-red-600 dark:text-red-200/80 text-sm">{error}</div>
        </div>
      )}

      {/* Résultat de l'analyse - Design Premium */}
      {analysis && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* En-tête succès */}
          <div className="p-4 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-400/30 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-lg">
                <CheckCircle className="w-6 h-6" />
                Analyse terminée !
              </div>
              <button 
                onClick={() => setAnalysis(null)}
                className="p-2 rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-600 dark:text-white/70 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-2 bg-gray-100 dark:bg-white/10 rounded-lg">
                <div className="text-gray-500 dark:text-white/60 text-xs">Fichier</div>
                <div className="text-gray-900 dark:text-white font-medium truncate">{analysis.filename}</div>
              </div>
              <div className="p-2 bg-gray-100 dark:bg-white/10 rounded-lg">
                <div className="text-gray-500 dark:text-white/60 text-xs">Taille</div>
                <div className="text-gray-900 dark:text-white font-medium">{Math.round(analysis.fileSize / 1024)} Ko</div>
              </div>
              <div className="p-2 bg-gray-100 dark:bg-white/10 rounded-lg flex items-center gap-1">
                <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-300" />
                <div>
                  <div className="text-gray-500 dark:text-white/60 text-xs">Lecture</div>
                  <div className="text-gray-900 dark:text-white font-medium">{analysis.estimatedReadTime} min</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {analysis.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Tag className="w-4 h-4 text-cyan-600 dark:text-cyan-300" />
              {analysis.tags.map((tag, i) => (
                <span key={i} className="px-3 py-1 bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-400/30 text-cyan-700 dark:text-cyan-200 rounded-full text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Résumé */}
          <div className="p-4 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-xl">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold mb-3">
              <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              Résumé IA
            </div>
            <p className="text-gray-700 dark:text-white/90 text-sm leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Découvertes clés */}
          {analysis.keyFindings.length > 0 && (
            <div className="p-4 bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-400/30 rounded-xl">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold mb-3">
                <AlertTriangle className="w-5 h-5" />
                Points clés identifiés
              </div>
              <ul className="space-y-2">
                {analysis.keyFindings.map((finding, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-white/90 text-sm">
                    <span className="text-amber-500 dark:text-amber-400 mt-0.5">•</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Urgence */}
          <div className={cn(
            "p-4 rounded-xl border",
            analysis.urgency === 'high' 
              ? "bg-red-100 dark:bg-red-500/20 border-red-200 dark:border-red-400/30" 
              : analysis.urgency === 'medium' 
                ? "bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-400/30" 
                : "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-400/30"
          )}>
            <div className={cn(
              "flex items-center gap-2 font-semibold text-lg",
              analysis.urgency === 'high' 
                ? "text-red-700 dark:text-red-300" 
                : analysis.urgency === 'medium' 
                  ? "text-amber-700 dark:text-amber-300" 
                  : "text-emerald-700 dark:text-emerald-300"
            )}>
              {analysis.urgency === 'high' ? '🚨 Urgence élevée' :
               analysis.urgency === 'medium' ? '⚠️ Urgence moyenne' :
               '✅ Urgence faible'}
            </div>
            <div className="text-gray-600 dark:text-white/70 text-sm mt-1">
              Niveau d'urgence basé sur l'analyse du contenu du document
            </div>
          </div>
        </div>
      )}
    </div>
  );
}