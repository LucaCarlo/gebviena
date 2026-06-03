import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Lista province per popolare il dropdown nel checkout.
 * Solo IT è implementato; per altri paesi torna lista vuota (il form torna a
 * input testuali).
 */
export async function GET(req: NextRequest) {
  const country = (req.nextUrl.searchParams.get("country") || "IT").toUpperCase();
  const provinces = await prisma.province.findMany({
    where: { countryCode: country },
    select: {
      code: true,
      name: true,
      regionCode: true,
      region: { select: { name: true } },
    },
    orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
  });
  return NextResponse.json({
    success: true,
    data: provinces.map((p) => ({
      code: p.code,
      name: p.name,
      regionCode: p.regionCode,
      regionName: p.region?.name || null,
    })),
  });
}
