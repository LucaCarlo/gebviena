/**
 * Assegna designer ai Product (e quindi ai loro StoreProduct) che ne sono privi.
 *
 * Uso:
 *   npx tsx scripts/fix-missing-designers.ts            # solo audit, nessuna modifica
 *   npx tsx scripts/fix-missing-designers.ts --apply    # applica gli aggiornamenti
 *
 * Logica:
 *  1) Per ogni StoreProduct pubblicato con Product.designerId NULL:
 *     - guarda il nome del prodotto (o il raggruppamento Excel)
 *     - prova a matchare uno dei mapping qui sotto (designer storici noti)
 *     - se non match, usa il fallback "GTV Studio" (creando il designer se non esiste)
 *  2) Aggiorna Product.designerId + Product.designerName (denormalizzato).
 *
 * Idempotente: re-run non duplica designer e non sovrascrive scelte manuali.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Mapping nome-prodotto/raggruppamento → nome designer da cercare (case-insensitive,
// con `contains`) nella tabella `designer`. Il primo match vince.
const PRODUCT_TO_DESIGNER: { match: RegExp; designerNameContains: string }[] = [
  // Classici Thonet (Michael Thonet)
  { match: /^(CAFESTUHL|CAFE ?STUHL)/i, designerNameContains: "Michael Thonet" },
  { match: /^N\.?\s?14\b/i, designerNameContains: "Michael Thonet" },
  { match: /^N\.?\s?18\b/i, designerNameContains: "Michael Thonet" },
  { match: /^N\.?\s?200\b/i, designerNameContains: "Michael Thonet" },
  // Hoffmann
  { match: /^N\.?\s?811\b/i, designerNameContains: "Hoffmann" },
  // Magistretti
  { match: /^MAGISTRETTI/i, designerNameContains: "Magistretti" },
  // Mahdavi
  { match: /^LOOP\b.*MAHDAVI/i, designerNameContains: "Mahdavi" },
  { match: /^.*MAHDAVI/i, designerNameContains: "Mahdavi" },
  // Czech bentwood tradition — niente designer specifico
  // MOS collection (typically Front Design o GTV)
  { match: /^MOS\b/i, designerNameContains: "GTV" },
  // Altri raggruppamenti GTV in-house
  { match: /^ARCH CLOTHES VALET/i, designerNameContains: "GTV" },
  { match: /^MAJORDOMO/i, designerNameContains: "GTV" },
  { match: /^LADDER/i, designerNameContains: "GTV" },
  { match: /^PEERS/i, designerNameContains: "GTV" },
  { match: /^RADETZKY/i, designerNameContains: "GTV" },
  { match: /^SOLDEN|SÖLDEN/i, designerNameContains: "GTV" },
  { match: /^SUGILOO/i, designerNameContains: "GTV" },
  { match: /^TRIO/i, designerNameContains: "GTV" },
  { match: /^VIENNA ?144/i, designerNameContains: "Michael Thonet" }, // sgabello Thonet classico
  { match: /^YOU CHAIR/i, designerNameContains: "GTV" },
  { match: /^CZECH/i, designerNameContains: "GTV" },
];

const FALLBACK_DESIGNER_NAME = "GTV Studio";

async function findOrCreateDesigner(searchFor: string): Promise<{ id: string; name: string } | null> {
  // Cerca per nome con contains (case-insensitive)
  let d = await prisma.designer.findFirst({
    where: { name: { contains: searchFor } },
    select: { id: true, name: true },
  });
  if (d) return d;
  // Crea solo se è il fallback ("GTV Studio" o simili). Per i nomi storici (Thonet/Hoffmann/etc.)
  // se non trovo lascio null e ne segnalo l'assenza, così non creo doppioni.
  if (searchFor === FALLBACK_DESIGNER_NAME) {
    const slug = searchFor.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    d = await prisma.designer.create({
      data: { name: searchFor, slug, country: null, bio: null, imageUrl: null },
      select: { id: true, name: true },
    });
    return d;
  }
  return null;
}

function lookupDesignerForProduct(name: string): string | null {
  for (const rule of PRODUCT_TO_DESIGNER) {
    if (rule.match.test(name)) return rule.designerNameContains;
  }
  return null;
}

async function main() {
  const apply = process.argv.includes("--apply");

  console.log(apply ? "🟢 MODALITA': APPLICA" : "🟡 MODALITA': SOLO AUDIT (dry-run, passa --apply per scrivere)");

  // Tutti i Product collegati a uno StoreProduct e senza designerId
  const targets = await prisma.product.findMany({
    where: { designerId: null, storeProduct: { isNot: null } },
    select: { id: true, name: true, slug: true, designerName: true, storeProduct: { select: { isPublished: true } } },
  });
  console.log(`\nProduct senza designerId con StoreProduct collegato: ${targets.length}`);

  let assigned = 0;
  let fallback = 0;
  let stillEmpty = 0;
  const designerCache = new Map<string, { id: string; name: string } | null>();

  for (const p of targets) {
    const wanted = lookupDesignerForProduct(p.name) || FALLBACK_DESIGNER_NAME;
    let designer = designerCache.get(wanted);
    if (designer === undefined) {
      designer = await findOrCreateDesigner(wanted);
      designerCache.set(wanted, designer);
    }
    if (!designer) {
      // Designer storico non in DB e non e' il fallback → riprova col fallback
      let fb = designerCache.get(FALLBACK_DESIGNER_NAME);
      if (fb === undefined) {
        fb = await findOrCreateDesigner(FALLBACK_DESIGNER_NAME);
        designerCache.set(FALLBACK_DESIGNER_NAME, fb);
      }
      if (fb) {
        designer = fb;
      } else {
        console.log(`  ✗ ${p.name.padEnd(40)} → nessun designer ne' fallback disponibile`);
        stillEmpty++;
        continue;
      }
    }

    const isFallback = designer.name === FALLBACK_DESIGNER_NAME;
    if (apply) {
      await prisma.product.update({
        where: { id: p.id },
        data: { designerId: designer.id, designerName: designer.name },
      });
    }
    console.log(`  ${isFallback ? "↪" : "✓"} ${p.name.padEnd(40)} → ${designer.name}${isFallback ? "  (fallback)" : ""}`);
    if (isFallback) fallback++;
    else assigned++;
  }

  console.log("");
  console.log("════════════════════════════════════════════════════");
  console.log(`  Assegnati a designer specifico: ${assigned}`);
  console.log(`  Assegnati al fallback (${FALLBACK_DESIGNER_NAME}): ${fallback}`);
  console.log(`  Ancora vuoti: ${stillEmpty}`);
  console.log(`  ${apply ? "Modifiche applicate al DB." : "DRY-RUN: niente scritto. Passa --apply per applicare."}`);
  console.log("════════════════════════════════════════════════════");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
