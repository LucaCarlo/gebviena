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

export async function GET() {
  const result = await requirePermission("store_shipping", "view");
  if (isErrorResponse(result)) return result;

  const [regionCounts, provinceCounts, cityCounts] = await Promise.all([
    prisma.region.groupBy({ by: ["countryCode"], _count: { _all: true } }),
    prisma.province.groupBy({ by: ["countryCode"], _count: { _all: true } }),
    prisma.city.groupBy({ by: ["countryCode"], _count: { _all: true } }),
  ]);

  // Unione delle countryCode da tutte e tre le tabelle.
  const codes = new Set<string>();
  for (const r of regionCounts) codes.add(r.countryCode);
  for (const p of provinceCounts) codes.add(p.countryCode);
  for (const c of cityCounts) codes.add(c.countryCode);

  const data = Array.from(codes).map((code) => ({
    countryCode: code,
    name: COUNTRY_LABELS[code] || code,
    regions: regionCounts.find((r) => r.countryCode === code)?._count?._all || 0,
    provinces: provinceCounts.find((p) => p.countryCode === code)?._count?._all || 0,
    cities: cityCounts.find((c) => c.countryCode === code)?._count?._all || 0,
  })).sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ success: true, data });
}
