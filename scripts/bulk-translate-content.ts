#!/usr/bin/env npx tsx
/**
 * Bulk-translate all source content (products, designers, projects, campaigns,
 * news, catalogs, hero slides, awards, store products, store categories,
 * content taxonomy, landing-page configs) into every active target language.
 *
 * Reuses the same AI translate helpers the admin UI uses, so it consumes the
 * Anthropic key configured under Setting(group='translations').
 *
 * Usage:
 *   npx tsx scripts/bulk-translate-content.ts                            # everything
 *   npx tsx scripts/bulk-translate-content.ts --entity=product           # one entity
 *   npx tsx scripts/bulk-translate-content.ts --entity=product --limit=2 # debug
 *   npx tsx scripts/bulk-translate-content.ts --dry-run                  # plan only
 *   npx tsx scripts/bulk-translate-content.ts --force                    # re-translate
 *   npx tsx scripts/bulk-translate-content.ts --langs=en,fr              # subset
 */
import { PrismaClient } from "@prisma/client";
import {
  TRANSLATION_ENTITIES,
  loadSourceText,
  listTranslations,
  upsertTranslation,
} from "../src/lib/translation-entities";
import { translateFields } from "../src/lib/ai-translate";

const prisma = new PrismaClient();

const ARG = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] || null;
const FLAG = (name: string) => process.argv.includes(`--${name}`);

const TARGET_LANGS = (ARG("langs") || "en,de,fr,es").split(",").map((s) => s.trim()).filter(Boolean);
const FROM_LANG = "it";
const ONLY_ENTITY = ARG("entity");
const LIMIT = parseInt(ARG("limit") || "0", 10);
const FORCE = FLAG("force");
const DRY = FLAG("dry-run");

const JSON_FIELDS = new Set(["blocks", "variants", "formFieldLabels", "formFieldPlaceholders", "block1Lines", "block2Lines"]);

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 191);
}

function detectHtml(value: unknown): boolean {
  return typeof value === "string" && /<\w/.test(value);
}

interface Stat {
  processed: number;
  created: number;
  skipped: number;
  errored: number;
}

