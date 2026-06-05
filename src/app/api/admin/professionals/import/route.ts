import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import type { ProfessionalRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_ROLES = new Set(["ARCHITECT_DESIGNER", "PRESS", "RESELLER", "AGENT"]);

const ROLE_FROM_LABEL: Record<string, ProfessionalRole> = {
  "architetto/designer": "ARCHITECT_DESIGNER",
  "architetto": "ARCHITECT_DESIGNER",
  "designer": "ARCHITECT_DESIGNER",
  "stampa": "PRESS",
  "press": "PRESS",
  "rivenditore": "RESELLER",
  "reseller": "RESELLER",
  "agente": "AGENT",
  "agent": "AGENT",
};

/**
 * POST /api/admin/professionals/import
 * Body: { rows: Array<{email, firstName, lastName, company, phone?, role?, language?}> }
 *
 * Crea / aggiorna i professionisti. NON imposta password (lascia vuoto): se
 * l'importato deve poter accedere, l'admin lo deve "Approvare" successivamente
 * (genera password + email). I record nuovi vengono creati con pendingApproval=true
 * e isActive=false (come una richiesta normale).
 */
export async function POST(req: Request) {
  const result = await requirePermission("newsletter", "create");
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
      const firstName = (row.firstName || "").toString().trim().slice(0, 128);
      const lastName  = (row.lastName  || "").toString().trim().slice(0, 128);
      const company   = (row.company   || "").toString().trim().slice(0, 255);
      const phone     = (row.phone     || "").toString().trim().slice(0, 32) || null;
      if (!firstName || !lastName || !company) { skipped++; continue; }

      // Role: accetta sia codice enum sia label (Architetto, Stampa, …)
      let role: ProfessionalRole = "ARCHITECT_DESIGNER";
      const rawRole = (row.role || "").toString().trim().toUpperCase();
      if (VALID_ROLES.has(rawRole)) role = rawRole as ProfessionalRole;
      else {
        const label = (row.role || "").toString().trim().toLowerCase();
        if (label && ROLE_FROM_LABEL[label]) role = ROLE_FROM_LABEL[label];
      }

      const language = ["it","fr","en","de","es"].includes(String(row.language || "").toLowerCase())
        ? String(row.language).toLowerCase()
        : "it";

      try {
        const exists = await prisma.professional.findUnique({ where: { email }, select: { id: true } });
        await prisma.professional.upsert({
          where: { email },
          update: { firstName, lastName, company, phone, role, language },
          create: {
            email, firstName, lastName, company, phone, role, language,
            passwordHash: "",
            acceptsPrivacy: true,
            marketingOptIn: false,
            pendingApproval: true,
            isActive: false,
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
