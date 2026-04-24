import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type RegionSeed = {
  code: string;
  name: string;
  sortOrder: number;
  provinces: { code: string; name: string }[];
};

const REGIONS: RegionSeed[] = [
  {
    code: "PIE", name: "Piemonte", sortOrder: 1,
    provinces: [
      { code: "TO", name: "Torino" },
      { code: "AL", name: "Alessandria" },
      { code: "AT", name: "Asti" },
      { code: "BI", name: "Biella" },
      { code: "CN", name: "Cuneo" },
      { code: "NO", name: "Novara" },
      { code: "VB", name: "Verbano-Cusio-Ossola" },
      { code: "VC", name: "Vercelli" },
    ],
  },
  {
    code: "VDA", name: "Valle d'Aosta", sortOrder: 2,
    provinces: [{ code: "AO", name: "Aosta" }],
  },
  {
    code: "LOM", name: "Lombardia", sortOrder: 3,
    provinces: [
      { code: "MI", name: "Milano" },
      { code: "BG", name: "Bergamo" },
      { code: "BS", name: "Brescia" },
      { code: "CO", name: "Como" },
      { code: "CR", name: "Cremona" },
      { code: "LC", name: "Lecco" },
      { code: "LO", name: "Lodi" },
      { code: "MN", name: "Mantova" },
      { code: "MB", name: "Monza e Brianza" },
      { code: "PV", name: "Pavia" },
      { code: "SO", name: "Sondrio" },
      { code: "VA", name: "Varese" },
    ],
  },
  {
    code: "TAA", name: "Trentino-Alto Adige", sortOrder: 4,
    provinces: [
      { code: "BZ", name: "Bolzano" },
      { code: "TN", name: "Trento" },
    ],
  },
  {
    code: "VEN", name: "Veneto", sortOrder: 5,
    provinces: [
      { code: "VE", name: "Venezia" },
      { code: "BL", name: "Belluno" },
      { code: "PD", name: "Padova" },
      { code: "RO", name: "Rovigo" },
      { code: "TV", name: "Treviso" },
      { code: "VI", name: "Vicenza" },
      { code: "VR", name: "Verona" },
    ],
  },
  {
    code: "FVG", name: "Friuli-Venezia Giulia", sortOrder: 6,
    provinces: [
      { code: "TS", name: "Trieste" },
      { code: "GO", name: "Gorizia" },
      { code: "PN", name: "Pordenone" },
      { code: "UD", name: "Udine" },
    ],
  },
  {
    code: "LIG", name: "Liguria", sortOrder: 7,
    provinces: [
      { code: "GE", name: "Genova" },
      { code: "IM", name: "Imperia" },
      { code: "SP", name: "La Spezia" },
      { code: "SV", name: "Savona" },
    ],
  },
  {
    code: "EMR", name: "Emilia-Romagna", sortOrder: 8,
    provinces: [
      { code: "BO", name: "Bologna" },
      { code: "FE", name: "Ferrara" },
      { code: "FC", name: "Forlì-Cesena" },
      { code: "MO", name: "Modena" },
      { code: "PR", name: "Parma" },
      { code: "PC", name: "Piacenza" },
      { code: "RA", name: "Ravenna" },
      { code: "RE", name: "Reggio Emilia" },
      { code: "RN", name: "Rimini" },
    ],
  },
  {
    code: "TOS", name: "Toscana", sortOrder: 9,
    provinces: [
      { code: "FI", name: "Firenze" },
      { code: "AR", name: "Arezzo" },
      { code: "GR", name: "Grosseto" },
      { code: "LI", name: "Livorno" },
      { code: "LU", name: "Lucca" },
      { code: "MS", name: "Massa-Carrara" },
      { code: "PI", name: "Pisa" },
      { code: "PT", name: "Pistoia" },
      { code: "PO", name: "Prato" },
      { code: "SI", name: "Siena" },
    ],
  },
  {
    code: "UMB", name: "Umbria", sortOrder: 10,
    provinces: [
      { code: "PG", name: "Perugia" },
      { code: "TR", name: "Terni" },
    ],
  },
  {
    code: "MAR", name: "Marche", sortOrder: 11,
    provinces: [
      { code: "AN", name: "Ancona" },
      { code: "AP", name: "Ascoli Piceno" },
      { code: "FM", name: "Fermo" },
      { code: "MC", name: "Macerata" },
      { code: "PU", name: "Pesaro e Urbino" },
    ],
  },
  {
    code: "LAZ", name: "Lazio", sortOrder: 12,
    provinces: [
      { code: "RM", name: "Roma" },
      { code: "FR", name: "Frosinone" },
      { code: "LT", name: "Latina" },
      { code: "RI", name: "Rieti" },
      { code: "VT", name: "Viterbo" },
    ],
  },
  {
    code: "ABR", name: "Abruzzo", sortOrder: 13,
    provinces: [
      { code: "AQ", name: "L'Aquila" },
      { code: "CH", name: "Chieti" },
      { code: "PE", name: "Pescara" },
      { code: "TE", name: "Teramo" },
    ],
  },
  {
    code: "MOL", name: "Molise", sortOrder: 14,
    provinces: [
      { code: "CB", name: "Campobasso" },
      { code: "IS", name: "Isernia" },
    ],
  },
  {
    code: "CAM", name: "Campania", sortOrder: 15,
    provinces: [
      { code: "NA", name: "Napoli" },
      { code: "AV", name: "Avellino" },
      { code: "BN", name: "Benevento" },
      { code: "CE", name: "Caserta" },
      { code: "SA", name: "Salerno" },
    ],
  },
  {
    code: "PUG", name: "Puglia", sortOrder: 16,
    provinces: [
      { code: "BA", name: "Bari" },
      { code: "BR", name: "Brindisi" },
      { code: "BT", name: "Barletta-Andria-Trani" },
      { code: "FG", name: "Foggia" },
      { code: "LE", name: "Lecce" },
      { code: "TA", name: "Taranto" },
    ],
  },
  {
    code: "BAS", name: "Basilicata", sortOrder: 17,
    provinces: [
      { code: "PZ", name: "Potenza" },
      { code: "MT", name: "Matera" },
    ],
  },
  {
    code: "CAL", name: "Calabria", sortOrder: 18,
    provinces: [
      { code: "CZ", name: "Catanzaro" },
      { code: "CS", name: "Cosenza" },
      { code: "KR", name: "Crotone" },
      { code: "RC", name: "Reggio Calabria" },
      { code: "VV", name: "Vibo Valentia" },
    ],
  },
  {
    code: "SIC", name: "Sicilia", sortOrder: 19,
    provinces: [
      { code: "PA", name: "Palermo" },
      { code: "AG", name: "Agrigento" },
      { code: "CL", name: "Caltanissetta" },
      { code: "CT", name: "Catania" },
      { code: "EN", name: "Enna" },
      { code: "ME", name: "Messina" },
      { code: "RG", name: "Ragusa" },
      { code: "SR", name: "Siracusa" },
      { code: "TP", name: "Trapani" },
    ],
  },
  {
    code: "SAR", name: "Sardegna", sortOrder: 20,
    provinces: [
      { code: "CA", name: "Cagliari" },
      { code: "NU", name: "Nuoro" },
      { code: "OR", name: "Oristano" },
      { code: "SS", name: "Sassari" },
    ],
  },
];

async function main() {
  let regionCount = 0;
  let provinceCount = 0;

  for (const region of REGIONS) {
    await prisma.region.upsert({
      where: { code: region.code },
      update: { name: region.name, sortOrder: region.sortOrder },
      create: { code: region.code, name: region.name, sortOrder: region.sortOrder },
    });
    regionCount++;

    for (let i = 0; i < region.provinces.length; i++) {
      const p = region.provinces[i];
      await prisma.province.upsert({
        where: { code: p.code },
        update: { name: p.name, regionCode: region.code, sortOrder: i },
        create: { code: p.code, name: p.name, regionCode: region.code, sortOrder: i },
      });
      provinceCount++;
    }
  }

  console.log(`✓ Seeded ${regionCount} regioni, ${provinceCount} province`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
