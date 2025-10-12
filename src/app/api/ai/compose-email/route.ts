import { NextRequest, NextResponse } from 'next/server';
import { SmartAIProvider } from '@/lib/ai/SmartAIProvider';

export async function POST(request: NextRequest) {
  console.log('[AI Compose] 🤖 Démarrage génération d\'email');
  
  try {
    const { prompt } = await request.json();
    console.log('[AI Compose] 📝 Prompt reçu:', prompt?.substring(0, 50) + '...');

    if (!prompt) {
      console.log('[AI Compose] ❌ Erreur: Prompt manquant');
      return NextResponse.json({ error: "Prompt manquant" }, { status: 400 });
    }

    const aiProvider = SmartAIProvider.getInstance();
    
    console.log('[AI Compose] 🚀 Génération avec SmartAIProvider...');
    const startTime = Date.now();
    
    const systemPrompt = "Tu es un assistant qui aide à rédiger des emails professionnels en français. Réponds simplement avec le contenu de l'email, bien structuré et professionnel.";
    
    let result = await aiProvider.composeEmail(prompt, systemPrompt);

    // Si le fallback renvoie un JSON de ton (ex: {"tone": ...}), générer un email lisible
    const trimmed = result.content.trim();
    let finalContent = trimmed;
    if (/^\{\s*"tone"/i.test(trimmed)) {
      try {
        const obj = JSON.parse(trimmed);
        finalContent = `Bonjour,\n\nVoici la réponse demandée (analyse du ton disponible mais génération complète indisponible) :\n- Ton détecté: ${obj.tone || obj.sentiment || 'neutre'}\n- Suggestions: ${(obj.suggestions || []).join(', ')}\n\nMerci.\n`; 
      } catch {
        // garder trimmed
      }
    }
    // Si le contenu est très court ou ressemble à un message fallback générique, essayer de reformater
    if (finalContent.length < 40) {
      finalContent = `Bonjour,\n\n${finalContent}\n\nCordialement.`;
    }
    
    const responseTime = Date.now() - startTime;
    console.log(`[AI Compose] ✅ Email généré en ${responseTime}ms avec ${result.provider}`);

    return NextResponse.json({ 
      content: finalContent,
      provider: result.provider,
      responseTime,
      debug: {
        timestamp: new Date().toISOString(),
        promptLength: prompt.length,
        provider: result.provider
      }
    });

  } catch (error: any) {
    console.error('[AI Compose] ❌ Erreur complète:', error);
    
    return NextResponse.json({
      error: "Erreur lors de la génération: " + error.message,
      debug: {
        type: error.constructor.name,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}