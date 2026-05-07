import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export interface TranslationFieldDef {
  key: string;
  label: string;
  type: "short" | "long" | "html" | "slug";
}

export interface TranslationEntityDef {
  // Prisma delegate name used at runtime via (prisma as any)[delegate]
  delegate: string;
  parentField: string;
  // Source model used to read the IT base text
  sourceDelegate: string;
  fields: TranslationFieldDef[];
}

export const TRANSLATION_ENTITIES: Record<string, TranslationEntityDef> = {
  product: {
    delegate: "productTranslation",
    parentField: "productId",
    sourceDelegate: "product",
    fields: [
      { key: "name", label: "Nome", type: "short" },
      { key: "slug", label: "Slug URL", type: "slug" },
      { key: "description", label: "Descrizione", type: "html" },
      { key: "materials", label: "Materiali", type: "long" },
      { key: "dimensions", label: "Dimensioni (testo)", type: "long" },
      { key: "variants", label: "Varianti (JSON)", type: "long" },
      { key: "seoTitle", label: "SEO Title", type: "short" },
      { key: "seoDescription", label: "SEO Description", type: "long" },
      { key: "seoKeywords", label: "SEO Keywords", type: "long" },
    ],
  },
  designer: {
    delegate: "designerTranslation",
    parentField: "designerId",
    sourceDelegate: "designer",
    fields: [
      { key: "name", label: "Nome", type: "short" },
      { key: "slug", label: "Slug URL", type: "slug" },
      { key: "bio", label: "Biografia", type: "html" },
      { key: "country", label: "Paese", type: "short" },
      { key: "seoTitle", label: "SEO Title", type: "short" },
      { key: "seoDescription", label: "SEO Description", type: "long" },
      { key: "seoKeywords", label: "SEO Keywords", type: "long" },
    ],
  },
  project: {
    delegate: "projectTranslation",
    parentField: "projectId",
    sourceDelegate: "project",
    fields: [
      { key: "name", label: "Nome", type: "short" },
      { key: "slug", label: "Slug URL", type: "slug" },
      { key: "city", label: "Città", type: "short" },
      { key: "architect", label: "Architetto", type: "short" },
      { key: "shortDescription", label: "Descrizione breve", type: "long" },
      { key: "description", label: "Descrizione", type: "html" },
      { key: "seoTitle", label: "SEO Title", type: "short" },
      { key: "seoDescription", label: "SEO Description", type: "long" },
      { key: "seoKeywords", label: "SEO Keywords", type: "long" },
    ],
  },
  campaign: {
    delegate: "campaignTranslation",
    parentField: "campaignId",
    sourceDelegate: "campaign",
    fields: [
      { key: "name", label: "Nome", type: "short" },
      { key: "slug", label: "Slug URL", type: "slug" },
      { key: "subtitle", label: "Sottotitolo", type: "short" },
      { key: "description", label: "Descrizione", type: "html" },
      { key: "blocks", label: "Blocchi (JSON)", type: "long" },
      { key: "seoTitle", label: "SEO Title", type: "short" },
      { key: "seoDescription", label: "SEO Description", type: "long" },
      { key: "seoKeywords", label: "SEO Keywords", type: "long" },
    ],
  },
  news: {
    delegate: "newsArticleTranslation",
    parentField: "newsArticleId",
    sourceDelegate: "newsArticle",
    fields: [
      { key: "title", label: "Titolo", type: "short" },
      { key: "slug", label: "Slug URL", type: "slug" },
      { key: "subtitle", label: "Sottotitolo", type: "short" },
      { key: "excerpt", label: "Estratto", type: "long" },
      { key: "content", label: "Contenuto", type: "html" },
      { key: "blocks", label: "Blocchi (JSON)", type: "long" },
      { key: "seoTitle", label: "SEO Title", type: "short" },
      { key: "seoDescription", label: "SEO Description", type: "long" },
      { key: "seoKeywords", label: "SEO Keywords", type: "long" },
    ],
  },
  catalog: {
    delegate: "catalogTranslation",
    parentField: "catalogId",
    sourceDelegate: "catalog",
    fields: [
      { key: "name", label: "Nome", type: "short" },
      { key: "slug", label: "Slug URL", type: "slug" },
      { key: "pretitle", label: "Pretitolo", type: "short" },
      { key: "title", label: "Titolo", type: "short" },
      { key: "description", label: "Descrizione", type: "long" },
      { key: "linkText", label: "Testo link", type: "short" },
    ],
  },
  hero: {
    delegate: "heroSlideTranslation",
    parentField: "heroSlideId",
    sourceDelegate: "heroSlide",
    fields: [
      { key: "title", label: "Titolo", type: "short" },
      { key: "subtitle", label: "Sottotitolo", type: "long" },
      { key: "ctaText", label: "Testo CTA", type: "short" },
      { key: "ctaLink", label: "Link CTA", type: "short" },
    ],
  },
  award: {
    delegate: "awardTranslation",
    parentField: "awardId",
    sourceDelegate: "award",
    fields: [
      { key: "name", label: "Nome", type: "short" },
      { key: "description", label: "Descrizione", type: "long" },
      { key: "seoTitle", label: "SEO Title", type: "short" },
      { key: "seoDescription", label: "SEO Description", type: "long" },
      { key: "seoKeywords", label: "SEO Keywords", type: "long" },
    ],
  },
  category: {
    delegate: "contentCategoryTranslation",
    parentField: "categoryId",
    sourceDelegate: "contentCategory",
    fields: [{ key: "label", label: "Etichetta", type: "short" }],
  },
  typology: {
    delegate: "contentTypologyTranslation",
    parentField: "typologyId",
    sourceDelegate: "contentTypology",
    fields: [{ key: "label", label: "Etichetta", type: "short" }],
  },
  subcategory: {
    delegate: "contentSubcategoryTranslation",
    parentField: "subcategoryId",
    sourceDelegate: "contentSubcategory",
    fields: [{ key: "label", label: "Etichetta", type: "short" }],
  },
  "store-product": {
    delegate: "storeProductTranslation",
    parentField: "storeProductId",
    sourceDelegate: "storeProduct",
    fields: [
      { key: "name", label: "Nome commerciale (opz., eredita dal catalogo se vuoto)", type: "short" },
      { key: "slug", label: "Slug URL", type: "slug" },
      { key: "shortDescription", label: "Descrizione breve", type: "long" },
      { key: "marketingDescription", label: "Descrizione estesa (marketing)", type: "html" },
      { key: "seoTitle", label: "SEO Title", type: "short" },
      { key: "seoDescription", label: "SEO Description", type: "long" },
      { key: "seoKeywords", label: "SEO Keywords", type: "long" },
    ],
  },
  "store-category": {
    delegate: "storeCategoryTranslation",
    parentField: "categoryId",
    sourceDelegate: "storeCategory",
    fields: [
      { key: "name", label: "Nome", type: "short" },
      { key: "slug", label: "Slug URL", type: "slug" },
      { key: "description", label: "Descrizione", type: "long" },
      { key: "seoTitle", label: "SEO Title", type: "short" },
      { key: "seoDescription", label: "SEO Description", type: "long" },
      { key: "seoKeywords", label: "SEO Keywords", type: "long" },
    ],
  },
  "store-attribute": {
    delegate: "storeAttributeValueTranslation",
    parentField: "valueId",
    sourceDelegate: "storeAttributeValue",
    fields: [
      { key: "label", label: "Etichetta", type: "short" },
    ],
  },
  landing: {
    delegate: "landingPageConfigTranslation",
    parentField: "landingPageId",
    sourceDelegate: "landingPageConfig",
    fields: [
      { key: "heroTitle", label: "Titolo hero", type: "short" },
      { key: "heroSubtitle", label: "Sottotitolo hero", type: "long" },
      { key: "buttonLabel", label: "Testo bottone form", type: "short" },
      { key: "privacyLabel", label: "Label privacy", type: "long" },
      { key: "marketingLabel", label: "Label marketing", type: "long" },
      { key: "successTitle", label: "Titolo successo", type: "short" },
      { key: "successMessage", label: "Messaggio successo", type: "long" },
      { key: "navLabelActive", label: "Nav — voce attiva", type: "short" },
      { key: "navLabelShowroom", label: "Nav — voce 'Showroom'", type: "short" },
      { key: "navLabelContatti", label: "Nav — voce 'Contatti'", type: "short" },
      { key: "eyebrow", label: "Eyebrow", type: "short" },
      { key: "block1Title", label: "Blocco 1 — titolo", type: "short" },
      { key: "block1Lines", label: "Blocco 1 — righe", type: "long" },
      { key: "block1HighlightPrefix", label: "Blocco 1 — highlight prefisso", type: "short" },
      { key: "block1HighlightStrong", label: "Blocco 1 — highlight grassetto", type: "short" },
      { key: "block1Period", label: "Blocco 1 — periodo", type: "short" },
      { key: "block2Title", label: "Blocco 2 — titolo", type: "short" },
      { key: "block2Lines", label: "Blocco 2 — righe", type: "long" },
      { key: "block2HighlightPrefix", label: "Blocco 2 — highlight prefisso", type: "short" },
      { key: "block2HighlightStrong", label: "Blocco 2 — highlight grassetto", type: "short" },
      { key: "block2Period", label: "Blocco 2 — periodo", type: "short" },
      { key: "longDescription", label: "Descrizione lunga", type: "long" },
      { key: "formCardTitle", label: "Form — titolo card", type: "short" },
      { key: "formCardSubtitle", label: "Form — sottotitolo card", type: "long" },
      { key: "disclaimer", label: "Disclaimer", type: "long" },
      { key: "formFieldLabels", label: "Etichette campi form (JSON)", type: "long" },
      { key: "emailSubject", label: "Email — oggetto", type: "short" },
      { key: "emailTitle", label: "Email — titolo", type: "short" },
      { key: "emailBody", label: "Email — corpo", type: "long" },
    ],
  },
};