async function processEntity(entityKey: string, def: typeof TRANSLATION_ENTITIES[string]): Promise<Stat> {
  const stat: Stat = { processed: 0, created: 0, skipped: 0, errored: 0 };

  // List source records ids
  let records: { id: string }[] = [];
  try {
    const sourceModel = (prisma as unknown as Record<string, { findMany: (args?: unknown) => Promise<{ id: string }[]> }>)[
      def.sourceDelegate
    ];
    records = await sourceModel.findMany({
      select: { id: true },
      ...(LIMIT > 0 ? { take: LIMIT } : {}),
    } as unknown as undefined);
  } catch (e) {
    console.error(`[${entityKey}] cannot list source: ${(e as Error).message}`);
    return stat;
  }

  console.log(`\n== ${entityKey.toUpperCase()} (${records.length} records) ==`);

  for (const rec of records) {
    let source: Record<string, unknown> | null = null;
    try {
      source = (await loadSourceText(entityKey, rec.id)) as Record<string, unknown> | null;
    } catch (e) {
      console.error(`  [${rec.id}] source load failed: ${(e as Error).message}`);
      stat.errored++;
      continue;
    }
    if (!source) continue;

    const existing = (await listTranslations(entityKey, rec.id)) as Record<string, unknown>[];
    const byLang = new Map<string, Record<string, unknown>>();
    for (const t of existing) byLang.set(String(t.languageCode), t);

    for (const lang of TARGET_LANGS) {
      stat.processed++;
      const cur = byLang.get(lang);

      if (cur && !FORCE) {
        // Consider complete if every translatable text field has a value
        const missing = def.fields.filter((f) => {
          if (f.type === "slug") return false;
          if (JSON_FIELDS.has(f.key)) return false;
          const v = cur[f.key];
          // Only require fields that exist on source
          const src = source![f.key];
          if (typeof src !== "string" || !src.trim()) return false;
          return typeof v !== "string" || !v.trim();
        });
        if (missing.length === 0) {
          stat.skipped++;
          continue;
        }
      }

      // Build payload of fields to translate
      const toTranslate: Record<string, string> = {};
      for (const f of def.fields) {
        if (f.type === "slug") continue; // we regenerate from translated name
        if (f.key === "seoKeywords") continue; // keywords kept as IT
        if (JSON_FIELDS.has(f.key)) continue; // skip JSON blobs (structural)
        const v = source![f.key];
        if (typeof v === "string" && v.trim()) toTranslate[f.key] = v;
      }

      if (Object.keys(toTranslate).length === 0) {
        stat.skipped++;
        continue;
      }

      if (DRY) {
        console.log(`  [DRY] ${rec.id} ${lang}: fields=${Object.keys(toTranslate).join(",")}`);
        continue;
      }

      try {
        const htmlMode = def.fields.some((f) => f.type === "html" && detectHtml(source![f.key]));
        const translated = await translateFields(toTranslate, {
          fromLang: FROM_LANG,
          toLang: lang,
          htmlMode,
        });

        const payload: Record<string, unknown> = { ...translated };

        // Slug: regenerate from translated name/title where applicable
        const slugField = def.fields.find((f) => f.type === "slug");
        if (slugField) {
          const sourceForSlug = (translated.name as string) || (translated.title as string);
          payload[slugField.key] =
            sourceForSlug && sourceForSlug.trim()
              ? slugify(sourceForSlug)
              : (source![slugField.key] as string) || slugify((source!.name || source!.title || rec.id) as string);
        }

        // SEO keywords: copy from source as-is
        if (typeof source!.seoKeywords === "string" && (source!.seoKeywords as string).trim()) {
          payload.seoKeywords = source!.seoKeywords;
        }

        // Preserve JSON blobs untouched (so the row creation has them)
        for (const k of Array.from(JSON_FIELDS)) {
          if (source![k] !== undefined && payload[k] === undefined) {
            payload[k] = source![k];
          }
        }

        payload.status = "translated";
        payload.isPublished = true;

        await upsertTranslation(entityKey, rec.id, lang, payload);
        stat.created++;
        const preview =
          (translated.name as string)?.slice(0, 50) ||
          (translated.title as string)?.slice(0, 50) ||
          (translated.label as string)?.slice(0, 50) ||
          Object.keys(translated).join(",");
        console.log(`  [OK] ${rec.id.slice(0, 12)}… ${lang}: ${preview}`);
      } catch (e) {
        stat.errored++;
        console.error(`  [ERR] ${rec.id} ${lang}: ${(e as Error).message}`);
      }
    }
  }

  return stat;
}

async function main() {
  console.log(`Target langs: ${TARGET_LANGS.join(",")}`);
  console.log(`From: ${FROM_LANG}`);
  console.log(`Mode: ${DRY ? "DRY-RUN" : FORCE ? "FORCE (overwrite)" : "incremental (skip complete)"}`);
  if (ONLY_ENTITY) console.log(`Only entity: ${ONLY_ENTITY}`);
  if (LIMIT > 0) console.log(`Limit: ${LIMIT}`);

  const grandTotal: Stat = { processed: 0, created: 0, skipped: 0, errored: 0 };
  const perEntity: Record<string, Stat> = {};

  for (const [entityKey, def] of Object.entries(TRANSLATION_ENTITIES)) {
    if (ONLY_ENTITY && entityKey !== ONLY_ENTITY) continue;
    const s = await processEntity(entityKey, def);
    perEntity[entityKey] = s;
    grandTotal.processed += s.processed;
    grandTotal.created += s.created;
    grandTotal.skipped += s.skipped;
    grandTotal.errored += s.errored;
  }

  console.log(`\n========== SUMMARY ==========`);
  for (const [k, s] of Object.entries(perEntity)) {
    console.log(`${k.padEnd(20)} processed=${s.processed} created=${s.created} skipped=${s.skipped} errored=${s.errored}`);
  }
  console.log(`${"TOTAL".padEnd(20)} processed=${grandTotal.processed} created=${grandTotal.created} skipped=${grandTotal.skipped} errored=${grandTotal.errored}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
