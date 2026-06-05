import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * POST /api/store/customers/import
 * Body: { rows: Array<{email, firstName?, lastName?, phone?, marketingOptIn?}> }
 *
 * Upsert per email: aggiorna i campi se l'utente esiste già, altrimenti crea
 * un Customer "guest" (passwordHash vuoto). Pensato per importare contatti
 * tipo lead pre-checkout. Niente password generata, niente email inviate.
 */
export async function POST(req: Request) {
  const result = await requirePermission("store_customers", "create");
  if (isErrorResponse(result)) return result;

  try {
    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: "Nessuna riga da importare" }, { status: 400 });
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const email = (row.email || "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { skipped++; continue; }
      const firstName = (row.firstName || "").toString().trim().slice(0, 128) || null;
      const lastName  = (row.lastName  || "").toString().trim().slice(0, 128) || null;
      const phone     = (row.phone     || "").toString().trim().slice(0, 32)  || null;
      const marketingOptIn = row.marketingOptIn === true || row.marketingOptIn === "true" || row.marketingOptIn === "si" || row.marketingOptIn === "sì";
      try {
        const exists = await prisma.customer.findUnique({ where: { email }, select: { id: true } });
        await prisma.customer.upsert({
          where: { email },
          update: {
            ...(firstName !== null && { firstName }),
            ...(lastName !== null && { lastName }),
            ...(phone !== null && { phone }),
            marketingOptIn,
          },
          create: {
            email,
            firstName, lastName, phone,
            marketingOptIn,
            isActive: true,
            language: "it",
          },
        });
        if (exists) updated++; else imported++;
      } catch (e) {
        skipped++;
        errors.push(`${email}: ${e instanceof Error ? e.message : "errore"}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: { imported, updated, skipped, total: rows.length, ...(errors.length ? { errors: errors.slice(0, 20) } : {}) },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