export function getEntityDef(entity: string): TranslationEntityDef | null {
  return TRANSLATION_ENTITIES[entity] || null;
}

// Use any here: dynamic delegate access on prisma is intentionally untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

export async function listTranslations(entity: string, entityId: string) {
  const def = getEntityDef(entity);
  if (!def) throw new Error(`Unknown entity ${entity}`);
  const delegate = (prisma as unknown as Record<string, AnyDelegate>)[def.delegate];
  return delegate.findMany({
    where: { [def.parentField]: entityId },
    orderBy: { languageCode: "asc" },
  });
}

export async function upsertTranslation(
  entity: string,
  entityId: string,
  languageCode: string,
  data: Record<string, unknown>
) {
  const def = getEntityDef(entity);
  if (!def) throw new Error(`Unknown entity ${entity}`);
  const delegate = (prisma as unknown as Record<string, AnyDelegate>)[def.delegate];

  // Strip unknown keys
  const allowed = new Set(def.fields.map((f) => f.key));
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (allowed.has(k)) clean[k] = v;
  }
  if (typeof data.status === "string") clean.status = data.status;
  if (typeof data.isPublished === "boolean") clean.isPublished = data.isPublished;

  // For CREATE, the translation row may have NOT NULL columns (es. title, name, slug)
  // that aren't in `clean` because the admin only translated some fields (es. only blocks).
  // Fallback: copy missing translatable fields from the IT source so the row can be created.
  // Per store-*, la "source" è la translation IT; per le altre è la tabella parent.
  const source = entity.startsWith("store-")
    ? await (prisma as unknown as Record<string, AnyDelegate>)[def.delegate].findFirst({
        where: { [def.parentField]: entityId, languageCode: "it" },
      })
    : await (prisma as unknown as Record<string, AnyDelegate>)[def.sourceDelegate].findUnique({
        where: { id: entityId },
      });
  const createData: Record<string, unknown> = { ...clean, [def.parentField]: entityId, languageCode };
  if (source) {
    for (const f of def.fields) {
      if (createData[f.key] === undefined) {
        const srcVal = (source as Record<string, unknown>)[f.key];
        if (srcVal !== undefined && srcVal !== null) createData[f.key] = srcVal;
      }
    }
  }

  const uniqueWhere = {
    [`${def.parentField}_languageCode`]: { [def.parentField]: entityId, languageCode },
  } as Prisma.JsonObject;

  return delegate.upsert({
    where: uniqueWhere,
    update: clean,
    create: createData,
  });
}

