/**
 * Traduce automaticamente in francese tutti i contenuti dello store
 * (categorie, prodotti, varianti, valori attributo) usando l'API di
 * traduzione AI configurata in admin → settings → AI (Claude o OpenAI).
 *
 * Idempotente: per ogni record, se la traduzione FR esiste già con i campi
 * principali popolati, viene saltata. Passa --force per sovrascrivere.
 *
 *   npx tsx scripts/translate-store-fr.ts            # solo i mancanti
 *   npx tsx scripts/translate-store-fr.ts --force    # ri-traduce tutto
 *   npx tsx scripts/translate-store-fr.ts --dry      # mostra cosa farebbe
 *   npx tsx scripts/translate-store-fr.ts --only=attributes,categories,products,variants
 *
 * Note:
 *  - Lo slug FR viene generato lato locale via slugify(name) — NON via AI —
 *    e reso univoco con suffisso "-2", "-3", … se serve.
 *  - Per `marketingDescription` (HTML) usa htmlMode true così i tag restano.
 *  - Limita la concorrenza a 2 call AI parallele per non hittare rate limit.
 */
import { translateFields, translateText } from "../src/lib/ai-translate";
import { prisma } from "../src/lib/prisma";
import { slugify } from "../src/lib/utils";

const FROM = "it";
const TO = "fr";

const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const DRY = args.has("--dry");
const ONLY = (() => {
  const arg = process.argv.find((a) => a.startsWith("--only="));
  if (!arg) return null;
  return new Set(arg.replace("--only=", "").split(",").map((s) => s.trim()).filter(Boolean));
})();

function shouldRun(section: string): boolean {
  return !ONLY || ONLY.has(section);
}

// Concurrency limiter molto leggero
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

// Stats
const stats = { translated: 0, skipped: 0, errors: 0 };

function hasContent(s: string | null | undefined): boolean {
  return !!(s && s.trim());
}

async function uniqueSlug<T extends { id: string }>(
  base: string,
  exists: (slug: string) => Promise<T | null>,
  excludeId?: string,
): Promise<string> {
  const root = slugify(base) || "page";
  let candidate = root;
  let i = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const found = await exists(candidate);
    if (!found || found.id === excludeId) return candidate;
    candidate = `${root}-${i++}`;
    if (i > 50) return `${root}-${Date.now().toString(36)}`;
  }
}

// ─── Attributes ────────────────────────────────────────────────────────
async function translateAttributes() {
  if (!shouldRun("attributes")) return;
  console.log("\n▶ Attributi (label)");
  const itRows = await prisma.storeAttributeValueTranslation.findMany({
    where: { languageCode: FROM },
    include: { value: { select: { id: true, code: true } } },
  });
  console.log(`  IT rows: ${itRows.length}`);

  await mapLimit(itRows, 2, async (it) => {
    const existing = await prisma.storeAttributeValueTranslation.findUnique({
      where: { valueId_languageCode: { valueId: it.valueId, languageCode: TO } },
    });
    if (existing && !FORCE && hasContent(existing.label)) {
      stats.skipped++;
      return;
    }
    if (!hasContent(it.label)) {
      stats.skipped++;
      return;
    }
    try {
      const translated = await translateText(it.label, { fromLang: FROM, toLang: TO });
      console.log(`  · [${it.value.code}] "${it.label}" → "${translated}"`);
      if (DRY) { stats.translated++; return; }
      if (existing) {
        await prisma.storeAttributeValueTranslation.update({
          where: { id: existing.id },
          data: { label: translated },
        });
      } else {
        await prisma.storeAttributeValueTranslation.create({
          data: { valueId: it.valueId, languageCode: TO, label: translated },
        });
      }
      stats.translated++;
    } catch (e) {
      console.error(`  ✗ [${it.value.code}]`, e instanceof Error ? e.message : e);
      stats.errors++;
    }
  });
}

// ─── Categories ────────────────────────────────────────────────────────
async function translateCategories() {
  if (!shouldRun("categories")) return;
  console.log("\n▶ Categorie");
  const itRows = await prisma.storeCategoryTranslation.findMany({
    where: { languageCode: FROM },
    include: { category: { select: { id: true, slug: true } } },
  });
  console.log(`  IT rows: ${itRows.length}`);

  await mapLimit(itRows, 2, async (it) => {
    const existing = await prisma.storeCategoryTranslation.findUnique({
      where: { categoryId_languageCode: { categoryId: it.categoryId, languageCode: TO } },
    });
    if (existing && !FORCE && hasContent(existing.name) && hasContent(existing.slug)) {
      stats.skipped++;
      return;
    }
    try {
      const plain = await translateFields({
        name: it.name || "",
        description: it.description || "",
        seoTitle: it.seoTitle || "",
        seoDescription: it.seoDescription || "",
        seoKeywords: it.seoKeywords || "",
      }, { fromLang: FROM, toLang: TO });

      const newName = plain.name || it.name;
      const newSlug = await uniqueSlug(
        newName,
        (s) => prisma.storeCategoryTranslation.findFirst({ where: { languageCode: TO, slug: s }, select: { id: true } }),
        existing?.id,
      );
      console.log(`  · [${it.category.slug}] "${it.name}" → "${newName}" (${newSlug})`);
      if (DRY) { stats.translated++; return; }

      const data = {
        name: newName,
        slug: newSlug,
        description: plain.description || null,
        seoTitle: plain.seoTitle || null,
        seoDescription: plain.seoDescription || null,
        seoKeywords: plain.seoKeywords || null,
        status: "translated",
        isPublished: it.isPublished,
      };
      if (existing) {
        await prisma.storeCategoryTranslation.update({ where: { id: existing.id }, data });
      } else {
        await prisma.storeCategoryTranslation.create({
          data: { ...data, categoryId: it.categoryId, languageCode: TO },
        });
      }
      stats.translated++;
    } catch (e) {
      console.error(`  ✗ [${it.category.slug}]`, e instanceof Error ? e.message : e);
      stats.errors++;
    }
  });
}

