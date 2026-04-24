import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const result = await requirePermission("store_shipping", "view");
  if (isErrorResponse(result)) return result;

  const country = req.nextUrl.searchParams.get("country") || "IT";

  const [regions, provinces, cities, tariffs] = await Promise.all([
    prisma.region.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.province.findMany({ orderBy: [{ regionCode: "asc" }, { sortOrder: "asc" }] }),
    prisma.city.findMany({ orderBy: [{ provinceCode: "asc" }, { name: "asc" }] }),
    prisma.shippingTariff.findMany({
      where: { countryCode: country },
      orderBy: [{ regionCode: "asc" }, { provinceCode: "asc" }, { cityCode: "asc" }, { service: "asc" }],
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: { country, regions, provinces, cities, tariffs },
  });
}
