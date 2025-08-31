type SummarizeOutput = {
  summary: string;
  highlights?: string[];
  actions?: string[];
  language?: string;
};

export async function summarizeText(text: string, langHint: "fr" | "en" = "fr"): Promise<SummarizeOutput> {
  const key = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!key) return localSummarize(text, langHint);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `Tu es un assistant concis. Résume l'email en ${langHint === "fr" ? "français" : "anglais"}.
Renvoie un JSON avec les clés:
- summary (5–8 phrases max, clair, contextuel)
- highlights (3–6 puces d’informations clés)
- actions (0–5 tâches/action items extraites, impératif)
`,
          },
          { role: "user", content: text.slice(0, 20000) },
        ],
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return {
      summary: String(parsed.summary || "").trim(),
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 8) : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 8) : [],
      language: langHint,
    };
  } catch {
    return localSummarize(text, langHint);
  }
}

function localSummarize(text: string, lang: "fr" | "en"): SummarizeOutput {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const first = lines.slice(0, 5).join(" ");
  const bullets = lines.slice(0, 6).map((l) => "• " + l).slice(0, 4);
  const actions = lines
    .filter((l) => /(action|to[- ]do|tâche|deadline|due|deliver|livrable|merci de|please)/i.test(l))
    .slice(0, 5)
    .map((l) => l.replace(/^[-•*\s]+/, "").trim());
  return {
    summary: first || (lang === "fr" ? "Résumé indisponible." : "Summary unavailable."),
    highlights: bullets,
    actions,
    language: lang,
  };
}