import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import {
  getDefaultShippingConfig,
  invalidateShippingCache,
  REGION_ORDER,
} from "@/lib/shipping-rates";

export const dynamic = "force-dynamic";

// Le chiavi dei Setting con group='shipping' (devono combaciare con shipping-rates.ts).
const SETTING_KEYS = {
  freeThresholdCents: "shipping.free_threshold_cents",
  itFallbackCents: "shipping.it_fallback_cents",
  frStandardPerM3Cents: "shipping.fr_standard_per_m3_cents",
  frCorsicaPerM3Cents: "shipping.fr_corsica_per_m3_cents",
  floorDeliveryItPerM3Cents: "shipping.floor_delivery_it_per_m3_cents",
  floorDeliveryFrPerM3Cents: "shipping.floor_delivery_fr_per_m3_cents",
  unboxingPerM3Cents: "shipping.unboxing_per_m3_cents",
  rowPerBoxCents: "shipping.row_per_box_cents",
} as const;

type SettingFieldKey = keyof typeof SETTING_KEYS;

interface SettingsPayload {
  freeThresholdCents: number;
  itFallbackCents: number;
  frStandardPerM3Cents: number;
  frCorsicaPerM3Cents: number;
  floorDeliveryItPerM3Cents: number;
  floorDeliveryFrPerM3Cents: number;
  unboxingPerM3Cents: number;
  rowPerBoxCents: number;
}

interface RegionPayload {
  code: string;
  label: string;
  rateCents: number;
}

async function readCurrentSettings(): Promise<SettingsPayload> {
  const defaults = getDefaultShippingConfig();
  const rows = await prisma.setting.findMany({ where: { group: "shipping" } });
  const map = new Map(rows.map((r) => [r.key, r.value] as const));
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
    frCorsicaPerM3Cents:       num(SETTING_KEYS.frCorsicaPerM3Cents,      defaults.frCorsicaPerM3Cents),
    floorDeliveryItPerM3Cents: num(SETTING_KEYS.floorDeliveryItPerM3Cents, defaults.floorDeliveryItPerM3Cents),
    floorDeliveryFrPerM3Cents: num(SETTING_KEYS.floorDeliveryFrPerM3Cents, defaults.floorDeliveryFrPerM3Cents),
    unboxingPerM3Cents:        num(SETTING_KEYS.unboxingPerM3Cents,        defaults.unboxingPerM3Cents),
    rowPerBoxCents:            num(SETTING_KEYS.rowPerBoxCents,            defaults.rowPerBoxCents),
  };
}

async function ensureSeeded(): Promise<void> {
  const defaults = getDefaultShippingConfig();

  // Seed delle 20 regioni se mancanti
  const existingRegions = await prisma.shippingRegionRate.findMany({ select: { code: true } });
  const have = new Set(existingRegions.map((r) => r.code.toUpperCase()));
  const toCreate: { code: string; label: string; rateCents: number; sortOrder: number }[] = [];
  REGION_ORDER.forEach((r, idx) => {
    if (!have.has(r.code.toUpperCase())) {
      toCreate.push({
        code: r.code,
        label: r.label,
        rateCents: defaults.itRegionRates[r.code] ?? 0,
        sortOrder: idx,
      });
    }
  });
  if (toCreate.length > 0) {
    await prisma.shippingRegionRate.createMany({ data: toCreate });
  }

  // Seed dei Setting globali se mancanti
  const settingRows = await prisma.setting.findMany({ where: { group: "shipping" } });
  const haveSet = new Set(settingRows.map((s) => s.key));
  const settingValuesByKey: Record<string, number> = {
    [SETTING_KEYS.freeThresholdCents]: defaults.freeThresholdCents,
    [SETTING_KEYS.itFallbackCents]: defaults.itFallbackCents,
    [SETTING_KEYS.frStandardPerM3Cents]: defaults.frStandardPerM3Cents,
    [SETTING_KEYS.frCorsicaPerM3Cents]: defaults.frCorsicaPerM3Cents,
    [SETTING_KEYS.floorDeliveryItPerM3Cents]: defaults.floorDeliveryItPerM3Cents,
    [SETTING_KEYS.floorDeliveryFrPerM3Cents]: defaults.floorDeliveryFrPerM3Cents,
    [SETTING_KEYS.unboxingPerM3Cents]: defaults.unboxingPerM3Cents,
    [SETTING_KEYS.rowPerBoxCents]: defaults.rowPerBoxCents,
  };
  for (const [key, value] of Object.entries(settingValuesByKey)) {
    if (!haveSet.has(key)) {
      await prisma.setting.create({
        data: { key, value: String(value), group: "shipping" },
      });
    }
  }
}

export async function GET() {
  const result = await requirePermission("store_shipping", "view");
  if (isErrorResponse(result)) return result;

  await ensureSeeded();

  const [settings, regions] = await Promise.all([
    readCurrentSettings(),
    prisma.shippingRegionRate.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      settings,
      regions: regions.map((r) => ({
        code: r.code,
        label: r.label,
        rateCents: r.rateCents,
        sortOrder: r.sortOrder,
      })),
    },
  });
}

export async function PUT(req: Request) {
  const result = await requirePermission("store_shipping", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = (await req.json()) as { settings?: Partial<SettingsPayload>; regions?: RegionPayload[] };

    // Validazione minimale: tutti i valori devono essere interi non negativi.
    const validateInt = (v: unknown): boolean => Number.isFinite(v) && Math.trunc(v as number) === v && (v as number) >= 0;
    const incomingSettings = body.settings || {};
    for (const k of Object.keys(SETTING_KEYS) as SettingFieldKey[]) {
      const v = incomingSettings[k];
      if (v !== undefined && !validateInt(v)) {
        return NextResponse.json({ success: false, error: `Valore non valido per ${k}` }, { status: 400 });
      }
    }
    const incomingRegions = Array.isArray(body.regions) ? body.regions : [];
    for (const r of incomingRegions) {
      if (typeof r.code !== "string" || !r.code.trim()) {
        return NextResponse.json({ success: false, error: "Codice regione mancante" }, { status: 400 });
      }
      if (!validateInt(r.rateCents)) {
        return NextResponse.json({ success: false, error: `Tariffa non valida per ${r.code}` }, { status: 400 });
      }
    }

    // Scrittura atomica: tutto o niente.
    await prisma.$transaction(async (tx) => {
      // Settings: upsert per chiave
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
      // Regioni: upsert per code (label e rate aggiornabili)
      for (const r of incomingRegions) {
        const code = r.code.trim().toUpperCase();
        await tx.shippingRegionRate.upsert({
          where: { code },
          create: {
            code,
            label: (r.label || code).trim(),
            rateCents: Math.trunc(r.rateCents),
            sortOrder: REGION_ORDER.findIndex((x) => x.code === code),
          },
          update: {
            label: (r.label || code).trim(),
            rateCents: Math.trunc(r.rateCents),
          },
        });
      }
    });

    // Invalida la cache della lib così il prossimo quote vede i valori nuovi.
    invalidateShippingCache();

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
