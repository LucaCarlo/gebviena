import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PRODUCT_TYPOLOGIES = [
  { value: "CLASSICI", label: "i Classici", sortOrder: 1 },
  { value: "NOVITA", label: "Novità 2025", sortOrder: 2 },
  { value: "SEDUTE", label: "Sedute", sortOrder: 3 },
  { value: "IMBOTTITI", label: "Imbottiti", sortOrder: 4 },
  { value: "COMPLEMENTI", label: "Complementi", sortOrder: 5 },
  { value: "TAVOLI", label: "Tavoli", sortOrder: 6 },
  { value: "OUTDOOR", label: "Outdoor", sortOrder: 7 },
];

const PRODUCT_CATEGORIES = [
  { value: "Sedie", label: "Sedie", sortOrder: 1 },
  { value: "Sedie con braccioli", label: "Sedie con braccioli", sortOrder: 2 },
  { value: "Poltrone", label: "Poltrone", sortOrder: 3 },
  { value: "Divani", label: "Divani", sortOrder: 4 },
  { value: "Sgabelli", label: "Sgabelli", sortOrder: 5 },
  { value: "Tavoli da bar", label: "Tavoli da bar", sortOrder: 6 },
  { value: "Tavolini", label: "Tavolini", sortOrder: 7 },
  { value: "Mobili contenitori", label: "Mobili contenitori", sortOrder: 8 },
  { value: "Appendiabiti", label: "Appendiabiti", sortOrder: 9 },
  { value: "Tavoli da pranzo", label: "Tavoli da pranzo", sortOrder: 10 },
  { value: "Testiere", label: "Testiere", sortOrder: 11 },
  { value: "Comodini", label: "Comodini", sortOrder: 12 },
  { value: "Dondoli", label: "Dondoli", sortOrder: 13 },
  { value: "Lampade", label: "Lampade", sortOrder: 14 },
  { value: "Panche", label: "Panche", sortOrder: 15 },
  { value: "Scrivanie", label: "Scrivanie", sortOrder: 16 },
  { value: "Servomuto", label: "Servomuto", sortOrder: 17 },
  { value: "Paravento", label: "Paravento", sortOrder: 18 },
  { value: "Portaombrelli", label: "Portaombrelli", sortOrder: 19 },
  { value: "Pouf", label: "Pouf", sortOrder: 20 },
  { value: "Specchi", label: "Specchi", sortOrder: 21 },
  { value: "Tappeti", label: "Tappeti", sortOrder: 22 },
];

// Mapping: which categories belong to which typologies
const TYPOLOGY_CATEGORIES: Record<string, string[]> = {
  CLASSICI: ["Sedie", "Sgabelli", "Sedie con braccioli", "Appendiabiti", "Dondoli", "Tavoli da pranzo"],
  NOVITA: ["Divani", "Scrivanie", "Sedie", "Sedie con braccioli"],
  SEDUTE: ["Sedie", "Sedie con braccioli", "Sgabelli", "Dondoli", "Panche"],
  IMBOTTITI: ["Poltrone", "Divani", "Pouf"],
  COMPLEMENTI: ["Mobili contenitori", "Appendiabiti", "Testiere", "Lampade", "Servomuto", "Paravento", "Portaombrelli", "Specchi", "Tappeti"],
  TAVOLI: ["Tavoli da bar", "Tavolini", "Tavoli da pranzo", "Comodini", "Scrivanie"],
  OUTDOOR: ["Sedie", "Tavoli da bar"],
};

const NEWS_CATEGORIES = [
  { value: "exhibition", label: "Exhibition", sortOrder: 1 },
  { value: "news", label: "News", sortOrder: 2 },
  { value: "rassegna-stampa", label: "Rassegna stampa", sortOrder: 3 },
  { value: "storia", label: "Storia", sortOrder: 4 },
];

const PROJECT_TYPOLOGIES = [
  { value: "BISTROT_RESTAURANT", label: "Bistrot & Restaurant", sortOrder: 1 },
  { value: "HOTELLERIE", label: "Hotellerie", sortOrder: 2 },
  { value: "RESIDENZIALE", label: "Residenziale", sortOrder: 3 },
  { value: "SPAZI_CULTURALI", label: "Spazi culturali", sortOrder: 4 },
];

async function main() {
  console.log("Seeding content taxonomy...");

  // Always upsert news categories (re-runnable)
  for (const c of NEWS_CATEGORIES) {
    await prisma.contentCategory.upsert({
      where: { contentType_value: { contentType: "news", value: c.value } },
      update: { label: c.label, sortOrder: c.sortOrder },
      create: { contentType: "news", ...c },
    });
  }
  console.log(`Upserted ${NEWS_CATEGORIES.length} news categories`);

  // Check if already seeded
  const existing = await prisma.contentTypology.count();
  if (existing > 0) {
    console.log("Taxonomy already seeded, skipping rest.");
    return;
  }

  // Seed product typologies
  for (const t of PRODUCT_TYPOLOGIES) {
    await prisma.contentTypology.create({
      data: { contentType: "products", ...t },
    });
  }
  console.log(`Created ${PRODUCT_TYPOLOGIES.length} product typologies`);

  // Seed product categories
  for (const c of PRODUCT_CATEGORIES) {
    await prisma.contentCategory.create({
      data: { contentType: "products", ...c },
    });
  }
  console.log(`Created ${PRODUCT_CATEGORIES.length} product categories`);

  // Create typology-category relationships
  let relCount = 0;
  for (const [typValue, catValues] of Object.entries(TYPOLOGY_CATEGORIES)) {
    const typology = await prisma.contentTypology.findUnique({
      where: { contentType_value: { contentType: "products", value: typValue } },
    });
    if (!typology) continue;

    for (const catValue of catValues) {
      const category = await prisma.contentCategory.findUnique({
        where: { contentType_value: { contentType: "products", value: catValue } },
      });
      if (!category) continue;

      await prisma.contentTypologyCategory.create({
        data: { typologyId: typology.id, categoryId: category.id },
      });
      relCount++;
    }
  }
  console.log(`Created ${relCount} typology-category relationships`);

  // Seed project typologies
  for (const t of PROJECT_TYPOLOGIES) {
    await prisma.contentTypology.create({
      data: { contentType: "projects", ...t },
    });
  }
  console.log(`Created ${PROJECT_TYPOLOGIES.length} project typologies`);

  console.log("Taxonomy seeding complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
