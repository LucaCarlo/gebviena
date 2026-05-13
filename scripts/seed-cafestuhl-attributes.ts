/**
 * Seed degli attributi di CAFESTUHL secondo la specifica utente.
 *
 *   Struttura:   Legno tinto · Legno laccato · Metallo verniciato
 *   Seduta:      Legno · Imbottita · Paglia di Vienna · Traforata · Cotone cerato macramè
 *   Imbottitura: Chiara · Scura
 *   Inserti:     Paglia di Vienna · Piedini in ottone
 *   Variante:    Gambaletto faggio naturale · Piedini in ottone
 *
 * Logica:
 *  1) Crea (o riusa) gli StoreAttributeValue con type appropriato (STRUCTURE,
 *     SEAT, UPHOLSTERY, INSERT, CONFIGURATION).
 *  2) Per ogni variante CAFESTUHL (SDCAFELGN, SDCAFELTES):
 *     - Assegna TUTTI gli attributi NON differenzianti (Struttura, Imbottitura,
 *       Inserti, Variante) a entrambe le varianti → l'utente li puo' cliccare
 *       ma non cambiano la variante (sono "configurazione su ordine").
 *     - SEAT è DIFFERENZIANTE:
 *         · SDCAFELGN  → SEAT = Legno
 *         · SDCAFELTES → SEAT = Imbottita
 *       Le altre opzioni di SEAT (Paglia, Traforata, Cotone) NON sono assegnate
 *       a una variante specifica: cliccandole il sistema non trova un SKU e
 *       resta sulla variante corrente (configurazione su richiesta).
 *
 * Uso:
 *   npx tsx scripts/seed-cafestuhl-attributes.ts            # dry-run
 *   npx tsx scripts/seed-cafestuhl-attributes.ts --apply
 */
import { PrismaClient, StoreAttributeType } from "@prisma/client";
const prisma = new PrismaClient();

interface AttrSpec {
  type: StoreAttributeType;
  code: string;
  label: string;
  hexColor?: string;
}

// Definizione globale dei valori (saranno creati una volta sola, condivisi).
// I `code` devono essere unique a livello globale: prefisso per tipo.
const STRUCTURE_VALUES: AttrSpec[] = [
  { type: "STRUCTURE", code: "struttura_legno_tinto", label: "Legno tinto" },
  { type: "STRUCTURE", code: "struttura_legno_laccato", label: "Legno laccato" },
  { type: "STRUCTURE", code: "struttura_metallo_verniciato", label: "Metallo verniciato" },
];

const SEAT_VALUES: AttrSpec[] = [
  { type: "SEAT", code: "seduta_legno", label: "Legno" },
  { type: "SEAT", code: "seduta_imbottita", label: "Imbottita" },
  { type: "SEAT", code: "seduta_paglia_vienna", label: "Paglia di Vienna" },
  { type: "SEAT", code: "seduta_traforata", label: "Traforata" },
  { type: "SEAT", code: "seduta_cotone_macrame", label: "Cotone cerato macramè" },
];

const UPHOLSTERY_VALUES: AttrSpec[] = [
  { type: "UPHOLSTERY", code: "imbottitura_chiara", label: "Chiara" },
  { type: "UPHOLSTERY", code: "imbottitura_scura", label: "Scura" },
];

const INSERT_VALUES: AttrSpec[] = [
  { type: "INSERT", code: "inserti_paglia_vienna", label: "Paglia di Vienna" },
  { type: "INSERT", code: "inserti_piedini_ottone", label: "Piedini in ottone" },
];

const CONFIG_VALUES: AttrSpec[] = [
  { type: "CONFIGURATION", code: "variante_gambaletto_faggio", label: "Gambaletto faggio naturale" },
  { type: "CONFIGURATION", code: "variante_piedini_ottone", label: "Piedini in ottone" },
];

const ALL_SHARED_VALUES = [
  ...STRUCTURE_VALUES,
  ...UPHOLSTERY_VALUES,
  ...INSERT_VALUES,
  ...CONFIG_VALUES,
];

// SEAT è speciale: ogni valore è (al massimo) assegnato a UNA variante specifica.
const SEAT_TO_VARIANT_SKU: Record<string, string | null> = {
  seduta_legno: "SDCAFELGN",
  seduta_imbottita: "SDCAFELTES",
  // Le altre 3 NON hanno una variante dedicata: sono opzioni custom.
  seduta_paglia_vienna: null,
  seduta_traforata: null,
  seduta_cotone_macrame: null,
};

