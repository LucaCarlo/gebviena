/**
 * SOLO DEV.
 *  1) Elimina TUTTI gli StoreProduct in bozza (isPublished=false)
 *     — cascade su varianti/translations. Il Product catalogo NON viene
 *       toccato (resta nel catalogo principale, solo lo sfilo dallo store).
 *  2) Rinomina il prodotto "mos-bench-con-cuscino-lungo" → "mos-bench"
 *     (name "MOS Bench", slug "mos-bench") su Product + translations IT/FR.
 *
 * Passa --dry per vedere cosa farebbe senza scrivere.
 *   npx tsx scripts/dev-cleanup-products.ts [--dry]
 */
import { prisma } from "../src/lib/prisma";

const DRY = process.argv.includes("--dry");

async function deleteDrafts(keepId?: string) {
  const where = keepId
    ? { isPublished: false, NOT: { id: keepId } }
    : { isPublished: false };
  const drafts = await prisma.storeProduct.findMany({
    where,
    select: {
      id: true,
      product: { select: { name: true, slug: true } },
      translations: { where: { languageCode: "it" }, select: { name: true, slug: true } },
    },
  });
  console.log(`\n▶ StoreProduct in bozza da eliminare: ${drafts.length}${keepId ? " (mos-bench escluso)" : ""}`);
  for (const d of drafts) {
    const label = d.translations[0]?.name || d.product.name;
    console.log(`  - ${label}  (${d.translations[0]?.slug || d.product.slug})`);
  }
  if (!DRY && drafts.length) {
    const res = await prisma.storeProduct.deleteMany({ where });
    console.log(`✓ Eliminati ${res.count} StoreProduct in bozza (+ varianti/translations in cascade)`);
  }
}

async function renameMosBench(): Promise<string | undefined> {
  console.log(`\n▶ Rinomina mos-bench-con-cuscino-lungo → mos-bench`);
  // Cerca via translation slug o product slug
  const tr = await prisma.storeProductTranslation.findFirst({
    where: { slug: { contains: "mos-bench-con-cuscino-lungo" } },
    select: { storeProductId: true },
  });
  let storeProductId = tr?.storeProductId;
  if (!storeProductId) {
    const sp = await prisma.storeProduct.findFirst({
      where: { product: { slug: { contains: "mos-bench-con-cuscino-lungo" } } },
      select: { id: true },
    });
    storeProductId = sp?.id;
  }
  if (!storeProductId) {
    console.log("  · Prodotto non trovato — skip");
    return undefined;
  }
  const sp = await prisma.storeProduct.findUnique({
    where: { id: storeProductId },
    select: { id: true, productId: true, translations: true, product: { select: { slug: true, name: true } } },
  });
  if (!sp) { console.log("  · StoreProduct sparito — skip"); return undefined; }

  const NEW_NAME = "MOS Bench";
  const NEW_SLUG = "mos-bench";

  console.log(`  catalogo: "${sp.product.name}" (${sp.product.slug}) → "${NEW_NAME}" (${NEW_SLUG})`);
  for (const t of sp.translations) {
    console.log(`  trans[${t.languageCode}]: "${t.name}" (${t.slug}) → "${NEW_NAME}" (${NEW_SLUG})`);
  }
  if (DRY) return sp.id;

  // Uniqueness slug catalogo
  const slugTaken = await prisma.product.findFirst({
    where: { slug: NEW_SLUG, NOT: { id: sp.productId } }, select: { id: true },
  });
  const catalogSlug = slugTaken ? `${NEW_SLUG}-${Date.now().toString(36)}` : NEW_SLUG;
  await prisma.product.update({
    where: { id: sp.productId },
    data: { name: NEW_NAME, slug: catalogSlug },
  });

  for (const t of sp.translations) {
    // slug univoco per (languageCode, slug)
    const conflict = await prisma.storeProductTranslation.findFirst({
      where: { languageCode: t.languageCode, slug: NEW_SLUG, NOT: { id: t.id } },
      select: { id: true },
    });
    const trSlug = conflict ? `${NEW_SLUG}-${Date.now().toString(36)}` : NEW_SLUG;
    await prisma.storeProductTranslation.update({
      where: { id: t.id },
      data: { name: NEW_NAME, slug: trSlug },
    });
  }
  console.log("✓ Rinominato");
  return sp.id;
}

async function main() {
  console.log(DRY ? "[DRY-RUN]" : "[APPLY]");
  // Rinomina PRIMA, così se mos-bench fosse una bozza non viene cancellato.
  const keepId = await renameMosBench();
  await deleteDrafts(keepId);
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
