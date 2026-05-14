/**
 * Import del file "PRODOTTI IN VENDITA SPECIALE ONLINE.xlsx" — versione
 * finale dei prodotti per la vendita speciale online.
 *
 * Colonne attese:
 *   Nome commerciale, SKU, descrizione per rete vendita,
 *   prezzo listino, prezzo ivato, Sconto, prezzo finale scontato ivato (22%),
 *   MAX PRODOTTI 1 SCATOLA,
 *   Struttura, Colore, Seduta, Variante, Imbottitura, Inserti,
 *   H, W, D, SH, AH, SHH (mm)
 *
 * Logica:
 *  1) Match prodotto: cerca StoreProductVariant per SKU. Se esiste → upsert su
 *     quel StoreProduct (riusa la riga). Altrimenti cerca Product per nome,
 *     altrimenti crea.
 *  2) Attributi: per ogni colonna (Struttura/Colore/Seduta/Variante/Imbottitura/
 *     Inserti) se il valore non è vuoto, cerca StoreAttributeValue con quel
 *     label (lingua IT) e tipo corrispondente. Crealo se manca. Assegnalo alla
 *     variante.
 *  3) Dimensioni: il DimensionBlock "Dimensioni complete (H/W/D/SH/AH/SHH)"
 *     deve esistere (script create-dimension-block-hwdsh.ts). Assegna l'id +
 *     dimensionValues come JSON con i 6 campi (in mm o cm — testo libero).
 *  4) Prezzi:
 *       priceCents       = prezzo ivato * 100         (prezzo pieno barrato)
 *       salePriceCents   = prezzo finale scontato ivato * 100 (prezzo effettivo)
 *       priceWithVatCents = salePriceCents (legacy)
 *  5) Descrizione breve PER variante → StoreProductVariantTranslation.description
 *     (NON sovrascrive marketingDescription enrichita su StoreProductTranslation).
 *  6) productsPerBox: MAX dei MAX_PER_BOX delle varianti del gruppo.
 *  7) Volume m³: stimato da H*W*D (mm³ → m³); se uno è null, usa fallback.
 *
 * Uso:
 *   npx tsx scripts/import-special-sale.ts <path.xlsx>           # dry-run
 *   npx tsx scripts/import-special-sale.ts <path.xlsx> --apply
 *   npx tsx scripts/import-special-sale.ts <path.xlsx> --apply --publish
 */
import { PrismaClient, StoreAttributeType } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const prisma = new PrismaClient();

// ─── Colonne Excel ─────────────────────────────────────────────────────
const COL_NAME = "Nome commerciale";
const COL_SKU = "SKU";
const COL_DESC = "descrizione per rete vendita";
const COL_PRICE_LIST = " prezzo listino ";
const COL_PRICE_VAT = " prezzo ivato ";
const COL_DISCOUNT = " Sconto ";
const COL_PRICE_FINAL = " prezzo finale scontato ivato (22%) ";
const COL_MAX_BOX = " MAX PRODOTTI 1 SCATOLA ";
const COL_STRUTTURA = "Struttura";
const COL_COLORE = "Colore";
const COL_SEDUTA = "Seduta";
const COL_VARIANTE = "Variante";
const COL_IMBOTTITURA = "Imbottitura";
const COL_INSERTI = "Inserti";
const COL_H = "H";
const COL_W = "W";
const COL_D = "D";
const COL_SH = "SH";
const COL_AH = "AH";
const COL_SHH = "SHH";

interface ExcelRow {
  name: string;
  sku: string;
  description: string;
  priceList: number | null;
  priceVat: number | null;     // prezzo pieno IVA inclusa
  discount: number | null;      // 0.4 = 40%
  priceFinal: number | null;    // prezzo finale scontato IVA inclusa
  maxPerBox: number | null;
  struttura: string | null;
  colore: string | null;
  seduta: string | null;
  variante: string | null;
  imbottitura: string | null;
  inserti: string | null;
  H: number | null;
  W: number | null;
  D: number | null;
  SH: number | null;
  AH: number | null;
  SHH: number | null;
}

