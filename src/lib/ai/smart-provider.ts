// Providers IA unifiés pour l'application (branding neutralisé)
type AIProvider = "openai" | "groq" | "anthropic" | "fallback";

interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model: string;
  temperature?: number;
}

interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
  provider: AIProvider;
  responseTime?: number;
}

// Configuration par défaut - ordre de priorité
const AI_CONFIGS: AIConfig[] = [
  {
    provider: "groq",
    apiKey: process.env.GROQ_API_KEY,
    // Modèle mis à jour (l'ancien "llama3-8b-8192" est décommissionné)
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant", // Ultra rapide & supporté
    temperature: 0.1
  },
  {
    provider: "openai", 
    apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: 0.2
  },
  {
    provider: "anthropic",
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: "claude-3-haiku-20240307", // Rapide et économique
    temperature: 0.1
  }
];

class SmartAIProvider {
  private static instance: SmartAIProvider;
  private availableProviders: AIConfig[] = [];

  private constructor() {
    this.initializeProviders();
  }

  static getInstance(): SmartAIProvider {
    if (!SmartAIProvider.instance) {
      SmartAIProvider.instance = new SmartAIProvider();
    }
    return SmartAIProvider.instance;
  }

  private initializeProviders() {
    this.availableProviders = AI_CONFIGS.filter(config => config.apiKey);
    console.log(`🤖 Providers IA disponibles: ${this.availableProviders.map(p => p.provider).join(", ")}`);
  }

  async callAI(prompt: string, systemPrompt: string, responseFormat: "text" | "json" = "json"): Promise<AIResponse> {
    const startTime = Date.now();

    // Essayer chaque provider dans l'ordre de priorité
    for (const config of this.availableProviders) {
      try {
        console.log(`🚀 Tentative avec ${config.provider}...`);
        const result = await this.callProvider(config, prompt, systemPrompt, responseFormat);
        const responseTime = Date.now() - startTime;
        
        console.log(`✅ ${config.provider} a répondu en ${responseTime}ms`);
        return {
          success: true,
          data: result,
          provider: config.provider,
          responseTime
        };
      } catch (error) {
        console.warn(`❌ ${config.provider} a échoué:`, error);
        continue;
      }
    }

    // Fallback si tous les providers échouent
    console.log("🔄 Utilisation du fallback...");
    return {
      success: false,
      error: "Tous les providers IA sont indisponibles",
      provider: "fallback"
    };
  }

  private async callProvider(config: AIConfig, prompt: string, systemPrompt: string, responseFormat: "text" | "json"): Promise<any> {
    switch (config.provider) {
      case "groq":
        return this.callGroq(config, prompt, systemPrompt, responseFormat);
      case "openai":
        return this.callOpenAI(config, prompt, systemPrompt, responseFormat);
      case "anthropic":
        return this.callAnthropic(config, prompt, systemPrompt, responseFormat);
      default:
        throw new Error(`Provider ${config.provider} non supporté`);
    }
  }

  private async callGroq(config: AIConfig, prompt: string, systemPrompt: string, responseFormat: "text" | "json"): Promise<any> {
    const body: any = {
      model: config.model,
      temperature: config.temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ]
    };

    if (responseFormat === "json") {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Groq API error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    
    if (responseFormat === "json") {
      try {
        return JSON.parse(content);
      } catch {
        throw new Error("Réponse JSON invalide de Groq");
      }
    }
    
    return content;
  }

  private async callOpenAI(config: AIConfig, prompt: string, systemPrompt: string, responseFormat: "text" | "json"): Promise<any> {
    const body: any = {
      model: config.model,
      temperature: config.temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ]
    };

    if (responseFormat === "json") {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", 
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI API error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    
    if (responseFormat === "json") {
      try {
        return JSON.parse(content);
      } catch {
        throw new Error("Réponse JSON invalide d'OpenAI");
      }
    }
    
    return content;
  }

