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
    
    const result = await aiProvider.composeEmail(prompt, systemPrompt);
    
    const responseTime = Date.now() - startTime;
    console.log(`[AI Compose] ✅ Email généré en ${responseTime}ms avec ${result.provider}`);

    return NextResponse.json({ 
      content: result.content.trim(),
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