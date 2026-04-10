/**
 * One-time migration: parse legacy Product.pconUrl values and populate
 * the structured pconMoc/pconBan/pconSid/pconOvc columns.
 *
 * Leaves pconUrl untouched as a safety net. Idempotent: re-running on
 * a product that already has pconBan populated will skip it.
 *
 * Run with: npx tsx scripts/backfill-pcon-fields.ts
 */

import { PrismaClient } from "@prisma/client";
import { parsePconUrl } from "../src/lib/pcon";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { pconUrl: { not: null } },
    select: {
      id: true,
      slug: true,
      name: true,
      pconUrl: true,
      pconMoc: true,
      pconBan: true,
      pconSid: true,
      pconOvc: true,
    },
  });

  console.log(`Found ${products.length} product(s) with pconUrl set.\n`);

  let updated = 0;
  let skipped = 0;

  for (const p of products) {
    if (p.pconBan) {
      console.log(`- skip ${p.slug} (already has pconBan=${p.pconBan})`);
      skipped++;
      continue;
    }
    if (!p.pconUrl) {
      skipped++;
      continue;
    }
    const parsed = parsePconUrl(p.pconUrl);
    if (!parsed.ban) {
      console.log(`! ${p.slug}: could not parse ban from URL`);
      skipped++;
      continue;
    }
    await prisma.product.update({
      where: { id: p.id },
      data: {
        pconMoc: parsed.moc || null,
        pconBan: parsed.ban || null,
        pconSid: parsed.sid || null,
        pconOvc: parsed.ovc || null,
      },
    });
    console.log(
      `✓ ${p.slug}  moc=${parsed.moc ?? "-"}  ban=${parsed.ban}  sid=${parsed.sid ?? "-"}  ovc=${parsed.ovc ? parsed.ovc.slice(0, 40) + (parsed.ovc.length > 40 ? "…" : "") : "-"}`,
    );
    updated++;
  }

  console.log(`\nBackfill complete. Updated: ${updated}. Skipped: ${skipped}.`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
