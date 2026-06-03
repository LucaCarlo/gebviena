import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { marketFromLang, resolveVariantPrice } from "@/lib/store-pricing";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Strategie di ordinamento supportate (mirror di quelle nel tab Ordinamento admin).
type SortStrategy =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "manual"
  | "random";

// PRNG seedato (mulberry32) per il random "stabile per sessione".
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Carica le impostazioni di ordinamento store_sorting dal DB (cached con TTL breve).
let _cachedSortCfg: { value: SortConfig; ts: number } | null = null;
const SORT_CFG_TTL_MS = 30_000;

interface SortConfig {
  strategy: SortStrategy;
  randomMode: "per-request" | "per-session";
  pinnedIds: string[];
  allowUserOverride: boolean;
}

async function loadSortConfig(): Promise<SortConfig> {
  if (_cachedSortCfg && Date.now() - _cachedSortCfg.ts < SORT_CFG_TTL_MS) return _cachedSortCfg.value;
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["store.sort.strategy", "store.sort.random_mode", "store.sort.pinned_ids", "store.sort.allow_user_override"] } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const strategy = (map.get("store.sort.strategy") || "newest") as SortStrategy;
  const randomMode = (map.get("store.sort.random_mode") || "per-request") === "per-session" ? "per-session" : "per-request";
  let pinnedIds: string[] = [];
  try {
    const raw = map.get("store.sort.pinned_ids") || "[]";
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) pinnedIds = parsed.filter((x) => typeof x === "string");
  } catch { /* ignore */ }
  const allowUserOverride = (map.get("store.sort.allow_user_override") || "true") !== "false";
  const value: SortConfig = { strategy, randomMode, pinnedIds, allowUserOverride };
  _cachedSortCfg = { value, ts: Date.now() };
  return value;
}

