import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/** Lista professionisti per l'admin. Filtri: q (nome/cognome/email/azienda),
 *  role, isActive. Ordina per createdAt desc. */
export async function GET(req: NextRequest) {
  const result = await requirePermission("newsletter", "view");
  if (isErrorResponse(result)) return result;

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const role = (sp.get("role") || "").trim();
  const activeParam = sp.get("active");
  const statusParam = sp.get("status"); // "pending" | "approved" | (none)
  const format = (sp.get("format") || "").toLowerCase();
  const isCsv = format === "csv";
  const page = Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "50", 10) || 50, 1), 200);

  const where: Prisma.ProfessionalWhereInput = {};
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { email: { contains: q } },
      { company: { contains: q } },
    ];
  }
  if (role && ["ARCHITECT_DESIGNER", "PRESS", "RESELLER", "AGENT"].includes(role)) {
    where.role = role as Prisma.EnumProfessionalRoleFilter["equals"];
  }
  if (activeParam === "true") where.isActive = true;
  if (activeParam === "false") where.isActive = false;
  if (statusParam === "pending") where.pendingApproval = true;
  if (statusParam === "approved") where.pendingApproval = false;

  const totalCount = await prisma.professional.count({ where });

  const items = await prisma.professional.findMany({
    where,
    orderBy: [{ pendingApproval: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true,
      company: true, role: true, language: true, marketingOptIn: true,
      isActive: true, pendingApproval: true, approvedAt: true,
      createdAt: true, lastLoginAt: true,
    },
    skip: isCsv ? 0 : (page - 1) * pageSize,
    take: isCsv ? 10000 : pageSize,
  });

  if (isCsv) {
    const ROLE_LABEL: Record<string, string> = {
      ARCHITECT_DESIGNER: "Architetto/Designer", PRESS: "Stampa",
      RESELLER: "Rivenditore", AGENT: "Agente",
    };
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const header = ["Email", "Nome", "Cognome", "Telefono", "Azienda", "Ruolo", "Lingua", "Stato", "Marketing", "Registrato"].join(",");
    const lines = items.map((p) => {
      const stato = p.pendingApproval ? "in attesa" : (p.isActive ? "attivo" : "disattivato");
      return [
        esc(p.email), esc(p.firstName), esc(p.lastName), esc(p.phone),
        esc(p.company), esc(ROLE_LABEL[p.role] || p.role),
        esc(p.language.toUpperCase()), esc(stato),
        esc(p.marketingOptIn ? "si" : "no"),
        esc(new Date(p.createdAt).toISOString()),
      ].join(",");
    });
    const csv = "﻿" + [header, ...lines].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="professionisti-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ success: true, data: items, totalCount, page, pageSize });
}
