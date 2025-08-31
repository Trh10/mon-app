"use client";
import React from 'react';
import { useAI } from './AIContext';

export default function ResumeButton({ email }: { email: any }) {
  const { setSummaryData, setSelectedEmail, isLoading, setIsLoading } = useAI();

  async function handleResume() {
    if (!email?.content) {
      setSummaryData({ 
        summary: "Aucun contenu à résumer", 
        urgency: "low",
        error: "Email vide"
      });
      return;
    }

    setIsLoading(true);
    setSelectedEmail(email);
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
        keyPoints: data.keyPoints,
        actionItems: data.actionItems,
        sentiment: data.sentiment,
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
      setIsLoading(false);
    }
  }

  return (
    <button 
      onClick={handleResume}
      disabled={isLoading}
      className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-full text-sm disabled:opacity-50"
    >
      {isLoading ? "Analyse..." : "🧠 Résumer"}
    </button>
  );
}