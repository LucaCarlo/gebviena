/**
 * Per ogni Product collegato a uno StoreProduct PUBBLICATO che manca di
 * designerId o galleryImages, prova a popolarli:
 *
 *  1) designerId mancante:
 *     a) prova lookup del Designer per name == Product.designerName
 *     b) altrimenti cerca un Product "twin" nel catalogo con nome similare
 *        e designer valorizzato; copia designerId + designerName
 *
 *  2) galleryImages mancante:
 *     cerca un twin con galleryImages valorizzata; copia tutti i campi catalogo
 *     mancanti (galleryImages, coverImage, heroImage, sideImage, imageUrl,
 *     materials, dimensions, ecc.)
 *
 * Uso:
 *   npx tsx scripts/fix-published-missing-data.ts            # dry-run
 *   npx tsx scripts/fix-published-missing-data.ts --apply
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const CATALOG_FIELDS = [
  "galleryImages", "galleryOrientations",
  "coverImage", "imageUrl", "heroImage", "sideImage",
  "description", "materials", "dimensions",
  "dimensionImage", "dimensionBlockId", "dimensionValues",
  "techSheetUrl", "model2dUrl", "model3dUrl",
  "year", "subcategory",
] as const;

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function isGalleryEmpty(g: string | null | undefined): boolean {
  if (!g) return true;
  try {
    const p = JSON.parse(g);
    return !(Array.isArray(p) && p.length > 0);
  } catch {
    return g.trim().length < 5;
  }
}

async function findTwin(target: { id: string; name: string; slug: string }, requireDesigner: boolean, requireGallery: boolean) {
  const allProducts = await prisma.product.findMany({
    where: { id: { not: target.id } },
    select: {
      id: true, name: true, slug: true, designerId: true, designerName: true,
      galleryImages: true,
    },
  });
  const normTarget = normalize(target.name);
  const normSlug = target.slug;
  const candidates = allProducts.filter((p) => {
    const np = normalize(p.name);
    return np === normTarget
      || np.includes(normTarget)
      || normTarget.includes(np)
      || p.slug === normSlug.replace(/-\d+$/, "")
      || normSlug.startsWith(p.slug + "-")
      || p.slug.startsWith(normSlug.split("-")[0]);
  });
  // Filter by requirements + score
  let best: typeof candidates[number] | null = null;
  let bestScore = -1;
  for (const c of candidates) {
    if (requireDesigner && !c.designerId) continue;
    if (requireGallery && isGalleryEmpty(c.galleryImages)) continue;
    // Score: stessa lunghezza nome = preferito
    const np = normalize(c.name);
    const score = (np === normTarget ? 100 : 0)
      + (np.startsWith(normTarget) ? 30 : 0)
      + (normTarget.startsWith(np) ? 30 : 0)
      + (np.length === normTarget.length ? 10 : 0);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "🟢 APPLY" : "🟡 DRY-RUN");

  const sps = await prisma.storeProduct.findMany({
    where: { isPublished: true },
    include: { product: true },
  });

  let designerFixed = 0;
  let galleryFixed = 0;
  let designerNotFound = 0;
  let galleryNotFound = 0;

  for (const sp of sps) {
    const p = sp.product;
    const needsDesigner = !p.designerId;
    const needsGallery = isGalleryEmpty(p.galleryImages);
    if (!needsDesigner && !needsGallery) continue;

    console.log(`\n=== ${p.name} (slug=${p.slug}) ===`);
    console.log(`  designer? ${needsDesigner ? "MANCA" : "ok"}  gallery? ${needsGallery ? "MANCA" : "ok"}`);

    // ─── Step 1: designer via name lookup ───────────────────────────────
    if (needsDesigner && p.designerName && p.designerName.trim() && p.designerName !== "GTV") {
      const d = await prisma.designer.findFirst({
        where: { name: { equals: p.designerName } },
        select: { id: true, name: true },
      });
      if (d) {
        console.log(`  → designer lookup OK: "${d.name}" (id=${d.id})`);
        if (apply) {
          await prisma.product.update({ where: { id: p.id }, data: { designerId: d.id } });
        }
        designerFixed++;
        // p.designerId aggiornato in-memory per il successivo branch
        p.designerId = d.id;
      } else {
        console.log(`  ✗ designer "${p.designerName}" non trovato in tabella Designer`);
      }
    }

    // ─── Step 2: trova twin ────────────────────────────────────────────
    const stillNeedsDesigner = !p.designerId;
    const stillNeedsGallery = isGalleryEmpty(p.galleryImages);
    if (!stillNeedsDesigner && !stillNeedsGallery) continue;

    const twin = await findTwin(
      { id: p.id, name: p.name, slug: p.slug },
      stillNeedsDesigner,
      stillNeedsGallery,
    );
    if (!twin) {
      console.log(`  ✗ Nessun twin trovato per copiare dati`);
      if (stillNeedsDesigner) designerNotFound++;
      if (stillNeedsGallery) galleryNotFound++;
      continue;
    }
    console.log(`  ↪ twin candidato: ${twin.name} (${twin.slug}) · designer=${twin.designerName}`);

    const updates: Record<string, unknown> = {};
    if (stillNeedsDesigner && twin.designerId) {
      updates.designerId = twin.designerId;
      updates.designerName = twin.designerName;
      designerFixed++;
    }
    if (stillNeedsGallery) {
      // Carica anche gli altri campi del twin per copia completa
      const fullTwin = await prisma.product.findUnique({ where: { id: twin.id } });
      if (fullTwin) {
        let copiedFields = 0;
        for (const f of CATALOG_FIELDS) {
          const sourceVal = (fullTwin as Record<string, unknown>)[f];
          const targetVal = (p as Record<string, unknown>)[f];
          const targetEmpty = targetVal === null || targetVal === undefined ||
            (typeof targetVal === "string" && targetVal.trim() === "");
          if (targetEmpty && sourceVal !== null && sourceVal !== undefined && sourceVal !== "") {
            updates[f] = sourceVal;
            copiedFields++;
          }
        }
        if (copiedFields > 0) {
          galleryFixed++;
          console.log(`  → copio ${copiedFields} campi catalogo dal twin`);
        }
      }
    }

    if (apply && Object.keys(updates).length > 0) {
      await prisma.product.update({ where: { id: p.id }, data: updates });
    }
  }

  console.log("\n════════════════════════════════════════════════════");
  console.log(`  Designer fixati:        ${designerFixed}`);
  console.log(`  Gallery/campi catalogo: ${galleryFixed}`);
  console.log(`  Designer non risolti:   ${designerNotFound}`);
  console.log(`  Gallery non risolte:    ${galleryNotFound}`);
  console.log(`  ${apply ? "✓ Scritto" : "⚠ DRY-RUN"}`);
  console.log("════════════════════════════════════════════════════");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
