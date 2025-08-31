import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(request: NextRequest) {
  console.log('[DEBUG] API appelée');
  
  try {
    const { prompt } = await request.json();
    console.log('[DEBUG] Prompt reçu:', prompt?.substring(0, 50) + '...');

    if (!prompt) {
      console.log('[DEBUG] Erreur: Prompt manquant');
      return NextResponse.json({ error: "Prompt manquant" }, { status: 400 });
    }

    if (!GROQ_API_KEY) {
      console.log('[DEBUG] Erreur: Clé API manquante');
      console.log('[DEBUG] Variables d\'environnement disponibles:', Object.keys(process.env).filter(k => k.includes('GROQ')));
      return NextResponse.json({ error: "Configuration API manquante. Vérifiez GROQ_API_KEY dans .env.local" }, { status: 500 });
    }

    console.log('[DEBUG] Clé API trouvée:', GROQ_API_KEY.substring(0, 10) + '...');

    // Test simple d'abord
    console.log('[DEBUG] Appel vers Groq...');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "Tu es un assistant qui aide à rédiger des emails en français. Réponds simplement avec le contenu de l'email."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    console.log('[DEBUG] Statut réponse Groq:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[DEBUG] Erreur Groq:', errorText);
      
      return NextResponse.json({
        error: `Erreur Groq ${response.status}: ${errorText}`
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('[DEBUG] Réponse Groq reçue:', JSON.stringify(data, null, 2));

    const content = data.choices?.[0]?.message?.content || "Erreur: pas de contenu généré";

    console.log('[DEBUG] Contenu extrait:', content.substring(0, 100) + '...');

    return NextResponse.json({ 
      content: content.trim(),
      debug: {
        model: "llama-3.1-8b-instant",
        timestamp: new Date().toISOString(),
        hasApiKey: !!GROQ_API_KEY,
        promptLength: prompt.length
      }
    });

  } catch (error: any) {
    console.error('[DEBUG] Erreur complète:', error);
    console.error('[DEBUG] Stack trace:', error.stack);
    
    return NextResponse.json({
      error: "Erreur serveur: " + error.message,
      debug: {
        type: error.constructor.name,
        stack: error.stack
      }
    }, { status: 500 });
  }
}