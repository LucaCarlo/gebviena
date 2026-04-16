// Seeds EN translations for ContentCategory and ContentTypology labels.
// Run:  node scripts/seed-en-content-taxonomy.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// IT label → EN label (manual translations)
const CATEGORY_EN = {
  "Lampade": "Lamps",
  "Appendiabiti": "Coat Hangers",
  "Bistrot & Restaurant": "Bistrot & Restaurant",
  "campagna": "campaign",
  "Comodini": "Bedside Tables",
  "Divani": "Sofas",
  "Dondoli": "Rocking Chairs",
  "Exhibition": "Exhibition",
  "Hotellerie": "Hotellerie",
  "Mobili contenitori": "Storage Units",
  "News": "News",
  "Panche": "Benches",
  "Paravento": "Room Dividers",
  "Poltrone": "Armchairs",
  "Portaombrelli": "Umbrella Stands",
  "Pouf": "Poufs",
  "Rassegna stampa": "Press Review",
  "Residenziali": "Residential",
  "Scrivanie": "Desks",
  "Sedie": "Chairs",
  "Sedie con braccioli": "Chairs with Armrests",
  "Servomuto": "Valet Stands",
  "Sgabelli": "Stools",
  "Spazi culturali": "Cultural Spaces",
  "Specchi": "Mirrors",
  "Storia": "Story",
  "Tappeti": "Rugs",
  "Tavoli da bar": "Bar Tables",
  "Tavoli da pranzo": "Dining Tables",
  "Tavolini": "Coffee Tables",
  "Testiere": "Headboards",
  "video": "video",
};

const TYPOLOGY_EN = {
  "Complementi": "Complements",
  "I classici": "The Classics",
  "Imbottiti": "Upholstered",
  "Novità 2025": "New 2025",
  "Outdoor": "Outdoor",
  "Sedute": "Seating",
  "Tavoli": "Tables",
};

async function main() {
  let catInserted = 0;
  let catUpdated = 0;
  let typInserted = 0;
  let typUpdated = 0;

  // Categories
  const cats = await prisma.contentCategory.findMany();
  for (const cat of cats) {
    const label = (cat.label || "").trim();
    const enLabel = CATEGORY_EN[label];
    if (!enLabel) {
      console.warn(`[skip] No EN translation for category "${label}"`);
      continue;
    }
    const existing = await prisma.contentCategoryTranslation.findUnique({
      where: { categoryId_languageCode: { categoryId: cat.id, languageCode: "en" } },
    });
    if (existing) {
      if (existing.label !== enLabel) {
        await prisma.contentCategoryTranslation.update({
          where: { id: existing.id },
          data: { label: enLabel },
        });
        catUpdated++;
      }
    } else {
      await prisma.contentCategoryTranslation.create({
        data: { categoryId: cat.id, languageCode: "en", label: enLabel },
      });
      catInserted++;
    }
  }

  // Typologies
  const typs = await prisma.contentTypology.findMany();
  for (const typ of typs) {
    const label = (typ.label || "").trim();
    const enLabel = TYPOLOGY_EN[label];
    if (!enLabel) {
      console.warn(`[skip] No EN translation for typology "${label}"`);
      continue;
    }
    const existing = await prisma.contentTypologyTranslation.findUnique({
      where: { typologyId_languageCode: { typologyId: typ.id, languageCode: "en" } },
    });
    if (existing) {
      if (existing.label !== enLabel) {
        await prisma.contentTypologyTranslation.update({
          where: { id: existing.id },
          data: { label: enLabel },
        });
        typUpdated++;
      }
    } else {
      await prisma.contentTypologyTranslation.create({
        data: { typologyId: typ.id, languageCode: "en", label: enLabel },
      });
      typInserted++;
    }
  }

  console.log(`Categories:   inserted ${catInserted}, updated ${catUpdated}, total processed ${cats.length}`);
  console.log(`Typologies:   inserted ${typInserted}, updated ${typUpdated}, total processed ${typs.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
