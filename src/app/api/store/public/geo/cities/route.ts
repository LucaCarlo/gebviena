import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface CityOut {
  code: string;
  name: string;
  caps: string[];
}

/**
 * Lista città per una provincia, con i CAP associati.
 * Per la stragrande maggioranza dei comuni il CAP è uno solo; città grandi
 * (Roma, Milano…) hanno decine di CAP.
 */
export async function GET(req: NextRequest) {
  const provinceCode = (req.nextUrl.searchParams.get("provinceCode") || "").trim();
  const country = (req.nextUrl.searchParams.get("country") || "").toUpperCase().trim();
  if (!provinceCode) {
    return NextResponse.json({ success: false, error: "provinceCode mancante" }, { status: 400 });
  }
  const cities = await prisma.city.findMany({
    where: {
      provinceCode,
      ...(country ? { countryCode: country } : {}),
    },
    select: { code: true, name: true, caps: true },
    orderBy: { name: "asc" },
  });
  const out: CityOut[] = cities.map((c) => {
    let caps: string[] = [];
    if (c.caps) {
      try {
        const parsed = JSON.parse(c.caps);
        if (Array.isArray(parsed)) caps = parsed.filter((x) => typeof x === "string");
      } catch { /* malformed: empty caps */ }
    }
    return { code: c.code, name: c.name, caps };
  });
  return NextResponse.json({ success: true, data: out });
}
