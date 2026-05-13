/**
 * Importer prodotti store da Excel.
 *
 * Uso:
 *   npx tsx scripts/import-xlsx-store-products.ts <path-xlsx> [--publish] [--unpublish-all]
 *
 * Esempi:
 *   npx tsx scripts/import-xlsx-store-products.ts ./PRODOTTI_NUOVI_DA_VERNICIARE.xlsx --publish
 *   npx tsx scripts/import-xlsx-store-products.ts ./PRODOTTI_NUOVI_DA_VERNICIARE.xlsx           # crea/aggiorna senza pubblicare
 *
 * Comportamento:
 *  - Raggruppa per colonna "Raggruppamento": ogni raggruppamento = 1 StoreProduct.
 *  - Ogni riga = 1 StoreProductVariant (SKU = colonna "codice").
 *  - Cerca Product esistente per nome (case-insensitive normalizzato);
 *    se non esiste lo crea con metadati minimi (designerName = "GTV", category = "verniciature-custom").
 *  - StoreProduct riusa Product trovato/creato (relazione 1:1 sulla productId).
 *  - Translation IT viene creata/aggiornata con slug = slugify(nome raggruppamento).
 *  - Idempotente: re-run aggiorna prezzi e descrizioni, non duplica.
 *
 * Dipendenze:
 *  - xlsx (npm install xlsx)
 *  - @prisma/client
 */
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const prisma = new PrismaClient();

interface ExcelRow {
  group: string;
  code: string;
  internalDescription: string;
  marketingDescription: string;
  listPrice: number | null;
  vatPrice: number | null;
  finalPrice: number | null;
  maxPerBox: number | null;
}

const COL_GROUP = "Raggruppamento ";
const COL_CODE = "codice";
const COL_DESC_INTERNAL = "descrizione";
const COL_DESC_MARKETING = "descrizione per rete vendita";
const COL_PRICE_LIST = " prezzo listino ";
const COL_PRICE_VAT = " prezzo ivato ";
const COL_PRICE_FINAL = " prezzo finale scontato (40%) e ivato (22%) ";
const COL_MAX_BOX = " MAX PRODOTTI 1 SCATOLA ";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function readExcel(filePath: string): ExcelRow[] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  return rows
    .map((r) => ({
      group: String(r[COL_GROUP] ?? "").trim(),
      code: String(r[COL_CODE] ?? "").trim(),
      internalDescription: String(r[COL_DESC_INTERNAL] ?? "").trim(),
      marketingDescription: String(r[COL_DESC_MARKETING] ?? "").trim(),
      listPrice: r[COL_PRICE_LIST] !== null && r[COL_PRICE_LIST] !== "" ? Number(r[COL_PRICE_LIST]) : null,
      vatPrice: r[COL_PRICE_VAT] !== null && r[COL_PRICE_VAT] !== "" ? Number(r[COL_PRICE_VAT]) : null,
      finalPrice: r[COL_PRICE_FINAL] !== null && r[COL_PRICE_FINAL] !== "" ? Number(r[COL_PRICE_FINAL]) : null,
      maxPerBox: r[COL_MAX_BOX] !== null && r[COL_MAX_BOX] !== "" ? Number(r[COL_MAX_BOX]) : null,
    }))
    .filter((r) => r.group && r.code);
}

