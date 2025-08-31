export type PriorityScore = { score: number; label: "low" | "medium" | "high" };
export type Classification = { categories: Array<{ label: string; confidence: number }> };
export type SuggestedReply = { text: string; tone: "neutral" | "friendly" | "formal" };
export type Sentiment = { sentiment: "positive" | "neutral" | "negative"; confidence: number };

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function predictPriority(input: { subject?: string; from?: string; content: string }): PriorityScore {
  const c = (input.content || "").toLowerCase();
  const urgent = ["urgent", "asap", "immédiat", "deadline", "urgence", "important"];
  const score = clamp01(0.2 + urgent.reduce((s, w) => (c.includes(w) ? s + 0.2 : s), 0));
  const label = score > 0.66 ? "high" : score > 0.4 ? "medium" : "low";
  return { score, label };
}

export function classifyEmail(input: { subject?: string; from?: string; content: string }): Classification {
  const text = `${input.subject ?? ""} ${input.from ?? ""} ${input.content ?? ""}`.toLowerCase();
  const cats: Array<{ label: string; confidence: number }> = [];
  if (/(client|invoice|facture|order|commande)/.test(text)) cats.push({ label: "client", confidence: 0.8 });
  if (/(team|interne|hr|rh|meeting|réunion)/.test(text)) cats.push({ label: "interne", confidence: 0.7 });
  if (/(admin|compta|accounting|finance)/.test(text)) cats.push({ label: "admin", confidence: 0.6 });
  if (/(newsletter|promo|marketing|offre)/.test(text)) cats.push({ label: "newsletter", confidence: 0.75 });
  if (!cats.length) cats.push({ label: "general", confidence: 0.5 });
  return { categories: cats };
}

export function suggestReplies(input: { subject?: string; from?: string; content: string }): SuggestedReply[] {
  const base = "Merci pour votre message. ";
  const ask = /(?:pouvez-vous|pourriez-vous|merci de|thank you|could you|please)/i.test(input.content);
  const meeting = /(réunion|meeting|rdv|call|visio)/i.test(input.content);
  const options: SuggestedReply[] = [];

  options.push({
    text: base + (ask ? "Je reviens vers vous avec les informations demandées." : "J'en prends bonne note."),
    tone: "neutral",
  });
  if (meeting) options.push({ text: "Oui, je suis disponible. Proposez-vous un créneau ?", tone: "friendly" });
  options.push({ text: "Merci, reçu. Je vous tiens informé rapidement.", tone: "formal" });

  return options.slice(0, 3);
}

export function detectSentiment(input: { content: string }): Sentiment {
  const c = (input.content || "").toLowerCase();
  const pos = ["merci", "thanks", "heureux", "excellent", "parfait", "super"];
  const neg = ["problème", "erreur", "déçu", "frustré", "inquiet", "urgent", "retard"];
  const p = pos.reduce((s, w) => (c.includes(w) ? s + 1 : s), 0);
  const n = neg.reduce((s, w) => (c.includes(w) ? s + 1 : s), 0);
  const sentiment = p > n ? "positive" : n > p ? "negative" : "neutral";
  const confidence = clamp01(0.5 + Math.abs(p - n) * 0.1);
  return { sentiment, confidence };
}