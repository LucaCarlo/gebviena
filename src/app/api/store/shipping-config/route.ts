import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import {
  getDefaultShippingConfig,
  invalidateShippingCache,
  REGION_ORDER,
  FR_REGION_ORDER,
} from "@/lib/shipping-rates";

export const dynamic = "force-dynamic";

const SETTING_KEYS = {
  freeThresholdCents: "shipping.free_threshold_cents",
  itFallbackCents: "shipping.it_fallback_cents",
  frStandardPerM3Cents: "shipping.fr_standard_per_m3_cents",
  unboxingPerM3Cents: "shipping.unboxing_per_m3_cents",
  rowPerBoxCents: "shipping.row_per_box_cents",
} as const;

type SettingFieldKey = keyof typeof SETTING_KEYS;

// Chiave dinamica per la consegna al piano per-paese.
function floorDeliveryKey(countryCode: string): string {
  return `shipping.floor_delivery_${countryCode.toLowerCase()}_per_m3_cents`;
}

// Chiave dinamica per il tempo di consegna fallback per-paese.
function leadTimeKey(countryCode: string): string {
  return `shipping.lead_time_${countryCode.toLowerCase()}`;
}

interface SettingsPayload {
  freeThresholdCents: number;
  itFallbackCents: number;
  frStandardPerM3Cents: number;
  unboxingPerM3Cents: number;
  rowPerBoxCents: number;
}

interface RegionPayload {
  code: string;
  label: string;
  rateCents: number | null;
  leadTime?: string | null;
}