export async function loadSourceText(entity: string, entityId: string) {
  const def = getEntityDef(entity);
  if (!def) throw new Error(`Unknown entity ${entity}`);

  // Per entità store-*, i testi tradotti vivono SOLO nelle translation table
  // (il record parent ha solo metadata come coverImage, isPublished, ecc.).
  // Quindi la "sorgente" per la traduzione AI è la translation IT.
  if (entity.startsWith("store-")) {
    const translationDelegate = (prisma as unknown as Record<string, AnyDelegate>)[def.delegate];
    return translationDelegate.findFirst({
      where: { [def.parentField]: entityId, languageCode: "it" },
    });
  }

  const delegate = (prisma as unknown as Record<string, AnyDelegate>)[def.sourceDelegate];
  const row = await delegate.findUnique({ where: { id: entityId } });

  // Per `landing`: i sotto-campi traducibili (eyebrow, block1Title, ...) vivono nel JSON
  // `customConfig`. Esplodiamo il JSON al top-level del source object così l'AI può
  // tradurli singolarmente come per qualunque altro field.
  if (entity === "landing" && row && typeof (row as Record<string, unknown>).customConfig === "string") {
    try {
      const cfg = JSON.parse((row as Record<string, unknown>).customConfig as string);
      if (cfg && typeof cfg === "object") {
        return { ...(row as Record<string, unknown>), ...(cfg as Record<string, unknown>) };
      }
    } catch { /* fall through */ }
  }

  return row;
}