async function findOrCreateProduct(groupName: string, marketingDescription: string): Promise<string> {
  const normGroup = normalize(groupName);
  // Look up product by normalized name match (case-insensitive substring/exact)
  const candidates = await prisma.product.findMany({
    where: {
      OR: [
        { name: { equals: groupName } },
        { slug: { equals: slugify(groupName) } },
      ],
    },
    select: { id: true, name: true, slug: true },
  });
  let match = candidates.find((c) => normalize(c.name) === normGroup);
  if (!match) {
    // Fuzzy: name STARTS WITH the group name (e.g. "N.14" matches "N.14 Bistro Chair")
    const all = await prisma.product.findMany({ select: { id: true, name: true, slug: true } });
    match = all.find((p) => normalize(p.name).startsWith(normGroup) || normalize(p.name) === normGroup);
  }
  if (match) return match.id;

  // Create placeholder product
  const baseSlug = slugify(groupName);
  let slug = baseSlug;
  let i = 2;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${i++}`;
  }
  const created = await prisma.product.create({
    data: {
      name: groupName,
      slug,
      designerId: null,
      designerName: "GTV",
      category: "verniciature-custom",
      description: marketingDescription || null,
      imageUrl: "",
      isActive: true,
      isFeatured: false,
      isNew: true,
    },
    select: { id: true },
  });
  return created.id;
}

async function upsertStoreProduct(
  productId: string,
  productsPerBox: number,
  publish: boolean,
): Promise<string> {
  const existing = await prisma.storeProduct.findUnique({ where: { productId } });
  if (existing) {
    const updates: { isPublished?: boolean; publishedAt?: Date | null; productsPerBox?: number } = {};
    if (publish && !existing.isPublished) {
      updates.isPublished = true;
      updates.publishedAt = existing.publishedAt || new Date();
    }
    if (productsPerBox > 0 && existing.productsPerBox !== productsPerBox) {
      updates.productsPerBox = productsPerBox;
    }
    if (Object.keys(updates).length > 0) {
      await prisma.storeProduct.update({ where: { id: existing.id }, data: updates });
    }
    return existing.id;
  }
  const created = await prisma.storeProduct.create({
    data: {
      productId,
      isPublished: publish,
      publishedAt: publish ? new Date() : null,
      sortOrder: 0,
      productsPerBox: productsPerBox > 0 ? productsPerBox : 1,
    },
  });
  return created.id;
}

async function upsertTranslation(storeProductId: string, groupName: string, marketing: string, publish: boolean) {
  const baseSlug = slugify(groupName);
  let slug = baseSlug;
  // Garantisce unicità di (languageCode, slug)
  const existingForThis = await prisma.storeProductTranslation.findUnique({
    where: { storeProductId_languageCode: { storeProductId, languageCode: "it" } },
  });
  if (!existingForThis) {
    let i = 2;
    while (await prisma.storeProductTranslation.findFirst({ where: { languageCode: "it", slug } })) {
      slug = `${baseSlug}-${i++}`;
    }
    await prisma.storeProductTranslation.create({
      data: {
        storeProductId,
        languageCode: "it",
        name: groupName,
        slug,
        shortDescription: marketing.length > 280 ? marketing.slice(0, 277) + "…" : marketing,
        marketingDescription: marketing,
        status: publish ? "published" : "draft",
        isPublished: publish,
      },
    });
  } else {
    // Aggiorna nome / descrizioni / pubblicazione (slug invariato per non rompere URL)
    await prisma.storeProductTranslation.update({
      where: { id: existingForThis.id },
      data: {
        name: groupName,
        shortDescription: marketing
          ? marketing.length > 280
            ? marketing.slice(0, 277) + "…"
            : marketing
          : existingForThis.shortDescription,
        marketingDescription: marketing || existingForThis.marketingDescription,
        status: publish ? "published" : existingForThis.status,
        isPublished: publish || existingForThis.isPublished,
      },
    });
  }
}

async function upsertVariant(
  storeProductId: string,
  row: ExcelRow,
  isFirstInGroup: boolean,
  publish: boolean,
) {
  // SKU = codice Excel, troncato a 64 (vincolo schema)
  const sku = row.code.slice(0, 64);

  // Mapping prezzi:
  // - priceCents          = "prezzo ivato" (prezzo pieno IVA inclusa, mostrato barrato sulla card)
  // - salePriceCents      = "prezzo finale scontato (40%) e ivato (22%)" (quello che il cliente paga)
  // - priceWithVatCents   = stesso valore di salePriceCents per coerenza con il pannello admin
  //                         che usa questo campo come "prezzo finale IVA inclusa" interno.
  const fullPriceCents = row.vatPrice !== null && row.vatPrice > 0
    ? Math.round(row.vatPrice * 100)
    : (row.finalPrice !== null ? Math.round(row.finalPrice * 100) : 0);
  const finalCents = row.finalPrice !== null ? Math.round(row.finalPrice * 100) : fullPriceCents;
  // Solo se c'è effettivamente uno sconto popoliamo salePriceCents.
  const hasDiscount = finalCents > 0 && finalCents < fullPriceCents;
  const salePriceCents = hasDiscount ? finalCents : null;
  // Stima volume da maxPerBox (1 = 0.10, 2 = 0.05, ecc.); fallback 0.05.
  const maxBox = row.maxPerBox && row.maxPerBox > 0 ? row.maxPerBox : 2;
  const volumeM3 = Math.max(0.01, Math.min(0.5, 0.1 / maxBox));

  const variantName = row.internalDescription || row.marketingDescription.split(".")[0] || row.code;

  const existing = await prisma.storeProductVariant.findUnique({ where: { sku } });
  if (existing) {
    await prisma.storeProductVariant.update({
      where: { id: existing.id },
      data: {
        storeProductId, // riassocia se il SKU era stato collegato altrove
        priceCents: fullPriceCents,
        salePriceCents,
        priceWithVatCents: hasDiscount ? finalCents : null,
        volumeM3,
        trackStock: false,
        stockQty: null,
        shippingClass: "STANDARD",
        isPublished: publish || existing.isPublished,
        isDefault: existing.isDefault || isFirstInGroup,
      },
    });
    // Aggiorna translation
    const trans = await prisma.storeProductVariantTranslation.findUnique({
      where: { variantId_languageCode: { variantId: existing.id, languageCode: "it" } },
    });
    if (trans) {
      await prisma.storeProductVariantTranslation.update({
        where: { id: trans.id },
        data: { name: variantName, description: row.marketingDescription || null },
      });
    } else {
      await prisma.storeProductVariantTranslation.create({
        data: {
          variantId: existing.id,
          languageCode: "it",
          name: variantName,
          description: row.marketingDescription || null,
        },
      });
    }
    return existing.id;
  }

  const created = await prisma.storeProductVariant.create({
    data: {
      storeProductId,
      sku,
      priceCents: fullPriceCents,
      salePriceCents,
      priceWithVatCents: hasDiscount ? finalCents : null,
      stockQty: null,
      trackStock: false,
      volumeM3,
      weightKg: null,
      shippingClass: "STANDARD",
      isDefault: isFirstInGroup,
      isPublished: publish,
      sortOrder: 0,
      translations: {
        create: {
          languageCode: "it",
          name: variantName,
          description: row.marketingDescription || null,
        },
      },
    },
  });
  return created.id;
}

async function main() {
  const args = process.argv.slice(2);
  const xlsxPath = args.find((a) => !a.startsWith("--"));
  const publish = args.includes("--publish");

  if (!xlsxPath) {
    console.error("Uso: npx tsx scripts/import-xlsx-store-products.ts <path-xlsx> [--publish]");
    process.exit(1);
  }
  const absPath = path.resolve(xlsxPath);
  if (!fs.existsSync(absPath)) {
    console.error("File non trovato:", absPath);
    process.exit(1);
  }

  console.log(`📄 Lettura Excel: ${absPath}`);
  const rows = readExcel(absPath);
  console.log(`✓ Righe valide: ${rows.length}`);

  // Group by Raggruppamento
  const groups = new Map<string, ExcelRow[]>();
  for (const r of rows) {
    if (!groups.has(r.group)) groups.set(r.group, []);
    groups.get(r.group)!.push(r);
  }
  console.log(`✓ Raggruppamenti: ${groups.size}`);
  console.log(`🔧 Modalità: ${publish ? "PUBBLICAZIONE ATTIVA" : "draft (passa --publish per pubblicare)"}`);

  let createdProducts = 0;
  let reusedProducts = 0;
  let createdStoreProducts = 0;
  let createdVariants = 0;
  let updatedVariants = 0;

  for (const [groupName, groupRows] of Array.from(groups.entries())) {
    const typedRows = groupRows as ExcelRow[];
    const marketingDesc = typedRows.find((r: ExcelRow) => r.marketingDescription)?.marketingDescription || "";
    // productsPerBox: prendi il MAX maxPerBox tra le varianti del raggruppamento
    // (rappresenta quanti pezzi entrano in una scatola — è una proprietà del prodotto)
    const productsPerBox = typedRows.reduce((max: number, r: ExcelRow) => {
      const v = r.maxPerBox && r.maxPerBox > 0 ? Math.floor(r.maxPerBox) : 0;
      return v > max ? v : max;
    }, 0);

    const beforeProductCount = await prisma.product.count();
    const productId = await findOrCreateProduct(groupName, marketingDesc);
    const afterProductCount = await prisma.product.count();
    if (afterProductCount > beforeProductCount) createdProducts++;
    else reusedProducts++;

    const beforeStore = await prisma.storeProduct.count();
    const storeProductId = await upsertStoreProduct(productId, productsPerBox, publish);
    const afterStore = await prisma.storeProduct.count();
    if (afterStore > beforeStore) createdStoreProducts++;

    await upsertTranslation(storeProductId, groupName, marketingDesc, publish);

    for (let i = 0; i < groupRows.length; i++) {
      const row = groupRows[i];
      const wasExisting = !!(await prisma.storeProductVariant.findUnique({ where: { sku: row.code.slice(0, 64) }, select: { id: true } }));
      await upsertVariant(storeProductId, row, i === 0, publish);
      if (wasExisting) updatedVariants++;
      else createdVariants++;
    }

    console.log(
      `  • ${groupName.padEnd(36)} → ${groupRows.length} variant${groupRows.length === 1 ? "" : "i"}  · ${productsPerBox || 1}/scatola  (${
        publish ? "pubblicato" : "draft"
      })`
    );
  }

  console.log("");
  console.log("════════════════════════════════════════════════════");
  console.log(`  Product:        ${createdProducts} creati, ${reusedProducts} riusati`);
  console.log(`  StoreProduct:   ${createdStoreProducts} creati`);
  console.log(`  Variants:       ${createdVariants} creati, ${updatedVariants} aggiornati`);
  console.log("════════════════════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error("❌ Errore:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
