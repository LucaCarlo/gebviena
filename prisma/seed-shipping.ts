import { PrismaClient, ShippingService } from "@prisma/client";

const prisma = new PrismaClient();

// Tariffe dell'Excel fornito dal cliente.
// Struttura per ogni riga: prezzi in €/m³ IVA esclusa per [CURBSIDE, FLOOR_1_3, FLOOR_4_10_MAX6].
// Regole di posizionamento:
//   - null/null  → tariffa a livello paese (non usato qui)
//   - region/null → tariffa a livello regione (eredita per tutte le province)
//   - region/province → override per singola provincia

type Tariff = {
  regionCode: string | null;
  provinceCode: string | null;
  prices: [number, number, number]; // €/m³ per CURBSIDE, FLOOR_1_3, FLOOR_4_10_MAX6
  notes?: string;
};

// Helper
const eur = (v: number) => Math.round(v * 100); // €/m³ → centesimi/m³

const TARIFFS: Tariff[] = [
  // ── Lombardia — tariffe per provincia (nessun default regione) ─────────
  { regionCode: "LOM", provinceCode: "MI", prices: [58, 129, 138] },
  { regionCode: "LOM", provinceCode: "CO", prices: [58, 129, 138] },
  { regionCode: "LOM", provinceCode: "MB", prices: [58, 129, 138] },
  { regionCode: "LOM", provinceCode: "LC", prices: [58, 129, 138] },
  { regionCode: "LOM", provinceCode: "VA", prices: [58, 135, 144] },
  { regionCode: "LOM", provinceCode: "BG", prices: [58, 135, 144] },
  { regionCode: "LOM", provinceCode: "CR", prices: [58, 135, 144] },
  { regionCode: "LOM", provinceCode: "PV", prices: [58, 135, 144] },
  { regionCode: "LOM", provinceCode: "SO", prices: [58, 135, 144] },
  { regionCode: "LOM", provinceCode: "LO", prices: [58, 135, 144] },
  { regionCode: "LOM", provinceCode: "MN", prices: [58, 145, 154] },
  { regionCode: "LOM", provinceCode: "BS", prices: [58, 145, 154] },

  // ── Piemonte — default regione + override Torino ───────────────────────
  { regionCode: "PIE", provinceCode: null, prices: [62, 164, 173], notes: "Default regione (resto province)" },
  { regionCode: "PIE", provinceCode: "TO", prices: [62, 151, 160] },

  // ── Veneto — intera regione ────────────────────────────────────────────
  { regionCode: "VEN", provinceCode: null, prices: [65, 167, 175] },

  // ── Emilia-Romagna — default "Emilia" + override province romagnole ────
  { regionCode: "EMR", provinceCode: null, prices: [62, 164, 173], notes: "Default regione (province emiliane)" },
  { regionCode: "EMR", provinceCode: "FC", prices: [62, 170, 178], notes: "Romagna" },
  { regionCode: "EMR", provinceCode: "RA", prices: [62, 170, 178], notes: "Romagna" },
  { regionCode: "EMR", provinceCode: "RN", prices: [62, 170, 178], notes: "Romagna" },

  // ── Trentino-Alto Adige ────────────────────────────────────────────────
  { regionCode: "TAA", provinceCode: null, prices: [68, 174, 183] },

  // ── Toscana ────────────────────────────────────────────────────────────
  { regionCode: "TOS", provinceCode: null, prices: [71, 177, 185] },

  // ── Valle d'Aosta ──────────────────────────────────────────────────────
  { regionCode: "VDA", provinceCode: null, prices: [62, 170, 178] },

  // ── Liguria — default regione + override Genova ────────────────────────
  { regionCode: "LIG", provinceCode: null, prices: [65, 178, 186], notes: "Default regione (resto province)" },
  { regionCode: "LIG", provinceCode: "GE", prices: [65, 174, 183] },

  // ── Lazio — default regione + override Roma ────────────────────────────
  { regionCode: "LAZ", provinceCode: null, prices: [81, 189, 197], notes: "Default regione (resto province)" },
  { regionCode: "LAZ", provinceCode: "RM", prices: [81, 181, 189] },

  // ── Abruzzo ────────────────────────────────────────────────────────────
  { regionCode: "ABR", provinceCode: null, prices: [81, 189, 197] },

  // ── Friuli-Venezia Giulia ──────────────────────────────────────────────
  { regionCode: "FVG", provinceCode: null, prices: [68, 180, 189] },
];

const SERVICES: ShippingService[] = [
  "CURBSIDE",
  "FLOOR_1_3",
  "FLOOR_4_10_MAX6",
];

async function main() {
  // Idempotenza: rimuovo le tariffe IT esistenti inserite da seed (quelle "manuali" dall'admin non vengono toccate
  // finché usi questo seed solo alla prima attivazione; se vuoi re-seedare dopo, valuta un flag `source`).
  const deleted = await prisma.shippingTariff.deleteMany({
    where: { countryCode: "IT" },
  });
  console.log(`Rimosse ${deleted.count} tariffe IT precedenti`);

  let created = 0;
  for (const t of TARIFFS) {
    for (let i = 0; i < SERVICES.length; i++) {
      const service = SERVICES[i];
      const price = t.prices[i];
      await prisma.shippingTariff.create({
        data: {
          countryCode: "IT",
          regionCode: t.regionCode,
          provinceCode: t.provinceCode,
          cityCode: null,
          service,
          pricePerM3Cents: eur(price),
          maxVolumeM3: service === "FLOOR_4_10_MAX6" ? 6 : null,
          isActive: true,
          notes: t.notes ?? null,
        },
      });
      created++;
    }
  }

  console.log(`✓ Seedate ${created} righe tariffarie (${TARIFFS.length} zone × 3 servizi)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
