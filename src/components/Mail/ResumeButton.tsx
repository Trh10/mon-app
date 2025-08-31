"use client";
import React from 'react';
import { useAI } from '../AIContext';

export default function ResumeButton({ email }: { email: any }) {
  const { setSummaryData, setSelectedEmailForAI, isLoadingAI, setIsLoadingAI } = useAI();

  async function handleResume() {
    if (!email?.content) {
      setSummaryData({ 
        summary: "Aucun contenu à résumer", 
        urgency: "low",
        error: "Email vide"
      });
      return;
    }

    setIsLoadingAI(true);
    setSelectedEmailForAI(email);
    setSummaryData(null); // Reset previous summary
    
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: email.content,
          subject: email.subject || '',
          from: email.from || ''
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const data = await response.json();
      
      setSummaryData({
        summary: data.summary,
        urgency: data.urgency,
        highlights: data.keyPoints,
        actions: data.actionItems,
        language: data.sentiment,
        loading: false
      });

    } catch (error: any) {
      console.error('Erreur résumé:', error);
      setSummaryData({
        summary: "Erreur lors du résumé",
        urgency: "unknown",
        error: error.message,
        loading: false
      });
    } finally {
      setIsLoadingAI(false);
    }
  }

  return (
    <button 
      onClick={handleResume}
      disabled={isLoadingAI}
      className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-full text-sm disabled:opacity-50"
    >
      {isLoadingAI ? "Analyse..." : "🧠 Résumer"}
    </button>
  );
}