// ─── Products ──────────────────────────────────────────────────────────
async function translateProducts() {
  if (!shouldRun("products")) return;
  console.log("\n▶ Prodotti");
  const itRows = await prisma.storeProductTranslation.findMany({
    where: { languageCode: FROM },
    include: { storeProduct: { select: { id: true, product: { select: { slug: true, name: true } } } } },
  });
  console.log(`  IT rows: ${itRows.length}`);

  await mapLimit(itRows, 2, async (it) => {
    const existing = await prisma.storeProductTranslation.findUnique({
      where: { storeProductId_languageCode: { storeProductId: it.storeProductId, languageCode: TO } },
    });
    if (existing && !FORCE && hasContent(existing.name) && hasContent(existing.slug)) {
      stats.skipped++;
      return;
    }
    try {
      // 1) campi plain in batch
      const plain = await translateFields({
        name: it.name || it.storeProduct.product.name || "",
        shortDescription: it.shortDescription || "",
        seoTitle: it.seoTitle || "",
        seoDescription: it.seoDescription || "",
        seoKeywords: it.seoKeywords || "",
      }, { fromLang: FROM, toLang: TO });

      // 2) marketingDescription separato in htmlMode
      let marketingFr: string | null = null;
      if (hasContent(it.marketingDescription)) {
        marketingFr = await translateText(it.marketingDescription as string, {
          fromLang: FROM, toLang: TO, htmlMode: true,
        });
      }

      const newName = plain.name || it.name || it.storeProduct.product.name;
      const newSlug = await uniqueSlug(
        newName,
        (s) => prisma.storeProductTranslation.findFirst({ where: { languageCode: TO, slug: s }, select: { id: true } }),
        existing?.id,
      );

      console.log(`  · ${it.storeProduct.product.slug} → "${newName}" (${newSlug})`);
      if (DRY) { stats.translated++; return; }

      const data = {
        name: newName || null,
        slug: newSlug,
        shortDescription: plain.shortDescription || null,
        marketingDescription: marketingFr,
        seoTitle: plain.seoTitle || null,
        seoDescription: plain.seoDescription || null,
        seoKeywords: plain.seoKeywords || null,
        status: "translated",
        isPublished: it.isPublished,
      };
      if (existing) {
        await prisma.storeProductTranslation.update({ where: { id: existing.id }, data });
      } else {
        await prisma.storeProductTranslation.create({
          data: { ...data, storeProductId: it.storeProductId, languageCode: TO },
        });
      }
      stats.translated++;
    } catch (e) {
      console.error(`  ✗ ${it.storeProduct.product.slug}`, e instanceof Error ? e.message : e);
      stats.errors++;
    }
  });
}

// ─── Variants ──────────────────────────────────────────────────────────
async function translateVariants() {
  if (!shouldRun("variants")) return;
  console.log("\n▶ Varianti");
  const itRows = await prisma.storeProductVariantTranslation.findMany({
    where: { languageCode: FROM },
    include: { variant: { select: { id: true, sku: true } } },
  });
  console.log(`  IT rows: ${itRows.length}`);

  await mapLimit(itRows, 2, async (it) => {
    const existing = await prisma.storeProductVariantTranslation.findUnique({
      where: { variantId_languageCode: { variantId: it.variantId, languageCode: TO } },
    });
    if (existing && !FORCE && (hasContent(existing.name) || hasContent(existing.description))) {
      stats.skipped++;
      return;
    }
    if (!hasContent(it.name) && !hasContent(it.description)) {
      stats.skipped++;
      return;
    }
    try {
      const plain = await translateFields({
        name: it.name || "",
        description: it.description || "",
      }, { fromLang: FROM, toLang: TO });

      console.log(`  · [${it.variant.sku}] "${it.name || ""}" → "${plain.name || ""}"`);
      if (DRY) { stats.translated++; return; }

      const data = {
        name: plain.name || null,
        description: plain.description || null,
      };
      if (existing) {
        await prisma.storeProductVariantTranslation.update({ where: { id: existing.id }, data });
      } else {
        await prisma.storeProductVariantTranslation.create({
          data: { ...data, variantId: it.variantId, languageCode: TO },
        });
      }
      stats.translated++;
    } catch (e) {
      console.error(`  ✗ [${it.variant.sku}]`, e instanceof Error ? e.message : e);
      stats.errors++;
    }
  });
}

async function main() {
  console.log(`Translate store IT → FR  ${FORCE ? "[FORCE]" : ""}  ${DRY ? "[DRY-RUN]" : ""}`);
  console.log(`Sezioni: ${ONLY ? Array.from(ONLY).join(",") : "tutte"}`);

  // L'ordine conta: attributi (label) → categorie → prodotti → varianti.
  await translateAttributes();
  await translateCategories();
  await translateProducts();
  await translateVariants();

  console.log("\n──────────────────────────────");
  console.log(`✓ Tradotti: ${stats.translated}`);
  console.log(`↷ Saltati:  ${stats.skipped}`);
  console.log(`✗ Errori:   ${stats.errors}`);
}

main()
  .catch((e) => { console.error("FATAL:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
