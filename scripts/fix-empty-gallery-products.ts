/**
 * Sblocca lo slideshow per i prodotti che altrimenti non mostrerebbero
 * ALCUNA immagine: store gallery vuota + tutte le immagini catalogo escluse.
 * In quel caso azzera excludedCatalogImages così il catalogo torna visibile.
 *
 *   npx tsx scripts/fix-empty-gallery-products.ts [--dry]
 */
import { prisma } from "../src/lib/prisma";

const DRY = process.argv.includes("--dry");

function parseList(s: string | null): string[] {
  if (!s) return [];
  try { const p = JSON.parse(s); if (Array.isArray(p)) return p.filter((x): x is string => typeof x === "string"); } catch { /* */ }
  return s.split("\n").map((x) => x.trim()).filter(Boolean);
}

async function main() {
  const sps = await prisma.storeProduct.findMany({
    where: { isPublished: true },
    select: {
      id: true, galleryImages: true, excludedCatalogImages: true, galleryProductId: true,
      product: { select: { name: true, slug: true, galleryImages: true } },
    },
  });

  let fixed = 0;
  for (const sp of sps) {
    const storeGallery = parseList(sp.galleryImages);
    let catalog = parseList(sp.product.galleryImages);
    if (sp.galleryProductId) {
      const gp = await prisma.product.findUnique({ where: { id: sp.galleryProductId }, select: { galleryImages: true } });
      if (gp) catalog = parseList(gp.galleryImages);
    }
    const excluded = new Set(parseList(sp.excludedCatalogImages));
    const visibleCatalog = catalog.filter((u) => !excluded.has(u));

    const wouldBeEmpty = storeGallery.length === 0 && visibleCatalog.length === 0 && catalog.length > 0;
    if (wouldBeEmpty) {
      console.log(`${DRY ? "[DRY] " : ""}✓ ${sp.product.name} (${sp.product.slug}) — ${catalog.length} immagini catalogo erano tutte escluse → ripristino`);
      if (!DRY) {
        await prisma.storeProduct.update({ where: { id: sp.id }, data: { excludedCatalogImages: null } });
      }
      fixed++;
    }
  }
  console.log(`${DRY ? "[DRY] " : ""}Prodotti sistemati: ${fixed} / ${sps.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
