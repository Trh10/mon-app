// SmartAIProvider - Système IA multi-provider avec failover automatique
// Supporte Groq (ultra-rapide), OpenAI (fiable), et Anthropic (alternatif)

export interface AIResult {
  content: string;
  provider: 'groq' | 'openai' | 'anthropic' | 'fallback';
  responseTime?: number;
  error?: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export class SmartAIProvider {
  private static instance: SmartAIProvider;
  private groqKey: string | undefined;
  private openaiKey: string | undefined;
  private anthropicKey: string | undefined;

  private constructor() {
    this.groqKey = process.env.GROQ_API_KEY;
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;
  }

  public static getInstance(): SmartAIProvider {
    if (!SmartAIProvider.instance) {
      SmartAIProvider.instance = new SmartAIProvider();
    }
    return SmartAIProvider.instance;
  }

  // Méthode principale avec failover automatique
  async callAI(messages: AIMessage[], options: AIOptions = {}): Promise<AIResult> {
    const startTime = Date.now();

    // Essayer Groq en premier (ultra-rapide)
    if (this.groqKey) {
      try {
        const result = await this.callGroq(messages, options);
        return {
          ...result,
          responseTime: Date.now() - startTime
        };
      } catch (error) {
        console.warn('[SmartAI] ⚡ Groq failed, trying OpenAI:', error);
      }
    }

    // Fallback vers OpenAI
    if (this.openaiKey) {
      try {
        const result = await this.callOpenAI(messages, options);
        return {
          ...result,
          responseTime: Date.now() - startTime
        };
      } catch (error) {
        console.warn('[SmartAI] 🤖 OpenAI failed, trying Anthropic:', error);
      }
    }

    // Fallback vers Anthropic
    if (this.anthropicKey) {
      try {
        const result = await this.callAnthropic(messages, options);
        return {
          ...result,
          responseTime: Date.now() - startTime
        };
      } catch (error) {
        console.warn('[SmartAI] 🧠 Anthropic failed, using fallback:', error);
      }
    }

    // Fallback local
    return {
      content: this.generateFallbackResponse(messages),
      provider: 'fallback',
      responseTime: Date.now() - startTime
    };
  }

  // Groq API (ultra-rapide)
  private async callGroq(messages: AIMessage[], options: AIOptions = {}): Promise<AIResult> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        messages,
        max_tokens: options.maxTokens || 800,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'groq'
    };
  }

  // OpenAI API (fiable)
  private async callOpenAI(messages: AIMessage[], options: AIOptions = {}): Promise<AIResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || "gpt-4o-mini",
        messages,
        max_tokens: options.maxTokens || 800,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'openai'
    };
  }

  // Anthropic API (alternatif)
  private async callAnthropic(messages: AIMessage[], options: AIOptions = {}): Promise<AIResult> {
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.anthropicKey!,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || "claude-3-haiku-20240307",
        max_tokens: options.maxTokens || 800,
        system: systemMessage,
        messages: userMessages
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.content[0]?.text || '',
      provider: 'anthropic'
    };
  }

  // Fallback local intelligent
  private generateFallbackResponse(messages: AIMessage[]): string {
    const userMessageRaw = messages.find(m => m.role === 'user')?.content || '';
    const userMessage = userMessageRaw.toLowerCase();

    // 1. Résumé
    if (userMessage.includes('résumer') || userMessage.includes('résumé')) {
      return "Résumé : L'email traite d'un sujet important qui nécessite votre attention. Veuillez consulter le contenu complet pour plus de détails.";
    }

    // 2. Analyse de ton / sentiment (éviter faux positif sur 'ton professionnel')
    if (/\b(sentiment|analyse du ton|tone analysis|analyse ton|analyse du sentiment)\b/.test(userMessage)) {
      return '{"tone": "neutre", "sentiment": "neutre", "suggestions": ["Analyser le contexte complet"], "confidence": 0.5}';
    }

    // 3. Traduction
    if (userMessage.includes('traduire') || userMessage.includes('translation')) {
      return "Traduction automatique temporairement indisponible. Veuillez utiliser un service de traduction en ligne.";
    }

    // 4. Composition d'email (mot clé 'email' ou 'compose' ou 'écris un email')
    if (/email/.test(userMessage) || /compose/.test(userMessage) || /écris un email/.test(userMessage)) {
      return "Objet: [À définir]\n\nBonjour,\n\nJe vous écris concernant votre demande.\n\nPoints principaux :\n- (Point 1)\n- (Point 2)\n\nN'hésitez pas à me revenir si besoin.\n\nCordialement";
    }

    // 5. Défaut
    return "(Mode fallback local) Impossible d'appeler le provider IA distant. Fournissez une clé API pour Groq / OpenAI / Anthropic afin d'obtenir une génération réelle.";
  }

  // Méthode spécialisée pour la composition d'emails
  async composeEmail(prompt: string, systemPrompt?: string): Promise<AIResult> {
    const messages = [
      {
        role: "system" as const,
        content: systemPrompt || "Tu es un assistant qui aide à rédiger des emails professionnels en français. Réponds simplement avec le contenu de l'email, bien structuré et professionnel."
      },
      {
        role: "user" as const,
        content: prompt
      }
    ];

    return this.callAI(messages, { maxTokens: 500 });
  }

  // Méthode spécialisée pour les résumés d'emails
  async summarizeEmail(content: string, subject?: string): Promise<AIResult> {
    const messages = [
      {
        role: "system" as const,
        content: "Tu es un expert en résumé d'emails. Produis un résumé concis et informatif en français."
      },
      {
        role: "user" as const,
        content: `Résume cet email:\nSujet: ${subject || 'Non spécifié'}\nContenu: ${content}`
      }
    ];

    return this.callAI(messages, { maxTokens: 300 });
  }

  // Méthode spécialisée pour l'analyse de sentiment
  async analyzeSentiment(content: string): Promise<AIResult> {
    const messages = [
      {
        role: "system" as const,
        content: `Analyse le sentiment de ce texte. Réponds au format JSON:
{
  "sentiment": "positif|neutre|négatif",
  "confidence": 0.85,
  "emotion": "joie|colère|tristesse|peur|surprise|neutre",
  "keywords": ["mot1", "mot2"]
}`
      },
      {
        role: "user" as const,
        content: content
      }
    ];

    return this.callAI(messages, { maxTokens: 200 });
  }

  // Méthode spécialisée pour prédire la priorité
  async predictPriority(content: string, subject?: string): Promise<AIResult> {
    const messages = [
      {
        role: "system" as const,
        content: `Évalue la priorité de cet email. Réponds au format JSON:
{
  "priority": "basse|moyenne|haute|urgente",
  "urgency_score": 0.75,
  "reasons": ["raison1", "raison2"],
  "recommended_action": "répondre_rapidement|traiter_aujourd_hui|peut_attendre"
}`
      },
      {
        role: "user" as const,
        content: `Sujet: ${subject || 'Non spécifié'}\nContenu: ${content}`
      }
    ];

    return this.callAI(messages, { maxTokens: 250 });
  }

  // Méthode spécialisée pour la traduction
  async translateText(text: string, targetLanguage: string): Promise<AIResult> {
    const messages = [
      {
        role: "system" as const,
        content: `Tu es un traducteur professionnel. Traduis le texte suivant en ${targetLanguage} en gardant le ton et le contexte.`
      },
      {
        role: "user" as const,
        content: text
      }
    ];

    return this.callAI(messages, { maxTokens: 600 });
  }

  // Méthode spécialisée pour suggérer des réponses
  async suggestReplies(originalContent: string, context?: string): Promise<AIResult> {
    const messages = [
      {
        role: "system" as const,
        content: `Génère 3 options de réponse différentes. Réponds au format JSON:
{
  "formal": "réponse professionnelle formelle...",
  "friendly": "réponse amicale mais professionnelle...",
  "concise": "réponse courte et directe..."
}`
      },
      {
        role: "user" as const,
        content: `Email original: ${originalContent}\nContexte: ${context || 'Aucun contexte spécifique'}`
      }
    ];

    return this.callAI(messages, { maxTokens: 600 });
  }

  // Méthode spécialisée pour l'analyse de texte
  async analyzeText(text: string, analysisType: string = "general"): Promise<AIResult> {
    let systemPrompt = "";
    
    switch (analysisType) {
      case "tone_analysis":
        systemPrompt = `Tu es un expert en analyse de ton et de sentiment. Analyse le ton de l'email et suggère des améliorations.
        
Réponds au format JSON:
{
  "tone": "professionnel|amical|urgent|neutre|agressif",
  "sentiment": "positif|neutre|négatif", 
  "suggestions": ["suggestion1", "suggestion2"],
  "confidence": 0.85
}`;
        break;
      default:
        systemPrompt = "Tu es un expert en analyse de texte. Analyse le contenu fourni et donne des insights utiles.";
    }

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `Analyse ce texte:\n\n${text}` }
    ];

    return this.callAI(messages, { maxTokens: 400 });
  }

  // Méthode spécialisée pour la classification d'emails
  async classifyEmail(emailContent: string): Promise<AIResult> {
    const systemPrompt = `Tu es un expert en classification d'emails. Classe cet email par catégorie et priorité.
        
Réponds au format JSON:
{
  "category": "commercial|support|personnel|admin|urgence",
  "priority": "basse|moyenne|haute|critique",
  "needsResponse": true,
  "suggestedActions": ["action1", "action2"],
  "timeToRespond": "immédiat|24h|semaine"
}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `Classe cet email:\n\n${emailContent}` }
    ];

    return this.callAI(messages, { maxTokens: 300 });
  }

  // Méthode pour obtenir le statut des providers
  getProviderStatus() {
    return {
      groq: !!this.groqKey,
      openai: !!this.openaiKey,
      anthropic: !!this.anthropicKey
    };
  }
}
