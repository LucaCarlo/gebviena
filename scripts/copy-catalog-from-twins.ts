/**
 * Copia campi catalogo (galleryImages, coverImage, description, materials,
 * dimensions, ecc.) dai "twin" del catalogo principale ai Product creati
 * dall'import (-2 / -con-cuscino-* / ecc.) che ne sono privi.
 *
 * Risolve: sulla pagina prodotto store non si vede la galleria catalogo
 * ("Ispirazione" / due immagini a fianco descrizione) perche' il Product -2
 * creato dall'import ha galleryImages = null.
 *
 * Uso:
 *   npx tsx scripts/copy-catalog-from-twins.ts            # dry-run
 *   npx tsx scripts/copy-catalog-from-twins.ts --apply
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Mapping slug del Product creato dall'import → slug del Product gemello.
// Mantieni allineato con copy-designers-from-twins.ts
const TWINS: Record<string, string> = {
  "cafestuhl-2": "cafestuhl",
  "n-14-2": "n-14",
  "n-18-2": "n-18",
  "n-200-2": "n-200",
  "n-811-2": "n-811",
  "solden-2": "solden",
  "mos-bench-senza-cuscino": "mos-bench",
  "mos-bench-con-cuscino-corto": "mos-bench",
  "mos-bench-con-cuscino-lungo": "mos-bench",
  "magistretti-0301": "magistretti-03-01",
  "loop-india-mahdavi": "loop-dining",
};

// Campi da copiare se assenti sul target.
const FIELDS = [
  "galleryImages",
  "galleryOrientations",
  "coverImage",
  "imageUrl",
  "heroImage",
  "sideImage",
  "description",
  "materials",
  "dimensions",
  "dimensionImage",
  "dimensionBlockId",
  "dimensionValues",
  "techSheetUrl",
  "model2dUrl",
  "model3dUrl",
  "year",
  "subcategory",
] as const;

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "🟢 APPLY" : "🟡 DRY-RUN");

  let totalCopied = 0;
  for (const [targetSlug, sourceSlug] of Object.entries(TWINS)) {
    const target = await prisma.product.findUnique({ where: { slug: targetSlug } });
    const source = await prisma.product.findUnique({ where: { slug: sourceSlug } });
    if (!target || !source) {
      console.log(`✗ ${targetSlug}: target o source mancante`);
      continue;
    }
    const updates: Record<string, unknown> = {};
    for (const f of FIELDS) {
      const targetVal = (target as Record<string, unknown>)[f];
      const sourceVal = (source as Record<string, unknown>)[f];
      const targetEmpty =
        targetVal === null
        || targetVal === undefined
        || (typeof targetVal === "string" && targetVal.trim() === "");
      if (targetEmpty && sourceVal !== null && sourceVal !== undefined && sourceVal !== "") {
        updates[f] = sourceVal;
      }
    }
    if (Object.keys(updates).length === 0) {
      console.log(`↪ ${targetSlug.padEnd(35)} nulla da copiare`);
      continue;
    }
    console.log(`✓ ${targetSlug.padEnd(35)} ← ${sourceSlug.padEnd(25)} · ${Object.keys(updates).join(", ")}`);
    if (apply) {
      await prisma.product.update({ where: { id: target.id }, data: updates });
    }
    totalCopied++;
  }

  console.log("");
  console.log("════════════════════════════════════════════════════");
  console.log(`  Product aggiornati: ${totalCopied}`);
  console.log(`  ${apply ? "✓ Scritto" : "⚠ DRY-RUN"}`);
  console.log("════════════════════════════════════════════════════");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