  private async callAnthropic(config: AIConfig, prompt: string, systemPrompt: string, responseFormat: "text" | "json"): Promise<any> {
    const finalPrompt = responseFormat === "json" 
      ? `${systemPrompt}\n\nUser: ${prompt}\n\nRéponds uniquement avec un objet JSON valide.`
      : `${systemPrompt}\n\nUser: ${prompt}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey!,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1024,
        temperature: config.temperature,
        messages: [
          { role: "user", content: finalPrompt }
        ]
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Anthropic API error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    const content = data?.content?.[0]?.text || "";
    
    if (responseFormat === "json") {
      try {
        return JSON.parse(content);
      } catch {
        throw new Error("Réponse JSON invalide d'Anthropic");
      }
    }
    
    return content;
  }

  // Méthodes spécialisées pour chaque tâche IA
  async summarizeEmail(subject: string, content: string, lang: "fr" | "en" = "fr"): Promise<any> {
    const systemPrompt = `Tu es un assistant concis. Résume l'email en ${lang === "fr" ? "français" : "anglais"}.
Renvoie un JSON avec les clés:
- summary (5–8 phrases max, clair, contextuel)
- highlights (3–6 puces d'informations clés)
- actions (0–5 tâches/action items extraites, impératif)
- urgency ("low", "medium", "high")`;

    const prompt = `Sujet: ${subject}\n\nContenu: ${content}`;
    
    const result = await this.callAI(prompt, systemPrompt, "json");
    return result.success ? result.data : this.fallbackSummarize(subject, content, lang);
  }

  async analyzesentiment(subject: string, content: string, from: string): Promise<any> {
    const systemPrompt = `Analyse le sentiment de cet email. Retourne un JSON avec:
- sentiment: "positive", "negative", ou "neutral"
- confidence: nombre entre 0 et 1
- reasoning: explication brève en français

Considère le contexte, le ton, l'urgence, et les indicateurs émotionnels.`;

    const prompt = `De: ${from}\nSujet: ${subject}\nContenu: ${content}`;
    
    const result = await this.callAI(prompt, systemPrompt, "json");
    return result.success ? result.data : this.fallbackSentiment(subject + " " + content);
  }

  async predictPriority(subject: string, content: string, from: string): Promise<any> {
    const systemPrompt = `Analyse cet email et prédit sa priorité. Retourne un JSON avec:
- priority: nombre de 1 (le plus bas) à 5 (le plus haut)  
- confidence: nombre entre 0 et 1
- reasoning: explication brève en français

Considère:
- Mots-clés urgents (deadline, ASAP, emergency)
- Importance de l'expéditeur
- Impact business
- Sensibilité temporelle

Échelle de priorité:
1 = Newsletter, info, faible importance
2 = Communication régulière
3 = Email business normal
4 = Important, nécessite attention
5 = Critique, action urgente requise`;

    const prompt = `De: ${from}\nSujet: ${subject}\nContenu: ${content}`;
    
    const result = await this.callAI(prompt, systemPrompt, "json");
    return result.success ? result.data : this.fallbackPriority(subject + " " + content, from);
  }

  async translateText(text: string, targetLanguage: string): Promise<any> {
    const languageNames: { [key: string]: string } = {
      en: "English", es: "Spanish", de: "German", it: "Italian",
      pt: "Portuguese", zh: "Chinese", ja: "Japanese", ar: "Arabic"
    };

    const systemPrompt = `Tu es un traducteur professionnel. Traduis le texte vers ${languageNames[targetLanguage] || "English"}. 
Préserve le ton et le contexte. Retourne seulement le texte traduit sans commentaire.`;

    const result = await this.callAI(text, systemPrompt, "text");
    return result.success 
      ? { translation: result.data, confidence: 0.95, provider: result.provider }
      : this.fallbackTranslation(text, targetLanguage);
  }

  async suggestReplies(subject: string, content: string, from: string): Promise<any> {
    const systemPrompt = `Analyse cet email et suggère 3 réponses appropriées. Retourne un JSON avec:
- suggestions: array de 3 strings (réponses courtes et professionnelles)
- tone: "formal", "casual", ou "mixed"
- urgency: "low", "medium", "high"

Les réponses doivent être:
- Pertinentes au contenu
- Ton approprié au contexte
- Longueur raisonnable (1-3 phrases)`;

    const prompt = `De: ${from}\nSujet: ${subject}\nContenu: ${content}`;
    
    const result = await this.callAI(prompt, systemPrompt, "json");
    return result.success ? result.data : this.fallbackReplies(subject, content);
  }

  // Méthodes de fallback
  private fallbackSummarize(subject: string, content: string, lang: "fr" | "en"): any {
    const lines = content.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const first = lines.slice(0, 5).join(" ");
    const bullets = lines.slice(0, 4).map(l => "• " + l);
    
    return {
      summary: first || (lang === "fr" ? "Résumé indisponible." : "Summary unavailable."),
      highlights: bullets,
      actions: [],
      urgency: "low",
      provider: "fallback"
    };
  }

  private fallbackSentiment(text: string): any {
    const positiveWords = /\b(merci|excellent|parfait|génial|super|content|heureux|félicitations|bravo|succès|bon|bien|agree|great|thanks|perfect|excellent|happy|good|success)\b/gi;
    const negativeWords = /\b(problème|erreur|désolé|urgent|critique|échec|mauvais|non|refuse|rejete|annule|problem|error|sorry|urgent|critical|bad|no|failure|cancel)\b/gi;
    
    const positiveMatches = (text.match(positiveWords) || []).length;
    const negativeMatches = (text.match(negativeWords) || []).length;
    
    let sentiment: "positive" | "negative" | "neutral" = "neutral";
    if (positiveMatches > negativeMatches) sentiment = "positive";
    else if (negativeMatches > positiveMatches) sentiment = "negative";
    
    return {
      sentiment,
      confidence: Math.min(0.8, (Math.abs(positiveMatches - negativeMatches) + 1) * 0.2),
      reasoning: `Analyse basée sur ${positiveMatches} mot(s) positif(s) et ${negativeMatches} négatif(s)`,
      provider: "fallback"
    };
  }

  private fallbackPriority(text: string, from: string): any {
    const urgentWords = /\b(urgent|asap|emergency|critique|immédiat|deadline|due|important|priorité|rush)\b/gi;
    const lowPriorityWords = /\b(fyi|info|newsletter|promotion|notification|rappel|reminder)\b/gi;
    
    const urgentMatches = (text.match(urgentWords) || []).length;
    const lowMatches = (text.match(lowPriorityWords) || []).length;
    
    let priority = 3;
    if (urgentMatches > 0) priority = Math.min(5, 3 + urgentMatches);
    else if (lowMatches > 0) priority = Math.max(1, 3 - lowMatches);
    
    if (from.includes("noreply") || from.includes("no-reply")) priority = Math.max(1, priority - 2);
    
    return {
      priority,
      confidence: 0.7,
      reasoning: `Analyse basée sur ${urgentMatches} mot(s) urgent(s) et ${lowMatches} indicateur(s) de faible priorité`,
      provider: "fallback"
    };
  }

  private fallbackTranslation(text: string, targetLang: string): any {
    const mockTranslations: { [key: string]: string } = {
      en: `[EN] ${text.substring(0, 100)}... (Mock translation)`,
      es: `[ES] ${text.substring(0, 100)}... (Traducción simulada)`,
      de: `[DE] ${text.substring(0, 100)}... (Mock-Übersetzung)`,
      it: `[IT] ${text.substring(0, 100)}... (Traduzione simulata)`,
      pt: `[PT] ${text.substring(0, 100)}... (Tradução simulada)`,
      zh: `[ZH] ${text.substring(0, 100)}... (模拟翻译)`,
      ja: `[JA] ${text.substring(0, 100)}... (モック翻訳)`,
      ar: `[AR] ${text.substring(0, 100)}... (ترجمة وهمية)`,
    };

    return {
      translation: mockTranslations[targetLang] || mockTranslations.en,
      confidence: 0.5,
      provider: "fallback"
    };
  }

  private fallbackReplies(subject: string, content: string): any {
    const suggestions = [
      "Merci pour votre message. Je vais examiner cela et vous reviendrai bientôt.",
      "J'ai bien reçu votre email. Je vous recontacte dans les plus brefs délais.",
      "Merci pour ces informations. Je vais traiter votre demande rapidement."
    ];

    return {
      suggestions,
      tone: "formal",
      urgency: "low",
      provider: "fallback"
    };
  }
}

export default SmartAIProvider;
