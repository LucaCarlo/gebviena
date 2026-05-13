/**
 * Rimuove dal catalogo globale tutti i valori attributo NON desiderati dall'utente:
 *
 *   Attributi VOLUTI:
 *     - STRUCTURE (Struttura)
 *     - SEAT (Seduta)
 *     - UPHOLSTERY (Imbottitura)
 *     - INSERT (Inserti)
 *     - CONFIGURATION (Variante)
 *     - COLOR (Colore) — vuoto, l'utente vuole aggiungerli a mano dall'admin
 *
 *   Attributi DA RIMUOVERE:
 *     - MATERIAL (qualsiasi valore)
 *     - FINISH (qualsiasi valore)
 *     - COLOR (i valori pre-esistenti come Nero/Bianco/etc., per ripartire da zero)
 *     - OTHER (qualsiasi valore)
 *
 * Sicurezza:
 *   - Prima si controlla se il valore è usato da qualche variante (StoreProductVariantAttribute).
 *     Se è usato → SKIP (non si elimina, per non rompere prodotti esistenti).
 *   - Per i non usati: si eliminano translation + value.
 *
 * Uso:
 *   npx tsx scripts/cleanup-old-attributes.ts            # dry-run
 *   npx tsx scripts/cleanup-old-attributes.ts --apply
 */
import { PrismaClient, StoreAttributeType } from "@prisma/client";
const prisma = new PrismaClient();

const TYPES_TO_REMOVE: StoreAttributeType[] = ["MATERIAL", "FINISH", "COLOR", "OTHER"];

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "🟢 APPLY" : "🟡 DRY-RUN (passa --apply per scrivere)");

  const values = await prisma.storeAttributeValue.findMany({
    where: { type: { in: TYPES_TO_REMOVE } },
    include: {
      translations: { where: { languageCode: "it" } },
      variantAttrs: { select: { variantId: true } },
    },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  console.log(`\nTrovati ${values.length} valori di tipo ${TYPES_TO_REMOVE.join("/")}`);
  console.log("");

  let deleted = 0;
  let kept = 0;
  const byType: Record<string, { deleted: string[]; kept: string[] }> = {};

  for (const v of values) {
    byType[v.type] = byType[v.type] || { deleted: [], kept: [] };
    const label = v.translations[0]?.label || v.code;
    if (v.variantAttrs.length > 0) {
      console.log(`  ↪ KEEP   ${v.type.padEnd(10)} ${label.padEnd(25)} (usato da ${v.variantAttrs.length} variant${v.variantAttrs.length === 1 ? "e" : "i"})`);
      byType[v.type].kept.push(label);
      kept++;
      continue;
    }
    console.log(`  ✗ REMOVE ${v.type.padEnd(10)} ${label}`);
    byType[v.type].deleted.push(label);
    if (apply) {
      await prisma.storeAttributeValueTranslation.deleteMany({ where: { valueId: v.id } });
      await prisma.storeAttributeValue.delete({ where: { id: v.id } });
    }
    deleted++;
  }

  console.log("");
  console.log("════════════════════════════════════════════════════");
  for (const [type, sets] of Object.entries(byType)) {
    console.log(`  ${type}:  rimossi ${sets.deleted.length}, mantenuti (in uso) ${sets.kept.length}`);
  }
  console.log(`  TOTALE rimossi: ${deleted}`);
  console.log(`  TOTALE tenuti (in uso): ${kept}`);
  console.log(`  ${apply ? "✓ Scritto" : "⚠ DRY-RUN"}`);
  console.log("════════════════════════════════════════════════════");

  // Conta finale
  if (apply) {
    const finalCount = await prisma.storeAttributeValue.count();
    const byTypeFinal = await prisma.storeAttributeValue.groupBy({ by: ["type"], _count: { _all: true } });
    console.log("\nStato finale del catalogo attributi:");
    console.log(`  Totale: ${finalCount} valori`);
    for (const g of byTypeFinal) {
      console.log(`    ${g.type}: ${g._count._all}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