async function upsertValue(spec: AttrSpec): Promise<string> {
  const existing = await prisma.storeAttributeValue.findUnique({ where: { code: spec.code } });
  let id: string;
  if (existing) {
    id = existing.id;
  } else {
    const created = await prisma.storeAttributeValue.create({
      data: {
        type: spec.type,
        code: spec.code,
        hexColor: spec.hexColor || null,
        isActive: true,
      },
    });
    id = created.id;
  }
  // Translation IT
  const trExisting = await prisma.storeAttributeValueTranslation.findUnique({
    where: { valueId_languageCode: { valueId: id, languageCode: "it" } },
  });
  if (!trExisting) {
    await prisma.storeAttributeValueTranslation.create({
      data: { valueId: id, languageCode: "it", label: spec.label },
    });
  } else if (trExisting.label !== spec.label) {
    await prisma.storeAttributeValueTranslation.update({
      where: { id: trExisting.id },
      data: { label: spec.label },
    });
  }
  return id;
}

async function assignToVariant(variantId: string, valueId: string): Promise<boolean> {
  const existing = await prisma.storeProductVariantAttribute.findUnique({
    where: { variantId_valueId: { variantId, valueId } },
  });
  if (existing) return false;
  await prisma.storeProductVariantAttribute.create({ data: { variantId, valueId } });
  return true;
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "🟢 APPLY" : "🟡 DRY-RUN (passa --apply per scrivere)");

  // Trova le 2 varianti CAFESTUHL
  const variants = await prisma.storeProductVariant.findMany({
    where: { sku: { in: ["SDCAFELGN", "SDCAFELTES"] } },
    select: { id: true, sku: true },
  });
  const bySku = new Map(variants.map((v) => [v.sku, v.id]));
  if (variants.length !== 2) {
    console.error(`Attese 2 varianti CAFESTUHL, trovate ${variants.length}`);
    process.exit(1);
  }

  console.log("\n=== 1. Upsert StoreAttributeValue ===");
  const valueIdByCode = new Map<string, string>();
  for (const spec of [...ALL_SHARED_VALUES, ...SEAT_VALUES]) {
    if (apply) {
      const id = await upsertValue(spec);
      valueIdByCode.set(spec.code, id);
      console.log(`  ✓ ${spec.type.padEnd(15)} ${spec.label}`);
    } else {
      console.log(`  · ${spec.type.padEnd(15)} ${spec.label} (dry-run)`);
    }
  }

  if (!apply) {
    console.log("\n⚠ DRY-RUN: niente assegnato alle varianti. Re-run con --apply.");
    return;
  }

  console.log("\n=== 2. Assegna attributi SHARED a entrambe le varianti ===");
  let assignedCount = 0;
  for (const spec of ALL_SHARED_VALUES) {
    const vid = valueIdByCode.get(spec.code)!;
    for (const sku of ["SDCAFELGN", "SDCAFELTES"]) {
      const variantId = bySku.get(sku)!;
      const wasNew = await assignToVariant(variantId, vid);
      if (wasNew) assignedCount++;
    }
  }
  console.log(`  ✓ ${assignedCount} assegnazioni nuove (shared)`);

  console.log("\n=== 3. Assegna SEAT differenziante ===");
  let seatAssigned = 0;
  for (const spec of SEAT_VALUES) {
    const targetSku = SEAT_TO_VARIANT_SKU[spec.code];
    if (!targetSku) {
      console.log(`  · ${spec.label.padEnd(28)} → nessuna variante (config su richiesta)`);
      continue;
    }
    const vid = valueIdByCode.get(spec.code)!;
    const variantId = bySku.get(targetSku)!;
    const wasNew = await assignToVariant(variantId, vid);
    if (wasNew) seatAssigned++;
    console.log(`  ${wasNew ? "✓" : "↪"} ${spec.label.padEnd(28)} → ${targetSku}`);
  }
  console.log(`  ✓ ${seatAssigned} assegnazioni SEAT nuove`);

  console.log("\n════════════════════════════════════════════════════");
  console.log(`  Totale attributi: ${ALL_SHARED_VALUES.length + SEAT_VALUES.length}`);
  console.log(`  Varianti CAFESTUHL: 2 (SDCAFELGN, SDCAFELTES)`);
  console.log(`  Shared (cliccabili senza cambio variante): ${ALL_SHARED_VALUES.length}`);
  console.log(`  Seduta (3 opzioni custom + 2 con variante): 5`);
  console.log("════════════════════════════════════════════════════");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
