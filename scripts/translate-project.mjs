#!/usr/bin/env node
/**
 * Translate a single Project entity into a target language and upsert
 * its ProjectTranslation row. Usage:
 *   node scripts/translate-project.mjs <projectId> <targetLang>
 *
 * Reads AI provider settings from the Setting table (group="translations")
 * and reuses the same prompt template the admin AI translate uses.
 */

import { PrismaClient } from "@prisma/client";

const TRANSLATABLE_FIELDS = [
  "name",
  "slug",
  "city",
  "architect",
  "description",
  "shortDescription",
  "seoTitle",
  "seoDescription",
  "seoKeywords",
];

const DEFAULT_PROMPT = `You are a professional translator for a furniture/design company website (Gebrüder Thonet Vienna).
Translate from {fromLang} to {toLang}.
Preserve brand names, designer names, product model names and proper nouns unchanged.
Keep the same tone (elegant, refined, design-oriented).
Output ONLY the translated text — no explanations, no quotes, no extra formatting.{htmlNote}`;

async function loadAISettings(prisma) {
  const rows = await prisma.setting.findMany({ where: { group: "translations" } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    provider: map.get("ai_provider") || "anthropic",
    anthropicApiKey: map.get("ai_anthropic_api_key") || "",
    anthropicModel: map.get("ai_anthropic_model") || "claude-sonnet-4-6",
    openaiApiKey: map.get("ai_openai_api_key") || "",
    openaiModel: map.get("ai_openai_model") || "gpt-4o-mini",
    systemPrompt: map.get("ai_system_prompt") || DEFAULT_PROMPT,
  };
}

function renderPrompt(template, fromLang, toLang, htmlMode) {
  return template
    .replaceAll("{fromLang}", fromLang)
    .replaceAll("{toLang}", toLang)
    .replaceAll("{htmlNote}", htmlMode ? "\nThe input contains HTML — preserve all tags exactly as-is." : "");
}

async function callAnthropic(text, settings, fromLang, toLang, htmlMode) {
  const sys = renderPrompt(settings.systemPrompt, fromLang, toLang, htmlMode);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": settings.anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: settings.anthropicModel,
      max_tokens: 4096,
      system: sys,
      messages: [{ role: "user", content: text }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.content?.[0]?.text?.trim() || "";
}

async function callOpenAI(text, settings, fromLang, toLang, htmlMode) {
  const sys = renderPrompt(settings.systemPrompt, fromLang, toLang, htmlMode);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${settings.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: settings.openaiModel,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: text },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || "";
}

async function translateText(text, settings, fromLang, toLang, htmlMode) {
  if (!text || !text.trim()) return text;
  const fn = settings.provider === "openai" ? callOpenAI : callAnthropic;
  return fn(text, settings, fromLang, toLang, htmlMode);
}

function isHtmlField(key, value) {
  if (typeof value !== "string") return false;
  if (key === "description" || key === "shortDescription") return /<\w/.test(value);
  return false;
}

async function main() {
  const [projectId, targetLang] = process.argv.slice(2);
  if (!projectId || !targetLang) {
    console.error("Usage: node scripts/translate-project.mjs <projectId> <targetLang>");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      console.error(`Project ${projectId} not found`);
      process.exit(1);
    }
    const settings = await loadAISettings(prisma);
    if (settings.provider === "anthropic" && !settings.anthropicApiKey) throw new Error("Missing ai_anthropic_api_key");
    if (settings.provider === "openai" && !settings.openaiApiKey) throw new Error("Missing ai_openai_api_key");

    console.log(`Translating "${project.name}" → ${targetLang.toUpperCase()} via ${settings.provider}`);
    const out = {};
    for (const f of TRANSLATABLE_FIELDS) {
      const src = project[f];
      if (!src || typeof src !== "string" || !src.trim()) continue;
      // Slug: keep IT slug if present, otherwise generate from translated name later.
      // We translate the slug textually by translating the name and re-slugifying.
      if (f === "slug") continue;
      if (f === "seoKeywords") { out[f] = src; continue; } // keep keywords unchanged
      const html = isHtmlField(f, src);
      process.stdout.write(`  ${f}... `);
      const tr = await translateText(src, settings, "it", targetLang, html);
      out[f] = tr;
      console.log("OK");
    }
    // Slug from translated name
    const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 191);
    out.slug = out.name ? slugify(out.name) : project.slug;

    const existing = await prisma.projectTranslation.findUnique({
      where: { projectId_languageCode: { projectId, languageCode: targetLang } },
    });
    const data = {
      projectId,
      languageCode: targetLang,
      name: out.name || project.name,
      slug: out.slug,
      city: out.city || project.city || null,
      architect: out.architect || project.architect || null,
      description: out.description || project.description || null,
      shortDescription: out.shortDescription || project.shortDescription || null,
      seoTitle: out.seoTitle || project.seoTitle || null,
      seoDescription: out.seoDescription || project.seoDescription || null,
      seoKeywords: out.seoKeywords || project.seoKeywords || null,
      status: "translated",
      isPublished: true,
    };
    const result = existing
      ? await prisma.projectTranslation.update({ where: { id: existing.id }, data })
      : await prisma.projectTranslation.create({ data });
    console.log(`✓ Translation ${existing ? "updated" : "created"}: id=${result.id} slug=${result.slug}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
