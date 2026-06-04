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

  const items = await prisma.professional.findMany({
    where,
    // Le richieste pending vengono prima (più urgenti), poi per data desc
    orderBy: [{ pendingApproval: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      company: true,
      role: true,
      language: true,
      marketingOptIn: true,
      isActive: true,
      pendingApproval: true,
      approvedAt: true,
      createdAt: true,
      lastLoginAt: true,
    },
    take: 500,
  });

  return NextResponse.json({ success: true, data: items });
}