/**
 * GET /api/store/public/products
 * Query: lang, category=<slug> | categoryId, attrs=ID1,ID2, q, minPrice, maxPrice,
 *        onlyAvailable=1, sort=newest|price-asc|price-desc|name|top-sold|top-favorited
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lang = sp.get("lang") || "it";
  const categorySlug = sp.get("category");
  const categoryId = sp.get("categoryId");
  const attrs = (sp.get("attrs") || "").split(",").filter(Boolean);
  const q = (sp.get("q") || "").trim();
  const minPrice = Number(sp.get("minPrice")) || 0;
  const maxPrice = Number(sp.get("maxPrice")) || 0;
  const onlyAvailable = sp.get("onlyAvailable") === "1";
  const sortParam = sp.get("sort");

  // Carica config di ordinamento dallo store: l'admin sceglie strategia globale,
  // l'utente può sovrascriverla via ?sort= solo se allowUserOverride === true.
  const sortCfg = await loadSortConfig();
  const sort: SortStrategy = (sortParam && sortCfg.allowUserOverride)
    ? (sortParam as SortStrategy)
    : sortCfg.strategy;

  const market = marketFromLang(lang);

  const variantsFilter: Prisma.StoreProductVariantWhereInput = { isPublished: true };
  if (attrs.length > 0) variantsFilter.attributes = { some: { valueId: { in: attrs } } };
  // Componiamo i filtri (disponibilità) come AND di clausole. Il filtro prezzo
  // è applicato dopo in JS perché, per FR, dipende dal fallback FR→IT.
  const andClauses: Prisma.StoreProductVariantWhereInput[] = [];
  if (onlyAvailable) {
    andClauses.push({
      OR: [
        { trackStock: false },
        { trackStock: true, stockQty: { gt: 0 } },
      ],
    });
  }
  if (andClauses.length > 0) variantsFilter.AND = andClauses;

  const where: Prisma.StoreProductWhereInput = {
    isPublished: true,
    variants: { some: variantsFilter },
  };
  if (categorySlug) {
    where.storeCategory = { slug: categorySlug };
  } else if (categoryId) {
    where.storeCategoryId = categoryId;
  }
  if (q) {
    where.OR = [
      { product: { name: { contains: q } } },
      { translations: { some: { languageCode: lang, name: { contains: q } } } },
      { translations: { some: { languageCode: lang, shortDescription: { contains: q } } } },
    ];
  }

  // OrderBy iniziale lato DB: solo per le strategie che mappano direttamente su
  // colonne Prisma. price-asc/desc e random sono completati dopo in JS perché
  // dipendono dal mercato e/o richiedono shuffle determinista.
  // Retrocompat: alcuni client più vecchi inviano sort=name (= name-asc).
  const sortNormalized: SortStrategy = (sort as string) === "name" ? "name-asc" : sort;
  let orderBy: Prisma.StoreProductOrderByWithRelationInput[];
  switch (sortNormalized) {
    case "oldest":     orderBy = [{ publishedAt: "asc" }]; break;
    case "name-asc":   orderBy = [{ product: { name: "asc" } }]; break;
    case "name-desc":  orderBy = [{ product: { name: "desc" } }]; break;
    case "manual":     orderBy = [{ sortOrder: "asc" }, { publishedAt: "desc" }]; break;
    case "newest":
    case "random":
    case "price-asc":
    case "price-desc":
    default:           orderBy = [{ sortOrder: "asc" }, { publishedAt: "desc" }]; break;
  }

  const products = await prisma.storeProduct.findMany({
    where,
    orderBy,
    take: 200,
    select: {
      id: true,
      coverImage: true,
      galleryImages: true,
      sortOrder: true,
      storeCategory: {
        select: { id: true, slug: true, translations: { select: { languageCode: true, name: true, slug: true } } },
      },
      product: {
        select: { id: true, name: true, slug: true, coverImage: true, imageUrl: true },
      },
      translations: {
        select: {
          languageCode: true, name: true, slug: true, shortDescription: true,
        },
      },
      variants: {
        where: { isPublished: true },
        select: {
          id: true, sku: true, priceCents: true, salePriceCents: true,
          priceFrCents: true, salePriceFrCents: true,
          priceWithVatCents: true,
          stockQty: true, trackStock: true,
          isDefault: true, coverImage: true,
          attributes: { select: { valueId: true, value: { select: { id: true, type: true, code: true, hexColor: true } } } },
        },
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
      },
    },
  });

  // Proiezione in una struttura comoda per il frontend
  const data = products.map((p) => {
    const tr = p.translations.find((t) => t.languageCode === lang) || p.translations.find((t) => t.languageCode === "it");
    // Risolvi i prezzi per il MERCATO (IT/FR) — FR ricade su IT se priceFrCents null.
    const resolved = p.variants.map((v) => resolveVariantPrice(v, market));
    const minBase = resolved.reduce((m, r) => Math.min(m, r.basePriceCents), Infinity);
    const minEffective = resolved.reduce((m, r) => Math.min(m, r.effectivePriceCents), Infinity);
    const hasAnyDiscount = resolved.some((r) => r.salePriceCents != null && r.salePriceCents < r.basePriceCents);
    const hasStock = p.variants.some((v) => !v.trackStock || (v.stockQty ?? 0) > 0);

    // Hover image: prima immagine della gallery dello store, fallback cover di un'altra variante
    let hoverImage: string | null = null;
    try {
      const gallery = p.galleryImages ? (JSON.parse(p.galleryImages) as string[]) : [];
      if (Array.isArray(gallery) && gallery.length > 0) hoverImage = gallery[0];
    } catch { /* ignore */ }
    if (!hoverImage) {
      const altVariant = p.variants.find((v) => v.coverImage && v.coverImage !== p.coverImage);
      if (altVariant?.coverImage) hoverImage = altVariant.coverImage;
    }

    // Color swatches: valori distinti di tipo COLOR tra le varianti (con hex + label)
    const colorsMap = new Map<string, { code: string; hex: string | null }>();
    for (const v of p.variants) {
      for (const attr of v.attributes) {
        if (attr.value.type === "COLOR" && !colorsMap.has(attr.value.id)) {
          colorsMap.set(attr.value.id, { code: attr.value.code, hex: attr.value.hexColor });
        }
      }
    }
    const colors = Array.from(colorsMap.entries()).map(([id, v]) => ({ id, code: v.code, hex: v.hex }));

    return {
      id: p.id,
      slug: tr?.slug || p.product.slug,
      name: tr?.name || p.product.name,
      shortDescription: tr?.shortDescription || null,
      coverImage: p.coverImage || p.product.coverImage || p.product.imageUrl,
      hoverImage,
      colors,
      priceFromCents: isFinite(minBase) ? minBase : 0,
      salePriceFromCents: hasAnyDiscount && isFinite(minEffective) ? minEffective : null,
      variantsCount: p.variants.length,
      inStock: hasStock,
      category: p.storeCategory
        ? {
            slug: p.storeCategory.slug,
            name: p.storeCategory.translations.find((t) => t.languageCode === lang)?.name
              || p.storeCategory.translations.find((t) => t.languageCode === "it")?.name
              || p.storeCategory.slug,
          }
        : null,
    };
  });

  // Per ordinamento + filtro prezzo usa il prezzo effettivamente pagato dal cliente
  // nel mercato corrente (sale se presente, altrimenti regular).
  const effective = (x: { priceFromCents: number; salePriceFromCents: number | null }) =>
    x.salePriceFromCents != null ? x.salePriceFromCents : x.priceFromCents;

  let filtered = data;
  if (minPrice > 0 || maxPrice > 0) {
    const minCents = minPrice > 0 ? Math.round(minPrice * 100) : 0;
    const maxCents = maxPrice > 0 ? Math.round(maxPrice * 100) : Number.POSITIVE_INFINITY;
    filtered = data.filter((p) => {
      const e = effective(p);
      return e >= minCents && e <= maxCents;
    });
  }

  let sorted = filtered;
  if (sort === "price-asc") {
    sorted = [...filtered].sort((a, b) => effective(a) - effective(b));
  } else if (sort === "price-desc") {
    sorted = [...filtered].sort((a, b) => effective(b) - effective(a));
  } else if (sort === "random") {
    // Seed:
    // - per-request: nuovo seed ad ogni chiamata (Math.random) → ordine sempre diverso
    // - per-session: seed dal cookie gtv_shop_seed (creato sotto se mancante) →
    //                stabile per quella sessione browser
    let seed: number;
    let setCookieSeed: string | null = null;
    if (sortCfg.randomMode === "per-session") {
      const cookieHeader = req.headers.get("cookie") || "";
      const m = cookieHeader.match(/(?:^|; )gtv_shop_seed=([^;]+)/);
      const cookieVal = m ? decodeURIComponent(m[1]) : "";
      if (cookieVal) {
        seed = seedFromString(cookieVal);
      } else {
        setCookieSeed = randomBytes(8).toString("hex");
        seed = seedFromString(setCookieSeed);
      }
    } else {
      seed = (Math.floor(Math.random() * 0xffffffff)) >>> 0;
    }
    const rng = mulberry32(seed);
    sorted = shuffleInPlace([...filtered], rng);
    // Set cookie session-seed se appena generato (durata 24h)
    if (setCookieSeed) {
      const res = NextResponse.json({ success: true, data: applyPinned(sorted, sortCfg.pinnedIds) });
      res.headers.set("Set-Cookie", `gtv_shop_seed=${setCookieSeed}; Path=/; Max-Age=86400; SameSite=Lax`);
      return res;
    }
  }

  return NextResponse.json({ success: true, data: applyPinned(sorted, sortCfg.pinnedIds) });
}

// I prodotti pinnati vanno SEMPRE in cima, nell'ordine indicato dall'admin.
// Il resto della lista mantiene l'ordinamento già calcolato. Se un id pinned
// non è nella lista (filtrato fuori da category/q/disponibilità), viene
// ignorato silenziosamente.
function applyPinned<T extends { id: string }>(list: T[], pinnedIds: string[]): T[] {
  if (pinnedIds.length === 0) return list;
  const pinSet = new Set(pinnedIds);
  const indexed = new Map<string, T>();
  for (const item of list) indexed.set(item.id, item);
  const pinned: T[] = [];
  for (const id of pinnedIds) {
    const item = indexed.get(id);
    if (item) pinned.push(item);
  }
  const rest = list.filter((x) => !pinSet.has(x.id));
  return [...pinned, ...rest];
}
