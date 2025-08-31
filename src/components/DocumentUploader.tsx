"use client";

import { useState } from "react";
import { Upload, FileText, X, Loader } from "lucide-react";
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
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <h3 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
        <Upload className="w-4 h-4" />
        📄 Analyser un document
      </h3>

      {/* Zone de drop */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          dragOver ? "border-blue-400 bg-blue-100" : "border-blue-300 bg-white",
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
          <div className="text-blue-600">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
            <div className="font-medium">Analyse en cours...</div>
            <div className="text-sm mt-1">Extraction et résumé du document</div>
          </div>
        ) : (
          <>
            <FileText className="w-12 h-12 mx-auto text-blue-400 mb-3" />
            <div className="text-blue-700 font-medium mb-2">
              Glissez un document ici ou cliquez pour sélectionner
            </div>
            <div className="text-blue-600 text-sm mb-3">
              PDF, Word (.docx), ou fichiers texte supportés
            </div>
            <label
              htmlFor="document-upload"
              className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded cursor-pointer hover:bg-blue-700 transition-colors"
            >
              Sélectionner un fichier
            </label>
          </>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <div className="font-medium">❌ Erreur d'analyse</div>
          <div>{error}</div>
        </div>
      )}

      {/* Résultat de l'analyse */}
      {analysis && (
        <div className="mt-4 space-y-3">
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-green-800">✅ Analyse terminée</div>
              <button 
                onClick={() => setAnalysis(null)}
                className="text-green-600 hover:text-green-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-sm space-y-2">
              <div>
                <strong>Fichier:</strong> {analysis.filename}
              </div>
              <div>
                <strong>Taille:</strong> {Math.round(analysis.fileSize / 1024)} Ko
              </div>
              <div>
                <strong>Temps de lecture:</strong> {analysis.estimatedReadTime} min
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {analysis.tags.map((tag, i) => (
              <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                {tag}
              </span>
            ))}
          </div>

          {/* Résumé */}
          <div className="bg-white border rounded p-3">
            <div className="font-medium text-gray-800 mb-2">📝 Résumé</div>
            <p className="text-sm text-gray-600">{analysis.summary}</p>
          </div>

          {/* Découvertes clés */}
          {analysis.keyFindings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="font-medium text-yellow-800 mb-2">🔍 Découvertes clés</div>
              <ul className="text-sm text-yellow-700 space-y-1">
                {analysis.keyFindings.map((finding, i) => (
                  <li key={i}>• {finding}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Urgence */}
          <div className={cn(
            "border rounded p-3",
            analysis.urgency === 'high' ? "bg-red-50 border-red-200" :
            analysis.urgency === 'medium' ? "bg-yellow-50 border-yellow-200" :
            "bg-green-50 border-green-200"
          )}>
            <div className={cn(
              "font-medium mb-1",
              analysis.urgency === 'high' ? "text-red-800" :
              analysis.urgency === 'medium' ? "text-yellow-800" :
              "text-green-800"
            )}>
              {analysis.urgency === 'high' ? '🚨 Urgence élevée' :
               analysis.urgency === 'medium' ? '⚠️ Urgence moyenne' :
               '✅ Urgence faible'}
            </div>
            <div className="text-sm text-gray-600">
              Basé sur l'analyse du contenu du document
            </div>
          </div>
        </div>
      )}
    </div>
  );
}