import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { ShippingService } from "@prisma/client";

const VALID_SERVICES: ShippingService[] = ["CURBSIDE", "FLOOR_1_3", "FLOOR_4_10_MAX6"];

type TariffBatch = {
  countryCode?: string;
  regionCode: string | null;
  provinceCode: string | null;
  cityCode?: string | null;
  cityName?: string | null;       // se cityCode non esiste, creiamo la città su provinceCode con questo nome
  service: ShippingService;
  pricePerM3Cents: number;
  minChargeCents?: number;
  maxVolumeM3?: number | null;
  notes?: string | null;
  isActive?: boolean;
};

/**
 * POST /api/store/shipping/tariffs
 * Crea o aggiorna una tariffa (upsert logico basato su country/region/province/city/service).
 * Se provinceCode + cityName sono passati ma cityCode no → crea la City al volo.
 */
export async function POST(req: NextRequest) {
  const result = await requirePermission("store_shipping", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = (await req.json()) as TariffBatch;
    const countryCode = String(body.countryCode || "IT").toUpperCase();
    const regionCode = body.regionCode || null;
    const provinceCode = body.provinceCode || null;
    let cityCode = body.cityCode || null;
    const service = body.service;
    const pricePerM3Cents = Math.max(0, Math.trunc(Number(body.pricePerM3Cents) || 0));
    const minChargeCents = Math.max(0, Math.trunc(Number(body.minChargeCents) || 0));
    const maxVolumeM3 =
      body.maxVolumeM3 === undefined || body.maxVolumeM3 === null
        ? service === "FLOOR_4_10_MAX6"
          ? 6
          : null
        : Number(body.maxVolumeM3);
    const notes = body.notes ?? null;
    const isActive = body.isActive !== false;

    if (!VALID_SERVICES.includes(service)) {
      return NextResponse.json({ success: false, error: "Servizio non valido" }, { status: 400 });
    }

    // Creazione on-demand della città (se cityCode non dato ma cityName sì)
    if (!cityCode && body.cityName && provinceCode) {
      const cityName = String(body.cityName).trim();
      if (cityName) {
        const existing = await prisma.city.findFirst({
          where: { provinceCode, name: cityName },
        });
        if (existing) {
          cityCode = existing.code;
        } else {
          const created = await prisma.city.create({
            data: { name: cityName, provinceCode },
          });
          cityCode = created.code;
        }
      }
    }

    const match = await prisma.shippingTariff.findFirst({
      where: { countryCode, regionCode, provinceCode, cityCode, service },
    });

    const tariff = match
      ? await prisma.shippingTariff.update({
          where: { id: match.id },
          data: { pricePerM3Cents, minChargeCents, maxVolumeM3, notes, isActive },
        })
      : await prisma.shippingTariff.create({
          data: { countryCode, regionCode, provinceCode, cityCode, service, pricePerM3Cents, minChargeCents, maxVolumeM3, notes, isActive },
        });

    return NextResponse.json({ success: true, data: tariff });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
