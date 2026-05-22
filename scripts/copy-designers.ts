/**
 * Per ogni Product creato dal mio import (slug -2 / -con-cuscino-* / ecc.) senza
 * designerId, copia designerId/designerName dal "gemello" gia' presente in catalogo.
 *
 * Mapping deciso manualmente in base all'audit prod del 2026-05-13.
 *
 * Uso:
 *   npx tsx scripts/copy-designers-from-twins.ts           # dry-run
 *   npx tsx scripts/copy-designers-from-twins.ts --apply
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Map: slug del mio Product creato dall'import (target) -> slug del Product
// originale del catalogo da cui copiare designer.
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

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "🟢 APPLY" : "🟡 DRY-RUN (passa --apply per scrivere)");
  console.log("");

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const [targetSlug, sourceSlug] of Object.entries(TWINS)) {
    const target = await prisma.product.findUnique({
      where: { slug: targetSlug },
      select: { id: true, name: true, designerId: true, designerName: true },
    });
    const source = await prisma.product.findUnique({
      where: { slug: sourceSlug },
      select: { id: true, name: true, designerId: true, designerName: true },
    });
    if (!target) {
      console.log(`✗ ${targetSlug.padEnd(35)} → target non trovato`);
      notFound++;
      continue;
    }
    if (!source) {
      console.log(`✗ ${targetSlug.padEnd(35)} → source ${sourceSlug} non trovato`);
      notFound++;
      continue;
    }
    if (!source.designerId) {
      console.log(`✗ ${targetSlug.padEnd(35)} → source ${sourceSlug} non ha designerId`);
      notFound++;
      continue;
    }
    if (target.designerId) {
      console.log(`↪ ${targetSlug.padEnd(35)} ha già designer ${target.designerName} — skip`);
      skipped++;
      continue;
    }
    console.log(`✓ ${targetSlug.padEnd(35)} ← ${sourceSlug.padEnd(25)} · designer = ${source.designerName}`);
    if (apply) {
      await prisma.product.update({
        where: { id: target.id },
        data: { designerId: source.designerId, designerName: source.designerName },
      });
    }
    updated++;
  }

  console.log("");
  console.log("════════════════════════════════════════════════════");
  console.log(`  Aggiornati: ${updated}`);
  console.log(`  Già con designer: ${skipped}`);
  console.log(`  Non trovati/source senza designer: ${notFound}`);
  console.log(`  ${apply ? "✓ Scritto su DB." : "⚠ DRY-RUN: niente scritto."}`);
  console.log("════════════════════════════════════════════════════");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
