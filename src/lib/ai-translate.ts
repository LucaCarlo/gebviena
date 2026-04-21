import { prisma } from "./prisma";

export interface TranslateOptions {
  fromLang: string;
  toLang: string;
  htmlMode?: boolean;
}

interface AISettings {
  provider: "anthropic" | "openai";
  anthropicApiKey: string;
  anthropicModel: string;
  openaiApiKey: string;
  openaiModel: string;
  systemPromptTemplate: string;
}

/**
 * Default system prompt template. Supports placeholders:
 *   {fromLang}  — source language name (e.g. "Italian")
 *   {toLang}    — target language name (e.g. "English")
 *   {htmlNote}  — extra instruction appended in htmlMode (empty otherwise)
 */
export const DEFAULT_TRANSLATION_PROMPT = `You are a professional translator for a furniture/design company website (Gebrüder Thonet Vienna).
Translate from {fromLang} to {toLang}.
Preserve brand names, designer names, product model names and proper nouns unchanged.
Keep the same tone (elegant, refined, design-oriented).
Output ONLY the translated text — no explanations, no quotes, no extra formatting.{htmlNote}`;

const HTML_NOTE = " The text may contain HTML tags: preserve all tags, attributes, and structure exactly as in the source.";

async function loadAISettings(): Promise<AISettings> {
  const rows = await prisma.setting.findMany({ where: { group: "translations" } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    provider: (map.get("ai_provider") as "anthropic" | "openai") || "anthropic",
    anthropicApiKey: map.get("ai_anthropic_api_key") || "",
    anthropicModel: map.get("ai_anthropic_model") || "claude-sonnet-4-6",
    openaiApiKey: map.get("ai_openai_api_key") || "",
    openaiModel: map.get("ai_openai_model") || "gpt-4o-mini",
    systemPromptTemplate: map.get("ai_system_prompt") || DEFAULT_TRANSLATION_PROMPT,
  };
}

const LANG_NAMES: Record<string, string> = {
  it: "Italian", en: "English", de: "German", fr: "French",
  es: "Spanish (Castilian, from Spain — NOT Latin American)", pt: "Portuguese", nl: "Dutch", ru: "Russian",
};

function langName(code: string): string {
  return LANG_NAMES[code] || code;
}

function renderPrompt(template: string, opts: TranslateOptions): string {
  const htmlNote = opts.htmlMode ? HTML_NOTE : "";
  return template
    .replace(/\{fromLang\}/g, langName(opts.fromLang))
    .replace(/\{toLang\}/g, langName(opts.toLang))
    .replace(/\{htmlNote\}/g, htmlNote);
}

async function callAnthropic(system: string, user: string, settings: AISettings): Promise<string> {
  if (!settings.anthropicApiKey) throw new Error("API key Claude non configurata");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": settings.anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: settings.anthropicModel,
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Risposta Claude vuota");
  return text.trim();
}

async function callOpenAI(system: string, user: string, settings: AISettings): Promise<string> {
  if (!settings.openaiApiKey) throw new Error("API key OpenAI non configurata");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${settings.openaiApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: settings.openaiModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Risposta OpenAI vuota");
  return text.trim();
}

export async function translateText(text: string, opts: TranslateOptions): Promise<string> {
  if (!text || !text.trim()) return "";
  const settings = await loadAISettings();
  const system = renderPrompt(settings.systemPromptTemplate, opts);
  if (settings.provider === "openai") return callOpenAI(system, text, settings);
  return callAnthropic(system, text, settings);
}

/** Split entries into chunks bounded by entry count and total char size */
function chunkEntries(
  entries: [string, string][],
  maxEntries: number,
  maxChars: number
): [string, string][][] {
  const chunks: [string, string][][] = [];
  let current: [string, string][] = [];
  let currentChars = 0;
  for (const [k, v] of entries) {
    const entryChars = k.length + v.length + 8;
    if (current.length >= maxEntries || (current.length > 0 && currentChars + entryChars > maxChars)) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }
    current.push([k, v]);
    currentChars += entryChars;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function extractJson(raw: string): string {
  let s = raw.trim();
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) s = fenceMatch[1].trim();
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  return s;
}

async function callProvider(
  system: string,
  user: string,
  settings: AISettings
): Promise<string> {
  return settings.provider === "openai"
    ? callOpenAI(system, user, settings)
    : callAnthropic(system, user, settings);
}

async function translateChunk(
  entries: [string, string][],
  system: string,
  settings: AISettings,
  opts: TranslateOptions
): Promise<Record<string, string>> {
  const user = JSON.stringify(Object.fromEntries(entries));

  // Try JSON batch up to 2 times
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callProvider(system, user, settings);
    try {
      const parsed = JSON.parse(extractJson(raw)) as Record<string, string>;
      const out: Record<string, string> = {};
      for (const [k] of entries) if (typeof parsed[k] === "string") out[k] = parsed[k];
      if (Object.keys(out).length === entries.length) return out;
    } catch {
      // fall through to retry / fallback
    }
  }

  // Fallback: translate each field individually (reliable, no JSON needed)
  const singleSystem = renderPrompt(settings.systemPromptTemplate, opts);
  const out: Record<string, string> = {};
  for (const [k, v] of entries) {
    out[k] = (await callProvider(singleSystem, v, settings)).trim();
  }
  return out;
}

export async function translateFields(
  fields: Record<string, string>,
  opts: TranslateOptions
): Promise<Record<string, string>> {
  const entries = Object.entries(fields).filter(([, v]) => v && v.trim());
  if (entries.length === 0) return {};

  const settings = await loadAISettings();
  const system = `${renderPrompt(settings.systemPromptTemplate, opts)}
You will receive a JSON object with fields to translate. Return ONLY a JSON object with the same keys and translated values. No prose, no markdown fences.`;

  const chunks = chunkEntries(entries, 30, 4000);

  // Limit concurrency to avoid rate limits
  const CONCURRENCY = 3;
  const merged: Record<string, string> = {};
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((c) => translateChunk(c, system, settings, opts)));
    for (const r of results) Object.assign(merged, r);
  }

  const out: Record<string, string> = {};
  for (const k of Object.keys(fields)) out[k] = merged[k] ?? fields[k];
  return out;
}
