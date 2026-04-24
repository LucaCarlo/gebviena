import { PrismaClient, StoreAttributeType } from "@prisma/client";

const prisma = new PrismaClient();

// Locale IT source + traduzioni EN/DE/FR.
type AttrSeed = {
  type: StoreAttributeType;
  code: string;
  hexColor?: string;
  labels: { it: string; en: string; de: string; fr: string };
};

const SEED: AttrSeed[] = [
  // ── Materiali ──────────────────────────────────────────────────────────
  { type: "MATERIAL", code: "wood",       labels: { it: "Legno",                  en: "Wood",               de: "Holz",              fr: "Bois" } },
  { type: "MATERIAL", code: "metal",      labels: { it: "Metallo",                en: "Metal",              de: "Metall",            fr: "Métal" } },
  { type: "MATERIAL", code: "synthetic",  labels: { it: "Sintetico",              en: "Synthetic",          de: "Synthetisch",       fr: "Synthétique" } },
  { type: "MATERIAL", code: "leather",    labels: { it: "Pelle",                  en: "Leather",            de: "Leder",             fr: "Cuir" } },
  { type: "MATERIAL", code: "fabric",     labels: { it: "Tessuto",                en: "Fabric",             de: "Stoff",             fr: "Tissu" } },
  { type: "MATERIAL", code: "rattan",     labels: { it: "Rattan",                 en: "Rattan",             de: "Rattan",            fr: "Rotin" } },
  { type: "MATERIAL", code: "vienna_straw", labels: { it: "Paglia di Vienna",     en: "Vienna straw",       de: "Wiener Geflecht",   fr: "Cannage de Vienne" } },
  { type: "MATERIAL", code: "rope",       labels: { it: "Corda",                  en: "Rope",               de: "Seil",              fr: "Corde" } },

  // ── Finiture ──────────────────────────────────────────────────────────
  { type: "FINISH", code: "natural",    labels: { it: "Naturale",              en: "Natural",            de: "Natur",             fr: "Naturel" } },
  { type: "FINISH", code: "lacquered",  labels: { it: "Laccato",               en: "Lacquered",          de: "Lackiert",          fr: "Laqué" } },
  { type: "FINISH", code: "varnished",  labels: { it: "Verniciato",            en: "Varnished",          de: "Gebeizt",           fr: "Verni" } },
  { type: "FINISH", code: "burnished",  labels: { it: "Brunito",               en: "Burnished",          de: "Brüniert",          fr: "Bruni" } },
  { type: "FINISH", code: "chromed",    labels: { it: "Cromato",               en: "Chromed",            de: "Verchromt",         fr: "Chromé" } },
  { type: "FINISH", code: "satin",      labels: { it: "Satinato",              en: "Satin",              de: "Satiniert",         fr: "Satiné" } },
  { type: "FINISH", code: "matte",      labels: { it: "Opaco",                 en: "Matte",              de: "Matt",              fr: "Mat" } },
  { type: "FINISH", code: "glossy",     labels: { it: "Lucido",                en: "Glossy",             de: "Glänzend",          fr: "Brillant" } },

  // ── Colori (con hex) ──────────────────────────────────────────────────
  { type: "COLOR", code: "black",       hexColor: "#1a1a1a", labels: { it: "Nero",                   en: "Black",             de: "Schwarz",           fr: "Noir" } },
  { type: "COLOR", code: "white",       hexColor: "#fafafa", labels: { it: "Bianco",                 en: "White",             de: "Weiß",              fr: "Blanc" } },
  { type: "COLOR", code: "natural",     hexColor: "#d9c6a7", labels: { it: "Naturale",               en: "Natural",           de: "Natur",             fr: "Naturel" } },
  { type: "COLOR", code: "walnut",      hexColor: "#5c3b1e", labels: { it: "Noce",                   en: "Walnut",            de: "Nussbaum",          fr: "Noyer" } },
  { type: "COLOR", code: "oak",         hexColor: "#b08350", labels: { it: "Rovere",                 en: "Oak",               de: "Eiche",             fr: "Chêne" } },
  { type: "COLOR", code: "beech",       hexColor: "#c99a6b", labels: { it: "Faggio",                 en: "Beech",             de: "Buche",             fr: "Hêtre" } },
  { type: "COLOR", code: "red",         hexColor: "#b52a2a", labels: { it: "Rosso",                  en: "Red",               de: "Rot",               fr: "Rouge" } },
  { type: "COLOR", code: "navy_blue",   hexColor: "#1f2b5e", labels: { it: "Blu navy",               en: "Navy blue",         de: "Marineblau",        fr: "Bleu marine" } },
  { type: "COLOR", code: "sage_green",  hexColor: "#7a8c6d", labels: { it: "Verde salvia",           en: "Sage green",        de: "Salbeigrün",        fr: "Vert sauge" } },
  { type: "COLOR", code: "anthracite",  hexColor: "#3a3a3a", labels: { it: "Grigio antracite",       en: "Anthracite grey",   de: "Anthrazit",         fr: "Anthracite" } },
  { type: "COLOR", code: "beige",       hexColor: "#d6c6a8", labels: { it: "Beige",                  en: "Beige",             de: "Beige",             fr: "Beige" } },
];

async function main() {
  let created = 0;
  let updated = 0;
  let translationsSet = 0;

  for (let i = 0; i < SEED.length; i++) {
    const s = SEED[i];

    const existing = await prisma.storeAttributeValue.findUnique({ where: { code: s.code } });
    const value = existing
      ? await prisma.storeAttributeValue.update({
          where: { id: existing.id },
          data: {
            type: s.type,
            hexColor: s.hexColor ?? null,
            sortOrder: i,
            isActive: true,
          },
        })
      : await prisma.storeAttributeValue.create({
          data: {
            type: s.type,
            code: s.code,
            hexColor: s.hexColor ?? null,
            sortOrder: i,
            isActive: true,
          },
        });

    if (existing) updated++;
    else created++;

    // Traduzioni per lingua
    for (const [lang, label] of Object.entries(s.labels)) {
      await prisma.storeAttributeValueTranslation.upsert({
        where: { valueId_languageCode: { valueId: value.id, languageCode: lang } },
        update: { label },
        create: { valueId: value.id, languageCode: lang, label },
      });
      translationsSet++;
    }
  }

  console.log(`✓ StoreAttributeValue: ${created} creati, ${updated} aggiornati. ${translationsSet} traduzioni set.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
