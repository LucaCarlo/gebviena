import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * Impostazioni dell'area professionisti (gruppo "professionals" in Setting).
 *
 *   GET  /api/admin/professionals-settings        → { [key]: value, … }
 *   PUT  /api/admin/professionals-settings        → body: { [key]: value, … }
 *                                                    upsert/patch parziale
 *
 * Chiavi usate dalle UI:
 *   professionals.pcon.enabled                    "true"|"false"
 *   professionals.pcon.product_slug               (opzionale)
 *   professionals.maintenance.enabled             "true"|"false"
 *   professionals.maintenance.title               testo
 *   professionals.maintenance.message             testo
 *   professionals.section.{ROLE}.{section_slug}   "true"|"false"
 *
 * Quando una chiave non esiste, il consumer applica il default (es. tutte
 * le sezioni di default visibili, area attiva, pCon attivo, ecc.).
 */
const GROUP = "professionals";

export async function GET() {
  const auth = await requirePermission("newsletter", "view");
  if (isErrorResponse(auth)) return auth;

  const rows = await prisma.setting.findMany({ where: { group: GROUP } });
  const data: Record<string, string> = {};
  for (const r of rows) data[r.key] = r.value;
  return NextResponse.json({ success: true, data });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission("newsletter", "edit");
  if (isErrorResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Body invalido" }, { status: 400 });
  }
  const entries = Object.entries(body).filter(([, v]) => typeof v === "string");
  if (entries.length === 0) return NextResponse.json({ success: true, updated: 0 });

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, group: GROUP, value: String(value) },
        update: { value: String(value) },
      }),
    ),
  );
  return NextResponse.json({ success: true, updated: entries.length });
}