function readExcel(filePath: string): ExcelRow[] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  const num = (v: unknown) => (v !== null && v !== undefined && v !== "" ? Number(v) : null);
  const str = (v: unknown) => (v !== null && v !== undefined ? String(v).trim() : "");
  return rows
    .map((r) => ({
      name: str(r[COL_NAME]),
      sku: str(r[COL_SKU]).slice(0, 64),
      description: str(r[COL_DESC]),
      priceList: num(r[COL_PRICE_LIST]),
      priceVat: num(r[COL_PRICE_VAT]),
      discount: num(r[COL_DISCOUNT]),
      priceFinal: num(r[COL_PRICE_FINAL]),
      maxPerBox: num(r[COL_MAX_BOX]),
      struttura: str(r[COL_STRUTTURA]) || null,
      colore: str(r[COL_COLORE]) || null,
      seduta: str(r[COL_SEDUTA]) || null,
      variante: str(r[COL_VARIANTE]) || null,
      imbottitura: str(r[COL_IMBOTTITURA]) || null,
      inserti: str(r[COL_INSERTI]) || null,
      H: num(r[COL_H]),
      W: num(r[COL_W]),
      D: num(r[COL_D]),
      SH: num(r[COL_SH]),
      AH: num(r[COL_AH]),
      SHH: num(r[COL_SHH]),
    }))
    .filter((r) => r.name && r.sku);
}

// ─── Helpers attributi ─────────────────────────────────────────────────
function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

const ATTR_TYPES_BY_COLUMN: Record<string, StoreAttributeType> = {
  struttura: "STRUCTURE",
  colore: "COLOR",
  seduta: "SEAT",
  variante: "CONFIGURATION",
  imbottitura: "UPHOLSTERY",
  inserti: "INSERT",
};

// Cache valoriId per evitare query duplicate
const attrValueCache = new Map<string, string>(); // key = `${type}|${labelLower}` → valueId

async function findOrCreateAttrValue(type: StoreAttributeType, label: string): Promise<string> {
  const key = `${type}|${label.toLowerCase()}`;
  const cached = attrValueCache.get(key);
  if (cached) return cached;
  // Cerca translation IT con quel label per quel tipo
  const tr = await prisma.storeAttributeValueTranslation.findFirst({
    where: { languageCode: "it", label, value: { type } },
    select: { valueId: true },
  });
  if (tr) {
    attrValueCache.set(key, tr.valueId);
    return tr.valueId;
  }
  // Crea nuovo
  const baseCode = `${type.toLowerCase()}_${slugify(label)}`;
  let code = baseCode;
  let i = 2;
  while (await prisma.storeAttributeValue.findUnique({ where: { code } })) {
    code = `${baseCode}_${i++}`;
  }
  const created = await prisma.storeAttributeValue.create({
    data: { type, code, isActive: true },
  });
  await prisma.storeAttributeValueTranslation.create({
    data: { valueId: created.id, languageCode: "it", label },
  });
  attrValueCache.set(key, created.id);
  return created.id;
}

// ─── DimensionBlock ────────────────────────────────────────────────────
async function ensureDimensionBlock(): Promise<string> {
  const name = "Dimensioni complete (H/W/D/SH/AH/SHH)";
  const labels = ["H", "W", "D", "SH", "AH", "SHH"];
  let block = await prisma.dimensionBlock.findFirst({ where: { name } });
  if (!block) {
    block = await prisma.dimensionBlock.create({
      data: { name, labels: JSON.stringify(labels), isActive: true, sortOrder: 0 },
    });
  }
  return block.id;
}

// ─── Categoria per gruppo (riusa mappa esistente) ──────────────────────
const GROUP_CATEGORY: Record<string, string> = {
  "ARCH CLOTHES VALET": "complementi",
  "Caféstuhl": "sedie-e-poltroncine",
  "CAFESTUHL": "sedie-e-poltroncine",
  "CZECH": "sedie-e-poltroncine",
  "LADDER": "sedie-e-poltroncine",
  "LOOP LOUNGE": "poltrone-lounge-e-divani",
  "LOOP DINING": "sedie-e-poltroncine",
  "MAGISTRETTI 0301": "sedie-e-poltroncine",
  "MAJORDOMO": "complementi",
  "MOS CABINET": "contenitori-e-librerie",
  "MOS CONSOLE": "contenitori-e-librerie",
  "MOS BOOKCASE": "contenitori-e-librerie",
  "MOS BENCH": "sgabelli-e-panche",
  "MOS SIDE TABLE": "tavoli-e-tavolini",
  "N.14": "sedie-e-poltroncine",
  "N.18": "sedie-e-poltroncine",
  "N.200": "sedie-e-poltroncine",
  "N.811": "sedie-e-poltroncine",
  "PEERS": "sedie-e-poltroncine",
  "RADETZKY": "sedie-e-poltroncine",
  "SOLDEN": "sedie-e-poltroncine",
  "SUGILOO": "sedie-e-poltroncine",
  "TRIO": "sgabelli-e-panche",
  "VIENNA 144": "sgabelli-e-panche",
  "YOU CHAIR": "sedie-e-poltroncine",
};