async function readCurrentSettings(): Promise<SettingsPayload> {
  const defaults = getDefaultShippingConfig();
  const rows = await prisma.setting.findMany({ where: { group: "shipping" } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const num = (k: string, fallback: number): number => {
    const v = map.get(k);
    if (v === undefined) return fallback;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    freeThresholdCents:        num(SETTING_KEYS.freeThresholdCents,        defaults.freeThresholdCents),
    itFallbackCents:           num(SETTING_KEYS.itFallbackCents,           defaults.itFallbackCents),
    frStandardPerM3Cents:      num(SETTING_KEYS.frStandardPerM3Cents,      defaults.frStandardPerM3Cents),
    unboxingPerM3Cents:        num(SETTING_KEYS.unboxingPerM3Cents,        defaults.unboxingPerM3Cents),
    rowPerBoxCents:            num(SETTING_KEYS.rowPerBoxCents,            defaults.rowPerBoxCents),
  };
}

async function ensureSeeded(): Promise<void> {
  const defaults = getDefaultShippingConfig();

  // Seed IT regions con i valori storici (rateCents valorizzato)
  const existingIt = await prisma.shippingRegionRate.findMany({
    where: { countryCode: "IT" },
    select: { code: true },
  });
  const haveIt = new Set(existingIt.map((r) => r.code.toUpperCase()));
  const itToCreate: { code: string; label: string; countryCode: string; rateCents: number; sortOrder: number }[] = [];
  REGION_ORDER.forEach((r, idx) => {
    if (!haveIt.has(r.code.toUpperCase())) {
      itToCreate.push({
        code: r.code,
        label: r.label,
        countryCode: "IT",
        rateCents: defaults.itRegionRates[r.code] ?? 0,
        sortOrder: idx,
      });
    }
  });
  if (itToCreate.length > 0) await prisma.shippingRegionRate.createMany({ data: itToCreate });

  // Seed FR régions con rateCents=null (= usa fallback del paese)
  const existingFr = await prisma.shippingRegionRate.findMany({
    where: { countryCode: "FR" },
    select: { code: true },
  });
  const haveFr = new Set(existingFr.map((r) => r.code.toUpperCase()));
  const frToCreate: { code: string; label: string; countryCode: string; rateCents: number | null; sortOrder: number }[] = [];
  FR_REGION_ORDER.forEach((r, idx) => {
    if (!haveFr.has(r.code.toUpperCase())) {
      frToCreate.push({
        code: r.code,
        label: r.label,
        countryCode: "FR",
        // Corse parte con override esplicito 300€/m³. Le altre régions con null
        // (= usano il default Francia continentale).
        rateCents: r.code === "94" ? 30000 : null,
        sortOrder: idx,
      });
    }
  });
  if (frToCreate.length > 0) await prisma.shippingRegionRate.createMany({ data: frToCreate });

  // Seed dei Setting globali se mancanti
  const settingRows = await prisma.setting.findMany({ where: { group: "shipping" } });
  const haveSet = new Set(settingRows.map((s) => s.key));
  const settingValuesByKey: Record<string, number> = {
    [SETTING_KEYS.freeThresholdCents]: defaults.freeThresholdCents,
    [SETTING_KEYS.itFallbackCents]: defaults.itFallbackCents,
    [SETTING_KEYS.frStandardPerM3Cents]: defaults.frStandardPerM3Cents,
    [SETTING_KEYS.unboxingPerM3Cents]: defaults.unboxingPerM3Cents,
    [SETTING_KEYS.rowPerBoxCents]: defaults.rowPerBoxCents,
    // Consegna al piano: seed con i default per IT, FR, ROW
    [floorDeliveryKey("IT")]: defaults.floorDeliveryByCountry.IT,
    [floorDeliveryKey("FR")]: defaults.floorDeliveryByCountry.FR,
    [floorDeliveryKey("ROW")]: defaults.floorDeliveryByCountry.ROW,
  };
  for (const [key, value] of Object.entries(settingValuesByKey)) {
    if (!haveSet.has(key)) {
      await prisma.setting.create({ data: { key, value: String(value), group: "shipping" } });
    }
  }
  // Seed dei tempi di consegna per paese (testo libero) se mancanti
  const leadTimeDefaults: Record<string, string> = {
    [leadTimeKey("IT")]: defaults.leadTimeByCountry.IT || "6 settimane",
    [leadTimeKey("FR")]: defaults.leadTimeByCountry.FR || "6 semaines",
    [leadTimeKey("ROW")]: defaults.leadTimeByCountry.ROW || "8-10 settimane",
  };
  for (const [key, value] of Object.entries(leadTimeDefaults)) {
    if (!haveSet.has(key)) {
      await prisma.setting.create({ data: { key, value, group: "shipping" } });
    }
  }
}

export async function GET() {
  const result = await requirePermission("store_shipping", "view");
  if (isErrorResponse(result)) return result;

  await ensureSeeded();

  const [settings, allRegions, floorRows, leadRows] = await Promise.all([
    readCurrentSettings(),
    prisma.shippingRegionRate.findMany({ orderBy: [{ countryCode: "asc" }, { sortOrder: "asc" }] }),
    prisma.setting.findMany({ where: { group: "shipping", key: { startsWith: "shipping.floor_delivery_" } } }),
    prisma.setting.findMany({ where: { group: "shipping", key: { startsWith: "shipping.lead_time_" } } }),
  ]);
  const regionsByCountry: Record<string, { code: string; label: string; rateCents: number | null; sortOrder: number; leadTime: string | null }[]> = { IT: [], FR: [] };
  for (const r of allRegions) {
    if (!regionsByCountry[r.countryCode]) regionsByCountry[r.countryCode] = [];
    regionsByCountry[r.countryCode].push({
      code: r.code,
      label: r.label,
      rateCents: r.rateCents,
      sortOrder: r.sortOrder,
      leadTime: r.leadTime || null,
    });
  }
  // Costruisci floorDeliveryByCountry leggendo le chiavi dinamiche
  const floorDeliveryByCountry: Record<string, number> = {};
  for (const r of floorRows) {
    const m = r.key.match(/^shipping\.floor_delivery_([a-z]+)_per_m3_cents$/);
    if (!m) continue;
    const cc = m[1].toUpperCase();
    const v = parseInt(r.value, 10);
    if (Number.isFinite(v)) floorDeliveryByCountry[cc] = v;
  }
  // Costruisci leadTimeByCountry leggendo le chiavi dinamiche
  const leadTimeByCountry: Record<string, string> = {};
  for (const r of leadRows) {
    const m = r.key.match(/^shipping\.lead_time_([a-z]+)$/);
    if (!m) continue;
    const cc = m[1].toUpperCase();
    if (r.value && r.value.trim()) leadTimeByCountry[cc] = r.value.trim();
  }

  return NextResponse.json({
    success: true,
    data: { settings, regionsByCountry, floorDeliveryByCountry, leadTimeByCountry },
  });
}

export async function PUT(req: Request) {
  const result = await requirePermission("store_shipping", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = (await req.json()) as {
      settings?: Partial<SettingsPayload>;
      regionsByCountry?: Record<string, RegionPayload[]>;
      floorDeliveryByCountry?: Record<string, number>;
      leadTimeByCountry?: Record<string, string>;
    };

    const validateInt = (v: unknown): boolean =>
      Number.isFinite(v) && Math.trunc(v as number) === v && (v as number) >= 0;

    // Validazione settings
    const incomingSettings = body.settings || {};
    for (const k of Object.keys(SETTING_KEYS) as SettingFieldKey[]) {
      const v = incomingSettings[k];
      if (v !== undefined && !validateInt(v)) {
        return NextResponse.json({ success: false, error: `Valore non valido per ${k}` }, { status: 400 });
      }
    }

    // Validazione regions
    const incomingRegions = body.regionsByCountry || {};
    for (const [country, list] of Object.entries(incomingRegions)) {
      if (!/^[A-Z]{2}$/.test(country)) {
        return NextResponse.json({ success: false, error: `Codice paese non valido: ${country}` }, { status: 400 });
      }
      if (!Array.isArray(list)) {
        return NextResponse.json({ success: false, error: `Regions per ${country} deve essere array` }, { status: 400 });
      }
      for (const r of list) {
        if (typeof r.code !== "string" || !r.code.trim()) {
          return NextResponse.json({ success: false, error: `Codice regione mancante (${country})` }, { status: 400 });
        }
        if (r.rateCents !== null && !validateInt(r.rateCents)) {
          return NextResponse.json({ success: false, error: `Tariffa non valida per ${country}/${r.code}` }, { status: 400 });
        }
      }
    }

    // Validazione floorDeliveryByCountry
    const incomingFloor = body.floorDeliveryByCountry || {};
    for (const [cc, v] of Object.entries(incomingFloor)) {
      if (!/^[A-Z]{2,3}$/.test(cc)) {
        return NextResponse.json({ success: false, error: `Codice paese non valido per consegna al piano: ${cc}` }, { status: 400 });
      }
      if (!validateInt(v)) {
        return NextResponse.json({ success: false, error: `Tariffa consegna al piano non valida per ${cc}` }, { status: 400 });
      }
    }

    // Validazione leadTimeByCountry (testo libero, max 64 char)
    const incomingLead = body.leadTimeByCountry || {};
    for (const [cc, v] of Object.entries(incomingLead)) {
      if (!/^[A-Z]{2,3}$/.test(cc)) {
        return NextResponse.json({ success: false, error: `Codice paese non valido per tempo di consegna: ${cc}` }, { status: 400 });
      }
      if (typeof v !== "string" || v.length > 64) {
        return NextResponse.json({ success: false, error: `Tempo di consegna non valido per ${cc}` }, { status: 400 });
      }
    }

    // Scrittura atomica
    await prisma.$transaction(async (tx) => {
      for (const k of Object.keys(SETTING_KEYS) as SettingFieldKey[]) {
        const v = incomingSettings[k];
        if (v === undefined) continue;
        const key = SETTING_KEYS[k];
        await tx.setting.upsert({
          where: { key },
          create: { key, value: String(v), group: "shipping" },
          update: { value: String(v), group: "shipping" },
        });
      }
      // Consegna al piano per paese (chiavi dinamiche)
      for (const [cc, v] of Object.entries(incomingFloor)) {
        const key = floorDeliveryKey(cc);
        await tx.setting.upsert({
          where: { key },
          create: { key, value: String(Math.trunc(v)), group: "shipping" },
          update: { value: String(Math.trunc(v)), group: "shipping" },
        });
      }
      // Tempi di consegna fallback per paese (chiavi dinamiche)
      for (const [cc, v] of Object.entries(incomingLead)) {
        const key = leadTimeKey(cc);
        const value = (v || "").trim();
        await tx.setting.upsert({
          where: { key },
          create: { key, value, group: "shipping" },
          update: { value, group: "shipping" },
        });
      }
      // Region rates per ogni paese
      for (const [country, list] of Object.entries(incomingRegions)) {
        for (const r of list) {
          const code = r.code.trim().toUpperCase();
          const leadTimeVal = r.leadTime == null ? null : String(r.leadTime).trim().slice(0, 64) || null;
          await tx.shippingRegionRate.upsert({
            where: { countryCode_code: { countryCode: country, code } },
            create: {
              code,
              countryCode: country,
              label: (r.label || code).trim(),
              rateCents: r.rateCents === null ? null : Math.trunc(r.rateCents),
              sortOrder: 0,
              leadTime: leadTimeVal,
            },
            update: {
              label: (r.label || code).trim(),
              rateCents: r.rateCents === null ? null : Math.trunc(r.rateCents),
              leadTime: leadTimeVal,
            },
          });
        }
      }
    });

    invalidateShippingCache();
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
