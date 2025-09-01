import { NextRequest, NextResponse } from 'next/server';
import { SmartAIProvider } from '@/lib/ai/SmartAIProvider';

export async function POST(request: NextRequest) {
  try {
    const { mode, prompt, context, options = {} } = await request.json();
    console.log(`[AI Advanced] 🧠 Mode: ${mode}, Prompt: ${prompt?.substring(0, 50)}...`);

    const aiProvider = SmartAIProvider.getInstance();
    const startTime = Date.now();

    let systemPrompt = "";
    let userPrompt = "";
    let result;

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
        result = await aiProvider.analyzeText(context, "tone_analysis");
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
        result = await aiProvider.classifyEmail(context);
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
        result = await aiProvider.suggestReplies(context, prompt || "Génère des options de réponse professionnelles");
        break;

      case "translation":
        const targetLang = options.targetLanguage || 'anglais';
        result = await aiProvider.translateText(context, targetLang);
        break;

      case "template_generator":
        systemPrompt = `Tu es un expert en création de templates d'emails professionnels.
        
Crée un template réutilisable avec des variables {nom}, {entreprise}, etc.
Inclus des variations pour différents contextes.`;
        userPrompt = `Crée un template pour: ${prompt}`;
        result = await aiProvider.callAI([
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ], { maxTokens: 500 });
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
        result = await aiProvider.callAI([
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ], { maxTokens: 600 });
        break;

      case "follow_up":
        systemPrompt = `Tu es un expert en emails de relance. Génère des emails de suivi selon le contexte.
        
Propose 3 niveaux de relance:
1. Relance polie (1ère fois)
2. Relance insistante (2ème fois)  
3. Relance finale (dernière chance)

Réponds au format JSON:
{
  "gentle": "relance polie...",
  "firm": "relance insistante...",
  "final": "relance finale..."
}`;
        userPrompt = `Email de suivi pour: ${prompt}\nEmail original: ${context}`;
        result = await aiProvider.callAI([
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ], { maxTokens: 700 });
        break;

      default:
        return NextResponse.json(
          { error: "Mode IA non reconnu" },
          { status: 400 }
        );
    }

    const responseTime = Date.now() - startTime;
    console.log(`[AI Advanced] ✅ ${mode} traité en ${responseTime}ms avec ${result.provider}`);

    // Essayer de parser le JSON pour certains modes
    let parsedContent = result.content;
    const jsonModes = ["tone_analyzer", "email_classifier", "smart_reply", "meeting_scheduler", "follow_up"];
    
    if (jsonModes.includes(mode)) {
      try {
        if (typeof result.content === 'string') {
          parsedContent = JSON.parse(result.content);
        }
      } catch {
        // Si le parsing échoue, garder le texte brut
        parsedContent = { raw: result.content, error: "Format JSON invalide" };
      }
    }

    return NextResponse.json({
      mode,
      content: parsedContent,
      provider: result.provider,
      responseTime,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[AI Advanced] ❌ Erreur:', error);
    return NextResponse.json(
      { error: error.message || "Erreur IA avancée" },
      { status: 500 }
    );
  }
}