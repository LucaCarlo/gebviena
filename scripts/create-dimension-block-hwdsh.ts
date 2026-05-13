/**
 * Crea (idempotente) un DimensionBlock con etichette H, W, D, SH, AH, SHH.
 *
 * Significato (mostrato anche nel tooltip della pagina prodotto):
 *   H   = altezza
 *   W   = larghezza
 *   D   = profondità
 *   SH  = altezza seduta (Seat Height)
 *   AH  = altezza bracciolo (Arm Height)
 *   SHH = altezza impilamento (Stacking Height)
 *
 * Uso:
 *   npx tsx scripts/create-dimension-block-hwdsh.ts            # dry-run
 *   npx tsx scripts/create-dimension-block-hwdsh.ts --apply
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const NAME = "Dimensioni complete (H/W/D/SH/AH/SHH)";
const LABELS = ["H", "W", "D", "SH", "AH", "SHH"];

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "🟢 APPLY" : "🟡 DRY-RUN");

  const existing = await prisma.dimensionBlock.findFirst({ where: { name: NAME } });
  if (existing) {
    console.log(`↪ Block già esistente: id=${existing.id} labels=${existing.labels}`);
    if (apply && existing.labels !== JSON.stringify(LABELS)) {
      await prisma.dimensionBlock.update({
        where: { id: existing.id },
        data: { labels: JSON.stringify(LABELS), isActive: true },
      });
      console.log(`  ✓ Aggiornati labels`);
    }
    return;
  }

  if (apply) {
    const created = await prisma.dimensionBlock.create({
      data: {
        name: NAME,
        labels: JSON.stringify(LABELS),
        isActive: true,
        sortOrder: 0,
      },
    });
    console.log(`✓ Creato DimensionBlock: id=${created.id}`);
    console.log(`  name: ${created.name}`);
    console.log(`  labels: ${created.labels}`);
  } else {
    console.log(`Sarebbe creato: name="${NAME}" labels=${JSON.stringify(LABELS)}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