async function getCategoryIdBySlug(slug: string): Promise<string | null> {
  const cat = await prisma.storeCategory.findUnique({ where: { slug }, select: { id: true } });
  return cat?.id ?? null;
}

// ─── Volume m³ stima da H/W/D in mm ────────────────────────────────────
function estimateVolume(r: ExcelRow): number {
  if (r.H && r.W && r.D) {
    // mm * mm * mm = mm³; mm³ → m³ : / 1e9
    const v = (r.H * r.W * r.D) / 1_000_000_000;
    return Math.max(0.005, Math.min(2.0, v));
  }
  // Fallback in base a maxPerBox: meno scatole → prodotto più grande
  const m = r.maxPerBox && r.maxPerBox > 0 ? r.maxPerBox : 1;
  return Math.max(0.02, Math.min(0.5, 0.1 / m));
}

// ─── Main ───────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const xlsxPath = args.find((a) => !a.startsWith("--"));
  const apply = args.includes("--apply");
  const publish = args.includes("--publish");

  if (!xlsxPath) {
    console.error("Uso: npx tsx scripts/import-special-sale.ts <path-xlsx> [--apply] [--publish]");
    process.exit(1);
  }
  const abs = path.resolve(xlsxPath);
  if (!fs.existsSync(abs)) { console.error("File non trovato:", abs); process.exit(1); }

  console.log(`📄 Excel: ${abs}`);
  console.log(apply ? "🟢 APPLY" : "🟡 DRY-RUN");
  console.log(publish ? "📢 publish=true" : "📝 publish=false (draft)");
  console.log("");

  const rows = readExcel(abs);
  console.log(`✓ Righe valide: ${rows.length}`);
  const groups = new Map<string, ExcelRow[]>();
  for (const r of rows) {
    if (!groups.has(r.name)) groups.set(r.name, []);
    groups.get(r.name)!.push(r);
  }
  console.log(`✓ Prodotti unici: ${groups.size}`);
  console.log("");

  let createdProducts = 0, reusedProducts = 0;
  let createdVariants = 0, updatedVariants = 0;
  let createdAttrValues = 0;
  let createdStoreProducts = 0;

  const dimensionBlockId = apply ? await ensureDimensionBlock() : "";

  for (const [name, groupRows] of Array.from(groups.entries())) {
    console.log(`\n=== ${name} (${(groupRows as ExcelRow[]).length} variant${(groupRows as ExcelRow[]).length === 1 ? "e" : "i"}) ===`);

    // 1) Trova o crea Product per "Nome commerciale".
    //    Prima cerca tramite una qualunque variante esistente (per SKU). Altrimenti per nome.
    let productId: string | null = null;
    let storeProductId: string | null = null;

    // Trova un SKU esistente
    for (const r of (groupRows as ExcelRow[])) {
      const ev = await prisma.storeProductVariant.findUnique({
        where: { sku: r.sku },
        include: { storeProduct: { select: { id: true, productId: true } } },
      });
      if (ev) {
        storeProductId = ev.storeProduct.id;
        productId = ev.storeProduct.productId;
        break;
      }
    }
    if (!productId) {
      // Cerca Product per nome (case-insensitive, normalizzando accenti)
      const normName = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      const all = await prisma.product.findMany({ select: { id: true, name: true, slug: true } });
      const match = all.find(
        (p) => p.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() === normName
      );
      if (match) {
        productId = match.id;
        console.log(`  ↪ Riusato Product esistente: ${match.slug}`);
        reusedProducts++;
      } else {
        if (apply) {
          const slugBase = slugify(name).replace(/_/g, "-");
          let slug = slugBase;
          let i = 2;
          while (await prisma.product.findUnique({ where: { slug } })) {
            slug = `${slugBase}-${i++}`;
          }
          const cr = await prisma.product.create({
            data: {
              name,
              slug,
              designerName: "GTV",
              category: "verniciature-custom",
              imageUrl: "",
              isActive: true,
            },
          });
          productId = cr.id;
          console.log(`  ✚ Creato Product nuovo: ${slug}`);
          createdProducts++;
        } else {
          console.log(`  (dry) Creerebbe Product: ${name}`);
        }
      }
    } else {
      reusedProducts++;
    }

    if (!apply) {
      for (const r of (groupRows as ExcelRow[])) {
        console.log(`  · ${r.sku.padEnd(15)} ivato=${r.priceVat} scontato=${r.priceFinal} dim=${r.H}x${r.W}x${r.D}`);
      }
      continue;
    }

    if (!productId) continue;

    // 2) StoreProduct upsert
    if (!storeProductId) {
      const exSP = await prisma.storeProduct.findUnique({ where: { productId } });
      if (exSP) {
        storeProductId = exSP.id;
      } else {
        const cr = await prisma.storeProduct.create({
          data: {
            productId,
            isPublished: publish,
            publishedAt: publish ? new Date() : null,
            sortOrder: 0,
            productsPerBox: 1,
          },
        });
        storeProductId = cr.id;
        createdStoreProducts++;
      }
    }

    // Categoria + productsPerBox (max delle varianti)
    const maxPerBox = (groupRows as ExcelRow[]).reduce(
      (m: number, r: ExcelRow) => Math.max(m, r.maxPerBox && r.maxPerBox > 0 ? Math.floor(r.maxPerBox) : 0),
      0,
    );
    const catSlug = GROUP_CATEGORY[name];
    const catId = catSlug ? await getCategoryIdBySlug(catSlug) : null;
    const spUpd: { isPublished?: boolean; publishedAt?: Date; productsPerBox?: number; storeCategoryId?: string | null } = {};
    if (publish) { spUpd.isPublished = true; spUpd.publishedAt = new Date(); }
    if (maxPerBox > 0) spUpd.productsPerBox = maxPerBox;
    const exSP2 = await prisma.storeProduct.findUnique({ where: { id: storeProductId }, select: { storeCategoryId: true } });
    if (catId && !exSP2?.storeCategoryId) spUpd.storeCategoryId = catId;
    if (Object.keys(spUpd).length > 0) {
      await prisma.storeProduct.update({ where: { id: storeProductId }, data: spUpd });
    }

    // 3) Translation IT del prodotto: name + short = descrizione della prima variante
    //    Preserva marketingDescription esistente (arricchita manualmente).
    const baseSlug = slugify(name).replace(/_/g, "-");
    let trSlug = baseSlug;
    const exTrans = await prisma.storeProductTranslation.findUnique({
      where: { storeProductId_languageCode: { storeProductId, languageCode: "it" } },
    });
    const firstDescr = (groupRows as ExcelRow[]).find((r: ExcelRow) => r.description)?.description || "";
    const shortDesc = firstDescr.length > 280 ? firstDescr.slice(0, 277) + "…" : firstDescr;
    if (!exTrans) {
      let i = 2;
      while (await prisma.storeProductTranslation.findFirst({ where: { languageCode: "it", slug: trSlug } })) {
        trSlug = `${baseSlug}-${i++}`;
      }
      await prisma.storeProductTranslation.create({
        data: {
          storeProductId,
          languageCode: "it",
          name,
          slug: trSlug,
          shortDescription: shortDesc,
          marketingDescription: firstDescr,
          status: publish ? "published" : "draft",
          isPublished: publish,
        },
      });
    } else {
      const useExistingMd = (exTrans.marketingDescription || "").length > firstDescr.length;
      await prisma.storeProductTranslation.update({
        where: { id: exTrans.id },
        data: {
          name,
          shortDescription: shortDesc || exTrans.shortDescription,
          marketingDescription: useExistingMd ? exTrans.marketingDescription : firstDescr,
          status: publish ? "published" : exTrans.status,
          isPublished: publish || exTrans.isPublished,
        },
      });
    }

    // 4) Loop varianti
    for (let i = 0; i < (groupRows as ExcelRow[]).length; i++) {
      const r = (groupRows as ExcelRow[])[i];
      const listPriceCents = r.priceList !== null && r.priceList > 0 ? Math.round(r.priceList * 100) : null;
      const priceCents = r.priceVat !== null && r.priceVat > 0 ? Math.round(r.priceVat * 100) : 0;
      const finalCents = r.priceFinal !== null && r.priceFinal > 0 ? Math.round(r.priceFinal * 100) : 0;
      const hasDiscount = finalCents > 0 && finalCents < priceCents;
      const salePriceCents = hasDiscount ? finalCents : null;
      const volume = estimateVolume(r);
      const dimValues: Record<string, string> = {};
      const dimWithUnit = (n: number) => `${n} mm`;
      if (r.H) dimValues.H = dimWithUnit(r.H);
      if (r.W) dimValues.W = dimWithUnit(r.W);
      if (r.D) dimValues.D = dimWithUnit(r.D);
      if (r.SH) dimValues.SH = dimWithUnit(r.SH);
      if (r.AH) dimValues.AH = dimWithUnit(r.AH);
      if (r.SHH) dimValues.SHH = dimWithUnit(r.SHH);

      const exVar = await prisma.storeProductVariant.findUnique({ where: { sku: r.sku } });
      let variantId: string;
      const baseData = {
        storeProductId,
        sku: r.sku,
        listPriceCents,
        priceCents,
        salePriceCents,
        priceWithVatCents: hasDiscount ? finalCents : null,
        volumeM3: volume,
        trackStock: false,
        stockQty: null,
        shippingClass: "STANDARD" as const,
        isPublished: publish,
        dimensionBlockId,
        dimensionValues: Object.keys(dimValues).length > 0 ? JSON.stringify(dimValues) : null,
      };
      if (exVar) {
        await prisma.storeProductVariant.update({
          where: { id: exVar.id },
          data: { ...baseData, isDefault: exVar.isDefault || i === 0 },
        });
        variantId = exVar.id;
        updatedVariants++;
      } else {
        const cr = await prisma.storeProductVariant.create({
          data: { ...baseData, isDefault: i === 0, sortOrder: i },
        });
        variantId = cr.id;
        createdVariants++;
      }

      // Variant translation: description per-variante (rete vendita)
      const exVarTr = await prisma.storeProductVariantTranslation.findUnique({
        where: { variantId_languageCode: { variantId, languageCode: "it" } },
      });
      const variantName = r.description ? r.description.split(".")[0].slice(0, 180) : r.sku;
      if (exVarTr) {
        await prisma.storeProductVariantTranslation.update({
          where: { id: exVarTr.id },
          data: { name: variantName, description: r.description || null },
        });
      } else {
        await prisma.storeProductVariantTranslation.create({
          data: { variantId, languageCode: "it", name: variantName, description: r.description || null },
        });
      }

      // 5) Attributi: pulisce i precedenti e re-aggiunge solo quelli della riga
      await prisma.storeProductVariantAttribute.deleteMany({ where: { variantId } });
      const attrCells: { col: keyof ExcelRow; type: StoreAttributeType }[] = [
        { col: "struttura", type: "STRUCTURE" },
        { col: "colore", type: "COLOR" },
        { col: "seduta", type: "SEAT" },
        { col: "variante", type: "CONFIGURATION" },
        { col: "imbottitura", type: "UPHOLSTERY" },
        { col: "inserti", type: "INSERT" },
      ];
      let attrCount = 0;
      for (const cell of attrCells) {
        const label = r[cell.col] as string | null;
        if (!label || !label.trim()) continue;
        const before = await prisma.storeAttributeValue.count();
        const valueId = await findOrCreateAttrValue(cell.type, label.trim());
        const after = await prisma.storeAttributeValue.count();
        if (after > before) createdAttrValues++;
        await prisma.storeProductVariantAttribute.create({ data: { variantId, valueId } });
        attrCount++;
      }

      console.log(`  · ${r.sku.padEnd(15)} prezzo=${(priceCents/100).toFixed(2)} sale=${salePriceCents ? (salePriceCents/100).toFixed(2) : "—"} attrs=${attrCount} dim=${Object.keys(dimValues).length}`);
    }
  }

  console.log("");
  console.log("════════════════════════════════════════════════════");
  console.log(`  Prodotti unici trattati: ${groups.size}`);
  console.log(`  Product creati: ${createdProducts}, riusati: ${reusedProducts}`);
  console.log(`  StoreProduct creati: ${createdStoreProducts}`);
  console.log(`  Varianti create: ${createdVariants}, aggiornate: ${updatedVariants}`);
  console.log(`  StoreAttributeValue creati: ${createdAttrValues}`);
  console.log(`  ${apply ? "✓ Scritto" : "⚠ DRY-RUN — nulla scritto"}`);
  console.log("════════════════════════════════════════════════════");
}

main().catch((e) => { console.error("❌", e); process.exit(1); }).finally(() => prisma.$disconnect());
