import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

/**
 * Import dataset geografico di una nazione (Region + Province + City con CAPs).
 * Schema JSON atteso nel body:
 * {
 *   "countryCode": "DE",          // ISO Alpha-2, obbligatorio
 *   "countryName": "Germania",    // opzionale, per log
 *   "regions":   [{ "code": "BY",     "name": "Bayern" }],
 *   "provinces": [{ "code": "...",    "name": "...", "regionCode": "BY" }],
 *   "cities":    [{ "code": "...",    "name": "...", "provinceCode": "...", "caps": ["80331","..."] }]
 * }
 *
 * Idempotente: usa createMany skipDuplicates, NON aggiorna i record esistenti.
 * Per ri-importare dopo una correzione del dataset: cancellare prima City+Province+Region
 * della nazione interessata.
 */

interface ImportRegion { code: string; name: string }
interface ImportProvince { code: string; name: string; regionCode: string }
interface ImportCity { code: string; name: string; provinceCode: string; caps?: string[] }
interface ImportPayload {
  countryCode: string;
  countryName?: string;
  regions: ImportRegion[];
  provinces: ImportProvince[];
  cities: ImportCity[];
}

export async function POST(req: NextRequest) {
  const result = await requirePermission("store_shipping", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = (await req.json()) as Partial<ImportPayload>;
    const country = String(body.countryCode || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) {
      return NextResponse.json({ success: false, error: "countryCode non valido (deve essere ISO Alpha-2, es. IT, FR, DE)" }, { status: 400 });
    }
    if (!Array.isArray(body.regions) || !Array.isArray(body.provinces) || !Array.isArray(body.cities)) {
      return NextResponse.json({ success: false, error: "Schema invalido: 'regions', 'provinces', 'cities' devono essere array." }, { status: 400 });
    }

    // Regioni
    const regionRows = (body.regions as ImportRegion[])
      .filter((r) => r && typeof r.code === "string" && typeof r.name === "string" && r.code.trim() && r.name.trim())
      .map((r, i) => ({
        code: r.code.trim(),
        name: r.name.trim().slice(0, 64),
        countryCode: country,
        sortOrder: i,
      }));
    const regionRes = await prisma.region.createMany({ data: regionRows, skipDuplicates: true });

    // Province
    const provinceRows = (body.provinces as ImportProvince[])
      .filter((p) => p && typeof p.code === "string" && typeof p.name === "string" && typeof p.regionCode === "string" && p.code.trim() && p.regionCode.trim())
      .map((p, i) => ({
        code: p.code.trim(),
        name: p.name.trim().slice(0, 64),
        regionCode: p.regionCode.trim(),
        countryCode: country,
        sortOrder: i,
      }));
    const provinceRes = await prisma.province.createMany({ data: provinceRows, skipDuplicates: true });

    // Città — batched (createMany scala bene fino a qualche migliaio per batch)
    const cityRows = (body.cities as ImportCity[])
      .filter((c) => c && typeof c.code === "string" && typeof c.name === "string" && typeof c.provinceCode === "string" && c.code.trim() && c.provinceCode.trim())
      .map((c) => ({
        code: c.code.trim(),
        name: c.name.trim().slice(0, 128),
        provinceCode: c.provinceCode.trim(),
        countryCode: country,
        caps: JSON.stringify(Array.isArray(c.caps) ? c.caps : []),
      }));

    let cityInserted = 0;
    const CHUNK = 1000;
    for (let i = 0; i < cityRows.length; i += CHUNK) {
      const slice = cityRows.slice(i, i + CHUNK);
      const r = await prisma.city.createMany({ data: slice, skipDuplicates: true });
      cityInserted += r.count;
    }

    const totalCities = await prisma.city.count({ where: { countryCode: country } });

    return NextResponse.json({
      success: true,
      countryCode: country,
      countryName: body.countryName || country,
      regionsInserted: regionRes.count,
      provincesInserted: provinceRes.count,
      citiesInserted: cityInserted,
      datasetSize: { regions: regionRows.length, provinces: provinceRows.length, cities: cityRows.length },
      totalCitiesInDb: totalCities,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
