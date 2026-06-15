import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Nomi delle nazioni mostrati all'admin (mapping countryCode → label leggibile).
// Per nazioni nuove importate via admin, il name potrà essere passato nel body.
const COUNTRY_LABELS: Record<string, string> = {
  IT: "Italia",
  FR: "Francia",
  ES: "Spagna",
  DE: "Germania",
  AT: "Austria",
  CH: "Svizzera",
  BE: "Belgio",
  NL: "Paesi Bassi",
  PT: "Portogallo",
  GR: "Grecia",
  UK: "Regno Unito",
  GB: "Regno Unito",
};

// Chiave Setting per il flag "disabled" di un paese.
function disabledKey(countryCode: string): string {
  return `geo.country_${countryCode.toLowerCase()}_disabled`;
}

export async function GET() {
  const result = await requirePermission("store_shipping", "view");
  if (isErrorResponse(result)) return result;

  const [regionCounts, provinceCounts, cityCounts, disabledRows] = await Promise.all([
    prisma.region.groupBy({ by: ["countryCode"], _count: { _all: true } }),
    prisma.province.groupBy({ by: ["countryCode"], _count: { _all: true } }),
    prisma.city.groupBy({ by: ["countryCode"], _count: { _all: true } }),
    prisma.setting.findMany({ where: { key: { startsWith: "geo.country_" } } }),
  ]);

  // Unione delle countryCode da tutte e tre le tabelle.
  const codes = new Set<string>();
  for (const r of regionCounts) codes.add(r.countryCode);
  for (const p of provinceCounts) codes.add(p.countryCode);
  for (const c of cityCounts) codes.add(c.countryCode);

  // Mappa codice → flag disabled (Setting "true"/"false").
  const disabledMap = new Map<string, boolean>();
  for (const r of disabledRows) {
    const m = r.key.match(/^geo\.country_([a-z]+)_disabled$/);
    if (!m) continue;
    disabledMap.set(m[1].toUpperCase(), r.value === "true");
  }

  const data = Array.from(codes).map((code) => ({
    countryCode: code,
    name: COUNTRY_LABELS[code] || code,
    regions: regionCounts.find((r) => r.countryCode === code)?._count?._all || 0,
    provinces: provinceCounts.find((p) => p.countryCode === code)?._count?._all || 0,
    cities: cityCounts.find((c) => c.countryCode === code)?._count?._all || 0,
    disabled: disabledMap.get(code) === true,
  })).sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ success: true, data });
}

// PATCH /api/store/geo/countries → toggle disabled di un paese.
// Body: { countryCode: string, disabled: boolean }
export async function PATCH(req: Request) {
  const result = await requirePermission("store_shipping", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = (await req.json()) as { countryCode?: string; disabled?: boolean };
    const cc = (body.countryCode || "").toUpperCase();
    if (!/^[A-Z]{2,3}$/.test(cc)) {
      return NextResponse.json({ success: false, error: "Codice paese non valido" }, { status: 400 });
    }
    if (typeof body.disabled !== "boolean") {
      return NextResponse.json({ success: false, error: "Flag 'disabled' mancante o non booleano" }, { status: 400 });
    }
    const key = disabledKey(cc);
    const value = body.disabled ? "true" : "false";
    await prisma.setting.upsert({
      where: { key },
      create: { key, value, group: "geo" },
      update: { value, group: "geo" },
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/store/geo/countries?code=XX → cancella TUTTI i dati geografici
// (City → Province → Region) di un paese + i Setting correlati
// (floor_delivery, lead_time, tax_rate_pct, geo.country_disabled) e le
// ShippingRegionRate di quel paese. Operazione DISTRUTTIVA: il chiamante
// ottiene 409 se il paese è ancora referenziato da uno ShippingTariff (per
// evitare di rompere preventivi vivi).
export async function DELETE(req: Request) {
  const result = await requirePermission("store_shipping", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const url = new URL(req.url);
    const cc = (url.searchParams.get("code") || "").toUpperCase();
    if (!/^[A-Z]{2,3}$/.test(cc)) {
      return NextResponse.json({ success: false, error: "Codice paese non valido" }, { status: 400 });
    }

    // Conta i record per riportarli all'utente nel response.
    const [regions, provinces, cities] = await Promise.all([
      prisma.region.count({ where: { countryCode: cc } }),
      prisma.province.count({ where: { countryCode: cc } }),
      prisma.city.count({ where: { countryCode: cc } }),
    ]);

    if (regions === 0 && provinces === 0 && cities === 0) {
      return NextResponse.json({ success: false, error: `Nessun dato geografico per ${cc}` }, { status: 404 });
    }

    // Tutto in transazione per garantire l'atomicità.
    await prisma.$transaction(async (tx) => {
      // ShippingTariff referenzia Region/Province/City con onDelete:Restrict,
      // quindi le ShippingTariff vanno svuotate prima.
      await tx.shippingTariff.deleteMany({
        where: {
          OR: [
            { region: { countryCode: cc } },
            { province: { countryCode: cc } },
            { city: { countryCode: cc } },
          ],
        },
      });
      // City → Province → Region in cascata (City e Province hanno FK con
      // onDelete:Restrict, quindi va fatto in ordine).
      await tx.city.deleteMany({ where: { countryCode: cc } });
      await tx.province.deleteMany({ where: { countryCode: cc } });
      await tx.region.deleteMany({ where: { countryCode: cc } });
      // ShippingRegionRate: gli override tariffari per paese.
      await tx.shippingRegionRate.deleteMany({ where: { countryCode: cc } });
      // Setting collegati al paese (floor_delivery, lead_time, tax_rate_pct,
      // flag disabled).
      await tx.setting.deleteMany({
        where: {
          OR: [
            { key: `shipping.floor_delivery_${cc.toLowerCase()}_per_m3_cents` },
            { key: `shipping.lead_time_${cc.toLowerCase()}` },
            { key: `store.tax_rate_pct_${cc.toLowerCase()}` },
            { key: disabledKey(cc) },
          ],
        },
      });
    });

    return NextResponse.json({ success: true, data: { countryCode: cc, regions, provinces, cities } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
