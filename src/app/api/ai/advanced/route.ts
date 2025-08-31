import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { mode, prompt, context, options = {} } = await request.json();

    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Configuration API manquante" },
        { status: 500 }
      );
    }

    let systemPrompt = "";
    let userPrompt = "";
    let maxTokens = 800;

    switch (mode) {
      case "tone_analyzer":
        systemPrompt = `Tu es un expert en analyse de ton et de sentiment. Analyse le ton de l'email et suggère des améliorations.
        
Réponds au format JSON:
{
  "tone": "professionnel|amical|urgent|neutre|agressif",
  "sentiment": "positif|neutre|négatif", 
  "suggestions": ["suggestion1", "suggestion2"],
  "confidence": 0.85
}`;
        userPrompt = `Analyse le ton de cet email:\n\n${context}`;
        maxTokens = 400;
        break;

      case "email_classifier":
        systemPrompt = `Tu es un expert en classification d'emails. Classe cet email par catégorie et priorité.
        
Réponds au format JSON:
{
  "category": "commercial|support|personnel|admin|urgence",
  "priority": "basse|moyenne|haute|critique",
  "needsResponse": true,
  "suggestedActions": ["action1", "action2"],
  "timeToRespond": "immédiat|24h|semaine"
}`;
        userPrompt = `Classe cet email:\n\n${context}`;
        maxTokens = 300;
        break;

      case "smart_reply":
        systemPrompt = `Tu es un assistant qui génère plusieurs options de réponse selon différents tons.
        
Génère 3 réponses différentes:
1. Réponse professionnelle formelle
2. Réponse amicale mais professionnelle  
3. Réponse concise et directe

Réponds au format JSON:
{
  "formal": "réponse formelle...",
  "friendly": "réponse amicale...", 
  "concise": "réponse concise..."
}`;
        userPrompt = `Email original:\n${context}\n\nInstructions: ${prompt}`;
        maxTokens = 900;
        break;

      case "translation":
        systemPrompt = `Tu es un traducteur expert. Traduis l'email en gardant le ton et le contexte professionnel.`;
        userPrompt = `Traduis cet email en ${options.targetLanguage || 'anglais'}:\n\n${context}`;
        maxTokens = 600;
        break;

      case "template_generator":
        systemPrompt = `Tu es un expert en création de templates d'emails professionnels.
        
Crée un template réutilisable avec des variables {nom}, {entreprise}, etc.
Inclus des variations pour différents contextes.`;
        userPrompt = `Crée un template pour: ${prompt}`;
        maxTokens = 500;
        break;

      case "meeting_scheduler":
        systemPrompt = `Tu es un assistant qui aide à organiser des réunions. 
        
Génère un email de demande de réunion avec:
- Plusieurs créneaux proposés
- Agenda/objectifs clairs
- Informations pratiques
        
Réponds au format JSON:
{
  "emailContent": "contenu de l'email...",
  "suggestedSlots": ["lundi 14h", "mardi 10h", "mercredi 16h"],
  "agenda": ["point1", "point2"]
}`;
        userPrompt = `Demande de réunion pour: ${prompt}\nContexte: ${context || ''}`;
        maxTokens = 600;
        break;

      case "follow_up":
        systemPrompt = `Tu es un expert en emails de relance. Génère des emails de suivi selon le contexte.
        
Propose 3 niveaux de relance:
1. Relance polie (1ère fois)
2. Relance insistante (2ème fois)  
3. Relance finale (dernière chance)`;
        userPrompt = `Email de suivi pour: ${prompt}\nEmail original: ${context}`;
        maxTokens = 700;
        break;

      default:
        return NextResponse.json(
          { error: "Mode IA non reconnu" },
          { status: 400 }
        );
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur Groq: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    // Essayer de parser le JSON pour certains modes
    let parsedContent = content;
    const jsonModes = ["tone_analyzer", "email_classifier", "smart_reply", "meeting_scheduler"];
    
    if (jsonModes.includes(mode)) {
      try {
        parsedContent = JSON.parse(content);
      } catch {
        // Si le parsing échoue, garder le texte brut
        parsedContent = { raw: content, error: "Format JSON invalide" };
      }
    }

    return NextResponse.json({
      mode,
      content: parsedContent,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[AI Advanced] Erreur:', error);
    return NextResponse.json(
      { error: error.message || "Erreur IA avancée" },
      { status: 500 }
    );
  }
}